import { VARIABLE_ICON_PATHS, VARIABLE_ICON_VIEWBOX } from "@/components/utils/chipIcons";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { VariableAutocomplete } from "./VariableAutocomplete";
import { getFlattenedVariables, isValidVariableName } from "./validate-variable-name";
import type { VariableNodeOptions } from "./variable-types";

const VariableIcon = ({ color }: { color: string }) => (
  <svg
    width="13"
    height="13"
    viewBox={VARIABLE_ICON_VIEWBOX}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0 }}
  >
    {VARIABLE_ICON_PATHS.map((d) => (
      <path
        key={d}
        d={d}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ))}
  </svg>
);

// Chip palette: blue = valid, red = invalid format/validator.
const PALETTE = {
  valid: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", icon: "#1d4ed8" },
  invalid: { bg: "#fef2f2", border: "#fecaca", text: "#dc2626", icon: "#dc2626" },
};

const chipStyle = (invalid: boolean): CSSProperties => {
  const c = invalid ? PALETTE.invalid : PALETTE.valid;
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "1px 6px",
    borderRadius: 4,
    border: `1px solid ${c.border}`,
    backgroundColor: c.bg,
    color: c.text,
    fontSize: "0.9em",
    lineHeight: 1.4,
    whiteSpace: "nowrap",
    cursor: "pointer",
    verticalAlign: "baseline",
  };
};

/**
 * Jotai/ui-kit/Tailwind-free variable chip NodeView for the v2 footer editor.
 * Renders `{id}` as an editable chip; click to edit with a filtered
 * autocomplete of the brand variables. Any syntactically-valid variable name
 * is accepted (arbitrary vars allowed); the known set only feeds autocomplete.
 * A custom `variableValidation.validate` (from options) can further restrict.
 */
