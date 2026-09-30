import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { useAtomValue } from "jotai";
import { NodeSelection, TextSelection } from "prosemirror-state";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { variableValuesAtom } from "../../TemplateEditor/store";
import { VariableChipBase } from "../../ui/VariableEditor/VariableChipBase";
import { classifyExpression } from "@/lib/utils/handlebars/classifyExpression";
import { convertVariableChipToExpression } from "../HandlebarsExpression/convertVariableChip";
import {
  chipHousekeeping,
  chipStillAt,
  replaceChipWithHelper,
  shouldRestoreCaret,
} from "@/components/extensions/chipEditing";
import { isInsideLoopAt } from "@/components/extensions/chipScope";
import { blockScopeAt } from "@/lib/utils/handlebars/blockContext";
import { getHelperSignature } from "@/lib/utils/handlebars/helperSignatures";
import { isVariableLike } from "@/lib/utils/handlebars/segmentText";
import { setDefinedNamesInPart } from "@/lib/utils/handlebars/setScope";
import { VariableIcon } from "./VariableIcon";
import { useVariableViewMode } from "../useVariableViewMode";

function getFormattingStyleFromMarks(
  marks: readonly { type: { name: string }; attrs?: Record<string, unknown> }[]
): React.CSSProperties {
  if (!marks || marks.length === 0) return {};
  const style: React.CSSProperties = {};
  const textDecorations: string[] = [];

  for (const mark of marks) {
    switch (mark.type.name) {
      case "bold":
        style.fontWeight = "bold";
        break;
      case "italic":
        style.fontStyle = "italic";
        break;
      case "underline":
        textDecorations.push("underline");
        break;
      case "strike":
        textDecorations.push("line-through");
        break;
      case "textStyle":
        if (mark.attrs?.color) {
          style.color = mark.attrs.color as string;
        }
        break;
    }
  }

  if (textDecorations.length > 0) {
    style.textDecoration = textDecorations.join(" ");
  }

  return style;
}

