import { cn } from "@/lib";
import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { NodeSelection } from "prosemirror-state";
import { createPortal } from "react-dom";
import { VariableAutocomplete } from "@/components/ui/VariableEditor/VariableAutocomplete";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { classifyExpression } from "@/lib/utils/handlebars/classifyExpression";
import { SUGGESTABLE_HELPERS } from "@/lib/utils/handlebars/helperRegistry";
import {
  BLOCK_STRUCTURE_CODES,
  validateHandlebars,
} from "@/lib/utils/handlebars/validateHandlebars";

/** Only meaningful across a whole field, never for one occurrence. */
import { isVariableLike } from "@/lib/utils/handlebars/segmentText";
import { normaliseChipLabel } from "@/components/utils/htmlBlockVariables";
import { useAutoEdit, useSelectAllInsideChip } from "../chipEditing";
import { isInsideLoopAt } from "../chipScope";
import { contextDepthOf } from "@/lib/utils/handlebars/blockContext";
import type { BlockMarker } from "@/lib/utils/handlebars/blockContext";
import { isValidVariableName } from "@/components/utils/validateVariableName";
import {
  activeParamIndex,
  formatSignature,
  getHelperSignature,
} from "@/lib/utils/handlebars/helperSignatures";
import { SignatureHint } from "@/components/ui/VariableEditor/SignatureHint";
import { useAtomValue } from "jotai";
import { chipQuery, helperQuery } from "@/lib/utils/handlebars/chipQuery";
import { normaliseExpressionSpacing } from "@/lib/utils/handlebars/normaliseExpression";
import type { ChipQuery } from "@/lib/utils/handlebars/chipQuery";

export { chipQuery, helperQuery };
export type { ChipQuery };
import { availableVariablesAtom, variableValidationAtom } from "@/components/TemplateEditor/store";
import { getFlattenedVariables } from "@/components/utils/getFlattenedVariables";
import { isAcceptedVariable, variableArguments } from "@/lib/utils/handlebars/variableRules";
import { useVariableViewMode } from "../useVariableViewMode";
import { HandlebarsExpressionIcon } from "./HandlebarsExpressionIcon";

const ALL_HELPERS = SUGGESTABLE_HELPERS;
const HELPER_SET = new Set<string>(ALL_HELPERS);

/** Strip the braces so the author edits the expression, not its delimiters. */
function toInner(raw: string): { inner: string; triple: boolean } {
  if (raw.startsWith("{{{") && raw.endsWith("}}}")) {
    return { inner: raw.slice(3, -3), triple: true };
  }
  if (raw.startsWith("{{") && raw.endsWith("}}")) {
    return { inner: raw.slice(2, -2), triple: false };
  }
  return { inner: raw, triple: false };
}

function toRaw(inner: string, triple: boolean): string {
  return triple ? `{{{${inner}}}}` : `{{${inner}}}`;
}