export const VariableChip = ({
  node,
  updateAttributes,
  deleteNode,
  editor,
  extension,
  getPos,
}: NodeViewProps) => {
  const options = extension.options as VariableNodeOptions;
  const variableId: string = node.attrs.id ?? "";
  const isInvalid: boolean = Boolean(node.attrs.isInvalid);
  const editable = editor.isEditable;

  const [isEditing, setIsEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editorFocused, setEditorFocused] = useState(editor.isFocused);
  // True once the user has moved through the autocomplete with the arrow keys.
  // Until then, Enter commits what was TYPED (so a value that merely overlaps a
  // suggestion, e.g. "brand", can still be committed); after navigating, Enter
  // accepts the highlighted suggestion.
  const [navigated, setNavigated] = useState(false);
  // Set right before an intentional keyboard commit (Enter) so commit() — which
  // also runs on plain blur — only pulls focus back into the editor for that
  // deliberate case, not when the user clicked away to another control.
  const refocusOnCommitRef = useRef(false);
  const editableRef = useRef<HTMLSpanElement>(null);
  const chipRef = useRef<HTMLSpanElement>(null);

  // Track editor focus so known variables can render as plain `{id}` text while
  // the footer is not being edited, and reveal the chip UI once it is focused.
  // "Focused" means focus is anywhere WITHIN the editor DOM: editing one chip
  // moves focus to that chip's inner contentEditable (still inside the editor),
  // which must NOT flip the other chips back to plain strings.
  useEffect(() => {
    const updateFocus = () => {
      const dom = editor.view?.dom as HTMLElement | undefined;
      const active = document.activeElement;
      setEditorFocused(editor.isFocused || (!!dom && !!active && dom.contains(active)));
    };
    const deferred = () => setTimeout(updateFocus, 0);
    editor.on("focus", updateFocus);
    editor.on("blur", deferred);
    document.addEventListener("focusin", updateFocus);
    document.addEventListener("focusout", deferred);
    return () => {
      editor.off("focus", updateFocus);
      editor.off("blur", deferred);
      document.removeEventListener("focusin", updateFocus);
      document.removeEventListener("focusout", deferred);
    };
  }, [editor]);

  // tiptap freezes a node's `options` at editor-creation, so a later change to
  // `variables`/`variableValues` (a live brand edit, or a hot-reload) would
  // otherwise leave the chip reading a stale map. RichTextEditor mutates the
  // extension options in place and dispatches a transaction tagged
  // "variableOptions"; re-render when we see it so the chip reflects the
  // current values.
  const [, refreshFromOptions] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const onTransaction = ({
      transaction,
    }: {
      transaction: { getMeta: (k: string) => unknown };
    }) => {
      if (transaction.getMeta("variableOptions")) refreshFromOptions();
    };
    editor.on("transaction", onTransaction);
    return () => {
      editor.off("transaction", onTransaction);
    };
  }, [editor]);

  const allSuggestions = useMemo(
    () => getFlattenedVariables(options.variables ?? {}),
    [options.variables]
  );
  const filtered = useMemo(() => {
    if (!allSuggestions.length) return [];
    if (!query) return allSuggestions;
    const q = query.toLowerCase();
    return allSuggestions.filter((i) => i.toLowerCase().includes(q));
  }, [allSuggestions, query]);
  const showAutocomplete = isEditing && filtered.length > 0;

  // True when `name` is acceptable: custom validator if provided, else format.
  const isAccepted = useCallback(
    (name: string): boolean => {
      const cfg = options.variableValidation;
      if (cfg?.overrideFormatValidation) {
        return cfg.validate ? cfg.validate(name) : true;
      }
      if (!isValidVariableName(name)) return false;
      return cfg?.validate ? cfg.validate(name) : true;
    },
    [options.variableValidation]
  );

  // Newly inserted empty chip → jump straight into edit mode.
  useEffect(() => {
    if (editable && variableId === "" && !isEditing) {
      setIsEditing(true);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [editable, variableId, isEditing]);

  // Each fresh edit session starts with no autocomplete navigation, so the
  // first Enter commits the typed value.
  useEffect(() => {
    if (isEditing) setNavigated(false);
  }, [isEditing]);

  // Reconcile the invalid flag when the id (or validation) changes.
  useEffect(() => {
    if (!variableId || isEditing) return;
    const valid = isAccepted(variableId);
    if (!valid && !isInvalid) {
      queueMicrotask(() => updateAttributes({ isInvalid: true }));
    } else if (valid && isInvalid) {
      queueMicrotask(() => updateAttributes({ isInvalid: false }));
    }
  }, [variableId, isInvalid, isEditing, isAccepted, updateAttributes]);

  // Focus + seed the editable span on entering edit mode.
  useEffect(() => {
    if (!isEditing || !editableRef.current) return;
    const el = editableRef.current;
    el.textContent = variableId;
    el.focus();
    requestAnimationFrame(() => {
      if (!el.isConnected) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });
  }, [isEditing, variableId]);

  const commit = useCallback(() => {
    setIsEditing(false);
    const value = (editableRef.current?.textContent || "").trim();
    if (!value) {
      deleteNode();
      return;
    }
    const valid = isAccepted(value);
    if (!valid && options.variableValidation?.onInvalid === "remove") {
      deleteNode();
      return;
    }
    updateAttributes({ id: value, isInvalid: !valid });
    // Only steal focus back into the editor for a deliberate keyboard commit;
    // on a plain blur (the user clicked another control) leave focus where the
    // user put it.
    if (refocusOnCommitRef.current) editor.commands.focus();
    refocusOnCommitRef.current = false;
  }, [deleteNode, updateAttributes, isAccepted, options.variableValidation, editor]);

  const selectSuggestion = useCallback(
    (item: string) => {
      if (editableRef.current) editableRef.current.textContent = item;
      setQuery("");
      setIsEditing(false);
      updateAttributes({ id: item, isInvalid: !isAccepted(item) });
      editor.commands.focus();
    },
    [updateAttributes, isAccepted, editor]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLSpanElement>) => {
      // Keep formatting shortcuts from reaching the editor while typing a name.
      if (e.metaKey || e.ctrlKey) {
        const allowed = new Set(["a", "c", "v", "x", "z"]);
        if (!allowed.has(e.key.toLowerCase())) {
          e.stopPropagation();
          e.preventDefault();
          return;
        }
      }
      if (showAutocomplete) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setNavigated(true);
          setSelectedIndex((p) => (p + 1) % filtered.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setNavigated(true);
          setSelectedIndex((p) => (p - 1 + filtered.length) % filtered.length);
          return;
        }
        // Tab always accepts the highlighted suggestion. Enter accepts it ONLY
        // if the user navigated into the list; otherwise Enter commits exactly
        // what was typed, so a value overlapping a suggestion (e.g. "brand")
        // is still reachable by keyboard.
        if (e.key === "Tab" || (e.key === "Enter" && navigated)) {
          e.preventDefault();
          const sel = filtered[selectedIndex];
          if (sel) selectSuggestion(sel);
          else {
            refocusOnCommitRef.current = true;
            editableRef.current?.blur();
          }
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          refocusOnCommitRef.current = true;
          editableRef.current?.blur();
          return;
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        refocusOnCommitRef.current = true;
        editableRef.current?.blur();
        return;
      }
      if (e.key === "Backspace" && !(editableRef.current?.textContent || "")) {
        e.preventDefault();
        setIsEditing(false);
        deleteNode();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        if (editableRef.current) editableRef.current.textContent = variableId;
        setIsEditing(false);
        editor.commands.focus();
      }
    },
    [
      showAutocomplete,
      filtered,
      selectedIndex,
      selectSuggestion,
      deleteNode,
      editor,
      variableId,
      navigated,
    ]
  );

  // When the footer isn't being edited (editor blurred) render KNOWN variables
  // as plain text — inheriting the footer's text style — instead of the chip
  // pill. Invalid variables stay chips so the problem stays visible; focusing
  // the editor brings every chip back for editing. (Memoized so the regex-based
  // validity check doesn't re-run on every render.)
  const showAsPlainText = useMemo(
    () =>
      !options.forceChips && !isEditing && !editorFocused && !isInvalid && isAccepted(variableId),
    [options.forceChips, isEditing, editorFocused, isInvalid, isAccepted, variableId]
  );
  if (showAsPlainText) {
    // A variable PRESENT in the values map renders its value — even when that
    // value is "" (a known-but-unset variable renders nothing, not a stray
    // token). Only a variable absent from the map falls back to its `{id}`
    // token.
    const values = options.variableValues;
    const known = values != null && Object.prototype.hasOwnProperty.call(values, variableId);
    const text = known ? values[variableId] : `{${variableId}}`;
    return (
      // Plain-text (resolved value) may be a long unbroken string like a URL —
      // let it wrap at the textbox edge instead of overflowing (the chip pill
      // stays `nowrap`, but this is just text).
      <NodeViewWrapper as="span" style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>
        <span
          // The variable's inner text isn't editable, so a click ANYWHERE on it
          // should drop the caret at the END of the variable (right after the
          // node) rather than somewhere inside its rendered value. Regular text
          // is untouched — only this node overrides the click. preventDefault
          // stops ProseMirror from resolving its own mid-value position.
          onMouseDown={(e) => {
            if (!editable) return;
            const pos = typeof getPos === "function" ? getPos() : undefined;
            if (typeof pos !== "number") return;
            e.preventDefault();
            editor
              .chain()
              .focus()
              .setTextSelection(pos + node.nodeSize)
              .run();
          }}
        >
          {text}
        </span>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper as="span" style={{ whiteSpace: "nowrap" }}>
      <span
        ref={chipRef}
        contentEditable={false}
        style={chipStyle(isInvalid)}
        onMouseDown={(e) => {
          if (!editable || isEditing) return;
          e.preventDefault();
          e.stopPropagation();
          setIsEditing(true);
          setQuery("");
          setSelectedIndex(0);
        }}
      >
        <VariableIcon color={(isInvalid ? PALETTE.invalid : PALETTE.valid).icon} />
        {isEditing ? (
          <span
            ref={editableRef}
            contentEditable
            suppressContentEditableWarning
            style={{ outline: "none", minWidth: 8 }}
            onInput={(e) => {
              setQuery((e.target as HTMLSpanElement).textContent || "");
              setSelectedIndex(0);
              // Typing resets navigation: Enter again commits the typed value.
              setNavigated(false);
            }}
            onKeyDown={onKeyDown}
            onBlur={commit}
          />
        ) : (
          <span>{variableId || "variable"}</span>
        )}
      </span>
      {showAutocomplete && (
        <VariableAutocomplete
          items={filtered}
          selectedIndex={selectedIndex}
          onSelect={selectSuggestion}
          anchorRef={chipRef}
        />
      )}
    </NodeViewWrapper>
  );
};