export const VariableView: React.FC<NodeViewProps> = ({
  node,
  editor,
  getPos,
  updateAttributes,
}) => {
  const variableValues = useAtomValue(variableValuesAtom);
  const variableId = node.attrs.id || "";
  const value = variableValues[variableId];
  const isInvalid = node.attrs.isInvalid;
  const [isInsideLoop, setIsInsideLoop] = useState(false);
  // True when an enclosing `{{#each}}`/`{{#with}}` is open before this chip, so
  // its name resolves against the block's scope rather than the host's variable
  // list. `{{#with data.order}}{{id}}{{/with}}` is the motivating case.
  const [isInHandlebarsBlock, setIsInHandlebarsBlock] = useState(false);
  // Enclosing `{{#each}}`/`{{#with}}` blocks, which is how far `../` reaches.
  const [contextDepth, setContextDepth] = useState(0);
  // Defined by an earlier `{{set "name" …}}`, which no host variable list has.
  const [isDefinedBySet, setIsDefinedBySet] = useState(false);
  const [isWithinSelection, setIsWithinSelection] = useState(false);

  const formattingStyle = useMemo(() => getFormattingStyleFromMarks(node.marks), [node]);

  const variableViewMode = useVariableViewMode(editor);

  const checkIfInHandlebarsBlock = useCallback(() => {
    if (typeof getPos !== "function") return;
    try {
      const pos = getPos();
      if (typeof pos !== "number") {
        setIsInHandlebarsBlock(false);
        return;
      }
      const $pos = editor.state.doc.resolve(pos);
      const parent = $pos.parent;
      if (!parent.isTextblock) {
        setIsInHandlebarsBlock(false);
        return;
      }

      // Counted within this top-level block: see `blockScopeAt`.
      const definedBySet = setDefinedNamesInPart(`{{${variableId}}}`).includes(variableId);
      const scope = blockScopeAt(editor.state.doc, pos);
      setIsInHandlebarsBlock(scope.inBlockScope);
      setContextDepth(scope.contextDepth);
      setIsDefinedBySet(definedBySet);
    } catch {
      setIsInHandlebarsBlock(false);
      setIsDefinedBySet(false);
      setContextDepth(0);
    }
  }, [editor, getPos, variableId]);

  const checkIfInLoop = useCallback(() => {
    if (typeof getPos !== "function") {
      setIsInsideLoop(false);
      return;
    }
    const pos = getPos();
    setIsInsideLoop(typeof pos === "number" && isInsideLoopAt(editor, pos));
  }, [editor, getPos]);

  /**
   * The author picked a helper out of the `{{` autocomplete. A variable chip
   * cannot hold a helper call, so swap this node for a handlebars expression
   * opened ready for its arguments.
   */
  const handleSelectHelper = useCallback(
    (helperName: string) => {
      if (typeof getPos !== "function") return;
      try {
        const pos = getPos();
        if (typeof pos !== "number") return;
        replaceChipWithHelper({
          editor,
          pos,
          nodeSize: node.nodeSize,
          helperName,
          isBlock: getHelperSignature(helperName)?.block ?? false,
        });
      } catch {
        /* node is gone; nothing to convert */
      }
    },
    [editor, getPos, node.nodeSize]
  );

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
    checkIfInLoop();
    checkIfInHandlebarsBlock();
    checkSelection();

    const handleUpdate = () => {
      checkIfInLoop();
      // Block scope has to be re-read, not just computed on mount: a chip inside
      // `{{#with data.order}}` mounts while the document is still being built,
      // sees no opener before it, and is judged at top level — which is what
      // flagged every `this`, `@index`, `id` and `status` in a loaded template.
      checkIfInHandlebarsBlock();
      checkSelection();
    };

    // `transaction` rather than `update`, so the scope is refreshed even when
    // the change came from outside the editing surface, as a load does.
    editor.on("transaction", handleUpdate);
    editor.on("update", handleUpdate);
    editor.on("selectionUpdate", handleUpdate);

    return () => {
      editor.off("transaction", handleUpdate);
      editor.off("update", handleUpdate);
      editor.off("selectionUpdate", handleUpdate);
    };
  }, [editor, checkIfInLoop, checkIfInHandlebarsBlock, checkSelection]);

  /**
   * Mid-typing hand-over: `#if x` is a block, not a variable name, and the chip
   * asks before it reads the text as one. The new chip opens in edit mode so
   * the next keystroke carries on into it.
   */
  const handleBlockExpression = useCallback(
    (text: string) =>
      convertVariableChipToExpression({
        editor,
        getPos,
        nodeSize: node.nodeSize,
        text,
        autoEdit: true,
      }),
    [editor, getPos, node.nodeSize]
  );

  const handleUpdateAttributes = useCallback(
    (attrs: { id: string; isInvalid: boolean }) => {
      // Typing `{{` opens an empty variable chip that immediately takes focus,
      // so at human typing speed `else`, `/if` or `#if x` are typed *inside* the
      // chip and commit as variable names. The braces are right in the saved
      // text, but the node is wrong: it draws as a variable and takes no part in
      // block matching. Hand it to the expression node instead.
      const expr = classifyExpression(attrs.id);
      if (
        attrs.id &&
        !isVariableLike(expr, false) &&
        convertVariableChipToExpression({
          editor,
          getPos,
          nodeSize: node.nodeSize,
          text: attrs.id,
          autoEdit: false,
        })
      ) {
        return;
      }

      // Passed through as given. Adding `autoEdit: false` here cleared the
      // flag on every attribute write, including the validation pass, which
      // took it out before the chip's span had focus — and the keys typed in
      // between went into the document instead of the chip. The chip decides
      // when the flag goes; see `commitValue`.
      updateAttributes(attrs);
    },
    [updateAttributes, editor, getPos, node.nodeSize]
  );

  // Not an edit the author made, so it stays out of the undo history: an undo
  // that restored the flag reopened a chip nobody asked to open.
  const handleAutoEditConsumed = useCallback(() => {
    if (typeof getPos !== "function") return;
    const pos = getPos();
    if (typeof pos === "number") chipHousekeeping.setAutoEdit({ editor, pos, value: false });
  }, [editor, getPos]);

  const handleDelete = useCallback(
    ({ abandoned = false }: { abandoned?: boolean } = {}) => {
      if (typeof getPos !== "function") return;
      const pos = getPos();
      // Only delete if this chip is still the node at that position.
      if (typeof pos !== "number" || !chipStillAt(editor, pos, node.type.name)) return;

      // A chip that was never filled in is removed as housekeeping, without a
      // history step: one taken here wiped the redo stack.
      if (abandoned) {
        chipHousekeeping.removeChip({ editor, pos, nodeSize: node.nodeSize });
        return;
      }

      editor
        .chain()
        .focus()
        .deleteRange({ from: pos, to: pos + node.nodeSize })
        .run();
    },
    [editor, getPos, node.nodeSize, node.type.name]
  );

  const handleSelect = useCallback(() => {
    if (typeof getPos === "function") {
      const pos = getPos();
      if (typeof pos === "number") {
        editor
          .chain()
          .focus()
          .command(({ tr }) => {
            tr.setSelection(NodeSelection.create(tr.doc, pos));
            return true;
          })
          .run();
      }
    }
  }, [editor, getPos]);

  const handleCommit = useCallback(() => {
    if (typeof getPos === "function") {
      const pos = getPos();
      if (typeof pos === "number") {
        const afterPos = pos + node.nodeSize;
        requestAnimationFrame(() => {
          if (editor.isDestroyed || !editor.state || !editor.view) return;
          try {
            // Not when the author has clicked elsewhere in the meantime.
            if (
              !shouldRestoreCaret({
                selectionFrom: editor.state.selection.from,
                pos,
                nodeSize: node.nodeSize,
              })
            ) {
              return;
            }
            const { tr } = editor.state;
            tr.setSelection(TextSelection.create(tr.doc, afterPos));
            editor.view.dispatch(tr);
            editor.view.focus();
          } catch {
            // Editor may have been destroyed between scheduling and execution
          }
        });
      }
    }
  }, [editor, getPos, node.nodeSize]);

  // The chip owns its colour in CSS; the icon follows it. Only the invalid state
  // still overrides, because it has to read as an error rather than a chip.
  // The chip's class carries its state colour, and the glyph inherits it — a
  // hex here is a second source the stylesheet cannot reach.
  const iconColor = undefined;

  if (variableViewMode === "wysiwyg") {
    return (
      <NodeViewWrapper
        as="span"
        className="courier-inline"
        contentEditable={false}
        data-variable-id={variableId}
        data-wysiwyg="true"
        style={formattingStyle}
      >
        {value || ""}
      </NodeViewWrapper>
    );
  }

  // An atom's wrapper has to be non-editable, or the browser will place the
  // caret inside the chip, where it is invisible against the chip's own
  // background. The label opts back in while editing.
  return (
    <NodeViewWrapper
      as="span"
      className="courier-inline courier-max-w-full"
      contentEditable={false}
    >
      <VariableChipBase
        variableId={variableId}
        isInvalid={isInvalid}
        value={value}
        onUpdateAttributes={handleUpdateAttributes}
        onBlockExpression={handleBlockExpression}
        onDelete={handleDelete}
        icon={<VariableIcon color={iconColor} />}
        className="courier-variable-node"
        readOnly={!editor.isEditable}
        formattingStyle={formattingStyle}
        isSelected={isWithinSelection}
        onSelect={handleSelect}
        onCommit={handleCommit}
        isInsideLoop={isInsideLoop}
        contextDepth={contextDepth}
        skipListValidation={isInHandlebarsBlock || isDefinedBySet}
        onSelectHelper={handleSelectHelper}
        autoEdit={node.attrs.autoEdit}
        onAutoEditConsumed={handleAutoEditConsumed}
      />
    </NodeViewWrapper>
  );
};