export const HandlebarsExpressionView: React.FC<NodeViewProps> = ({
  node,
  editor,
  getPos,
  updateAttributes,
  deleteNode,
}) => {
  const raw: string = node.attrs.raw || "";
  const { inner, triple } = useMemo(() => toInner(raw), [raw]);
  const expr = useMemo(() => classifyExpression(inner, triple), [inner, triple]);

  const [isEditing, setIsEditing] = useState(false);
  const [query, setQuery] = useState<ChipQuery | null>(null);
  // Text up to the caret, which is what decides the active parameter.
  const [draftBeforeCaret, setDraftBeforeCaret] = useState("");
  const [isWithinSelection, setIsWithinSelection] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  // A pick answers the question the list was asking; leaving it open over the
  // name just chosen means the next keystroke can replace it by accident.
  const [pickedSuggestion, setPickedSuggestion] = useState(false);
  const editableRef = useRef<HTMLSpanElement>(null);
  const chipRef = useRef<HTMLSpanElement>(null);

  const variableViewMode = useVariableViewMode(editor);

  // Issues this occurrence carries on its own (unknown helper, bad operator).
  // Block structure is deliberately excluded — an opener judged alone always
  // looks unclosed.
  const issues = useMemo(
    () => validateHandlebars(raw).filter((i) => !BLOCK_STRUCTURE_CODES.has(i.code)),
    [raw]
  );

  // Block structure is a property of the whole field, so it is checked against
  // the containing text block and attributed back to the occurrence that caused
  // it. Without this an unclosed `{{#if}}` is invisible until the next reload.
  const [fieldIssue, setFieldIssue] = useState<string | null>(null);
  // Depth of open blocks before this chip: inside one, an argument resolves
  // against the block's context rather than the host's variable list.
  const [isInBlockScope, setIsInBlockScope] = useState(false);
  // `$.item`/`$.index` are real names inside a looping list, and nowhere else.
  const [isInLoop, setIsInLoop] = useState(false);
  // Enclosing `{{#each}}`/`{{#with}}` blocks, which is how far `../` reaches.
  const [contextDepth, setContextDepth] = useState(0);

  const checkFieldStructure = useCallback(() => {
    if (typeof getPos !== "function") return;
    try {
      const pos = getPos();
      if (typeof pos !== "number") return;
      const $pos = editor.state.doc.resolve(pos);
      const parent = $pos.parent;
      if (!parent.isTextblock) return;

      // Rebuild the field exactly as it serializes, tracking where this node
      // lands so an error offset can be matched back to it.
      let field = "";
      let ownOffset = -1;
      let depthBefore = 0;
      const markers: BlockMarker[] = [];
      const parentStart = $pos.start();
      parent.forEach((child, offset) => {
        if (parentStart + offset === pos) ownOffset = field.length;
        if (child.type.name === "handlebarsExpression") {
          field += child.attrs.raw ?? "";
          if (parentStart + offset < pos) {
            const kind = child.attrs.kind;
            markers.push({ kind: String(kind ?? ""), name: String(child.attrs.name ?? "") });
            if (kind === "blockOpen" || kind === "blockInverseOpen") depthBefore += 1;
            else if (kind === "blockClose") depthBefore = Math.max(0, depthBefore - 1);
          }
        } else if (child.type.name === "variable") field += `{{${child.attrs.id ?? ""}}}`;
        else field += child.textContent;
      });
      setIsInBlockScope(depthBefore > 0);
      setContextDepth(contextDepthOf(markers));
      setIsInLoop(isInsideLoopAt(editor, pos));

      const structural = validateHandlebars(field).find(
        (i) => i.severity === "error" && BLOCK_STRUCTURE_CODES.has(i.code) && i.start === ownOffset
      );
      setFieldIssue(structural?.message ?? null);
    } catch {
      setFieldIssue(null);
      setIsInBlockScope(false);
      setIsInLoop(false);
      setContextDepth(0);
    }
  }, [editor, getPos]);

  useEffect(() => {
    checkFieldStructure();
    editor.on("transaction", checkFieldStructure);
    return () => {
      editor.off("transaction", checkFieldStructure);
    };
  }, [editor, checkFieldStructure]);

  const availableVariables = useAtomValue(availableVariablesAtom);
  const variableValidation = useAtomValue(variableValidationAtom);
  const variableNames = useMemo(
    () => getFlattenedVariables(availableVariables ?? {}),
    [availableVariables]
  );

  // A variable used as a helper argument gets the same scrutiny as a standalone
  // chip — same rules, same source of truth.
  const badArgs = useMemo(() => {
    const ctx = {
      available: variableNames,
      inBlockScope: isInBlockScope,
      inLoop: isInLoop,
      contextDepth,
    };
    // The host validator decides, exactly as it does for a standalone chip —
    // `data.*` is the send payload and is not in any published list.
    const walk = (e: typeof expr): string[] => {
      const direct = variableArguments(e.args).filter(
        (a) => !isAcceptedVariable(a, ctx, variableValidation?.validate)
      );
      const nested = e.args
        .filter((a) => a.startsWith("("))
        .flatMap((a) => walk(classifyExpression(a.replace(/^\(|\)$/g, ""))));
      return [...direct, ...nested];
    };
    return Array.from(new Set(walk(expr)));
  }, [expr, variableNames, isInBlockScope, isInLoop, contextDepth, variableValidation]);

  const errors = issues.filter((i) => i.severity === "error");
  const isInvalid = errors.length > 0 || fieldIssue !== null || badArgs.length > 0;

  // Helpers lead here, the mirror of the `{{` list: inside an expression the
  // author has already committed to writing one, and the variable is the
  // argument they reach for second.
  const suggestions = useMemo(() => {
    if (query === null) return [];
    const q = query.query.toLowerCase();

    // In argument position only variables make sense — a helper name there would
    // be a sub-expression, which the author writes with `(` rather than picks.
    if (query.mode === "argument") {
      return q ? variableNames.filter((name) => name.toLowerCase().includes(q)) : variableNames;
    }

    if (!q) return [...ALL_HELPERS, ...variableNames];
    return [
      ...ALL_HELPERS.filter((name) => name.toLowerCase().startsWith(q)),
      ...variableNames.filter((name) => name.toLowerCase().includes(q)),
    ];
  }, [query, variableNames]);

  const isHelperSuggestion = useCallback(
    (item: string) => HELPER_SET.has(item) && !variableNames.includes(item),
    [variableNames]
  );

  const showSuggestions = isEditing && !pickedSuggestion && suggestions.length > 0;

  // The helper being written is the first token, whatever the caret is on now —
  // so the hint stays up while the arguments are typed, which is exactly when it
  // is wanted.
  const editingName = useMemo(() => {
    if (!isEditing) return "";
    const body = draftBeforeCaret.replace(/^\s*[#^/]?\s*/, "");
    return /^[a-zA-Z0-9_-]+/.exec(body)?.[0] ?? "";
  }, [draftBeforeCaret, isEditing]);

  const signature = editingName ? getHelperSignature(editingName) : undefined;
  const activeParam = signature ? activeParamIndex(draftBeforeCaret, editingName) : -1;
  // Once arguments are being typed the suggestion list is gone, so the hint has
  // the space to itself.
  const showSignature = isEditing && !!signature && !showSuggestions;

  useEffect(() => {
    if (!isEditing || !editableRef.current) return;
    const el = editableRef.current;
    el.textContent = inner;
    setDraftBeforeCaret(inner);
    el.focus();
    requestAnimationFrame(() => {
      if (!el.isConnected) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
  }, [isEditing, inner]);

  // Opened straight from the helper autocomplete, or by Enter on the selected
  // chip — drop into edit mode so the signature hint is up and the caret is
  // where the arguments go.
  useSelectAllInsideChip(editableRef, isEditing);

  useAutoEdit({
    autoEdit: node.attrs.autoEdit,
    isEditing,
    open: () => {
      setIsEditing(true);
      setQuery(null);
    },
    clear: () => updateAttributes({ autoEdit: false }),
  });

  /** One click selects the whole chip, so Backspace removes it as a unit. */
  const selectNode = useCallback(() => {
    if (typeof getPos !== "function") return;
    try {
      const pos = getPos();
      if (typeof pos !== "number") return;
      editor
        .chain()
        .focus()
        .command(({ tr }) => {
          tr.setSelection(NodeSelection.create(tr.doc, pos));
          return true;
        })
        .run();
    } catch {
      /* node is gone */
    }
  }, [editor, getPos]);

  // Mirrors the variable chip: a chip inside a text selection paints as selected,
  // so Cmd+A reads as one continuous band rather than skipping the chips.
  const checkSelection = useCallback(() => {
    if (typeof getPos !== "function") return;
    try {
      const pos = getPos();
      if (typeof pos !== "number") {
        setIsWithinSelection(false);
        return;
      }
      const { from, to, empty } = editor.state.selection;
      setIsWithinSelection(!empty && from < pos + node.nodeSize && to > pos);
    } catch {
      setIsWithinSelection(false);
    }
  }, [editor, getPos, node.nodeSize]);

  useEffect(() => {
    checkSelection();
    editor.on("selectionUpdate", checkSelection);
    editor.on("transaction", checkSelection);
    return () => {
      editor.off("selectionUpdate", checkSelection);
      editor.off("transaction", checkSelection);
    };
  }, [editor, checkSelection]);

  /** Leave the caret in the document just after this chip, as typing `}}` should. */
  const caretAfterChip = useCallback(() => {
    editor.commands.focus();
    if (typeof getPos !== "function") return;
    try {
      const pos = getPos();
      if (typeof pos === "number" && typeof editor.commands.setTextSelection === "function") {
        editor.commands.setTextSelection(pos + node.nodeSize);
      }
    } catch {
      /* node is gone; the focus above is the best that can be done */
    }
  }, [editor, getPos, node.nodeSize]);

  /**
   * Commit the chip. A caller that already knows the text passes it, so the
   * write never waits on a later read of a span that may be gone by then —
   * closing with `}}` and clicking away lost the expression that way.
   */
  const commit = useCallback(
    (text?: string) => {
      setIsEditing(false);
      setQuery(null);
      // A chip destroyed mid-edit blurs on its way out; writing then would land
      // on whatever has taken this node's position.
      if (text === undefined && !editableRef.current?.isConnected) return;
      const next = normaliseExpressionSpacing(text ?? editableRef.current?.textContent ?? "");

      if (!next) {
        deleteNode();
        return;
      }

      const nextRaw = toRaw(next, triple);
      const nextExpr = classifyExpression(next, triple);

      // Emptied and retyped as a plain variable — this is no longer an expression,
      // so hand the content back to the variable chip rather than leaving a
      // helper-looking chip around a bare path.
      if (!triple && isVariableLike(nextExpr, triple) && isValidVariableName(next)) {
        if (typeof getPos === "function") {
          try {
            const pos = getPos();
            if (typeof pos === "number") {
              editor
                .chain()
                .command(({ tr }) => {
                  tr.replaceWith(
                    pos,
                    pos + node.nodeSize,
                    editor.schema.nodes.variable.create({ id: next, isInvalid: false })
                  );
                  return true;
                })
                .run();
              return;
            }
          } catch {
            /* node is gone; fall through to a plain attribute update */
          }
        }
      }

      updateAttributes({
        raw: nextRaw,
        kind: nextExpr.kind,
        name: nextExpr.name,
        isInvalid: validateHandlebars(nextRaw).some((i) => i.severity === "error"),
        // `updateAttributes` merges into the attributes this view captured, which
        // still carry the `autoEdit` that `useAutoEdit` cleared — without this the
        // chip reopened after every commit and swallowed the next keystroke.
        autoEdit: false,
      });
    },
    [deleteNode, triple, updateAttributes, editor, getPos, node.nodeSize]
  );

  // Clicking the canvas does not always blur the chip's contenteditable, and an
  // open chip keeps its signature hint on screen over the document.
  useEffect(() => {
    const closeIfElsewhere = () => {
      if (!isEditing || typeof getPos !== "function") return;
      try {
        const pos = getPos();
        if (typeof pos !== "number") return;
        const { from, to } = editor.state.selection;
        // The boundary counts as touching the chip: a pick leaves the selection
        // right beside it, and closing there would undo the auto-edit.
        if (from > pos + node.nodeSize || to < pos) commit();
      } catch {
        /* node is gone; nothing to close */
      }
    };
    editor.on("selectionUpdate", closeIfElsewhere);
    return () => {
      editor.off("selectionUpdate", closeIfElsewhere);
    };
  }, [editor, isEditing, commit, getPos, node.nodeSize]);

  const applySuggestion = useCallback((item: string) => {
    const el = editableRef.current;
    if (!el) return;
    const current = el.textContent || "";
    const q = chipQuery(current)?.query ?? "";
    el.textContent = current.slice(0, current.length - q.length) + item;
    setQuery(null);
    setPickedSuggestion(true);
    setDraftBeforeCaret(el.textContent);
    requestAnimationFrame(() => {
      if (!el.isConnected) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLSpanElement>) => {
      // Keep TipTap's own shortcuts out of the expression while it is being edited.
      e.stopPropagation();

      if (showSuggestions) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((i) => (i + 1) % suggestions.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
          return;
        }
        if (e.key === "Tab" || (e.key === "Enter" && suggestions[selectedIndex])) {
          e.preventDefault();
          applySuggestion(suggestions[selectedIndex]);
          return;
        }
      }

      if (e.key === "Enter") {
        e.preventDefault();
        commit();
        editor.commands.focus();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setIsEditing(false);
        setQuery(null);
        editor.commands.focus();
      }
    },
    [applySuggestion, commit, editor, selectedIndex, showSuggestions, suggestions]
  );

  /** Text from the start of the expression to the caret. */
  const readBeforeCaret = useCallback(() => {
    const el = editableRef.current;
    if (!el) return "";
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return el.textContent || "";
    const range = selection.getRangeAt(0).cloneRange();
    range.selectNodeContents(el);
    range.setEnd(selection.getRangeAt(0).endContainer, selection.getRangeAt(0).endOffset);
    return range.toString();
  }, []);

  const syncFromCaret = useCallback(() => {
    const before = readBeforeCaret();
    setDraftBeforeCaret(before);
    setQuery(chipQuery(before));
    setSelectedIndex(0);
  }, [readBeforeCaret]);

  const handleInput = useCallback(() => {
    setPickedSuggestion(false);
    const el = editableRef.current;
    // `}}` closes the chip, as it does in a variable chip. The text lives only
    // in this contenteditable until commit, so without this the braces were
    // typed into the expression and stored as `{{capitalize data.name}}}}`.
    if (el && el.textContent?.endsWith("}}")) {
      const body = el.textContent.slice(0, -2);
      el.textContent = body;
      commit(body);
      caretAfterChip();
      return;
    }
    syncFromCaret();
  }, [caretAfterChip, commit, syncFromCaret]);

  // In preview the whole field is rendered through Handlebars, so an expression
  // has no standalone output of its own to show.
  if (variableViewMode === "wysiwyg") {
    return (
      <NodeViewWrapper as="span" className="courier-inline" contentEditable={false}>
        {""}
      </NodeViewWrapper>
    );
  }

  const label = expr.kind === "comment" ? "comment" : normaliseChipLabel(inner);
  // Not cut here either — the stylesheet wraps and clamps it. `MAX_LABEL` only
  // decides whether the full source is worth a tooltip.
  const display = label;
  const messages = [
    ...issues.map((i) => i.message),
    ...(fieldIssue ? [fieldIssue] : []),
    ...badArgs.map((a) => `\`${a}\` is not one of the available variables.`),
  ];
  const title = messages.length ? messages.join("\n") : raw;

  // An atom's wrapper has to be non-editable, or the browser will place the
  // caret inside the chip, where it is invisible against the chip's own
  // background. The label opts back in while editing.
  return (
    <NodeViewWrapper
      as="span"
      className="courier-inline courier-max-w-full"
      contentEditable={false}
    >
      <span
        ref={chipRef}
        className={cn(
          "courier-handlebars-chip",
          isInvalid && "courier-handlebars-chip-invalid",
          isWithinSelection && "courier-handlebars-chip-selected",
          `courier-handlebars-chip-${expr.kind}`
        )}
        data-handlebars-kind={expr.kind}
        data-testid="handlebars-expression-chip"
        title={title}
        onMouseDown={(e) => {
          if (isEditing) return;
          e.stopPropagation();
          selectNode();
        }}
        onDoubleClick={() => {
          if (!editor.isEditable) return;
          setIsEditing(true);
          setQuery(null);
        }}
      >
        <span className="courier-flex-shrink-0 courier-flex courier-items-center">
          <HandlebarsExpressionIcon />
        </span>
        {isEditing ? (
          <span
            ref={editableRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            className="courier-outline-none courier-whitespace-pre"
            onBlur={() => commit()}
            onInput={handleInput}
            onKeyUp={syncFromCaret}
            onMouseUp={syncFromCaret}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <span>{display}</span>
        )}
        {showSignature &&
          signature &&
          // Portalled like the autocomplete: an absolutely positioned hint is
          // clipped to a dark sliver inside a one-line header input.
          createPortal(
            <SignatureHint
              name={editingName}
              signature={signature}
              activeParam={activeParam}
              anchorRef={chipRef}
            />,
            chipRef.current?.closest(".theme-container") || document.body
          )}
        {showSuggestions &&
          createPortal(
            <VariableAutocomplete
              items={suggestions}
              onSelect={applySuggestion}
              selectedIndex={selectedIndex}
              anchorRef={chipRef}
              isHelper={isHelperSuggestion}
              hintFor={(item) => {
                const sig = getHelperSignature(item);
                return sig ? formatSignature(item, sig) : undefined;
              }}
            />,
            chipRef.current?.closest(".theme-container") || document.body
          )}
      </span>
    </NodeViewWrapper>
  );
};
