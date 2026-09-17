import { cn } from "@/lib";
import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { classifyExpression } from "@/lib/utils/handlebars/classifyExpression";
import { BUILTIN_HELPERS, UNIVERSAL_HELPERS } from "@/lib/utils/handlebars/helperRegistry";
import { validateHandlebars } from "@/lib/utils/handlebars/validateHandlebars";
import { activeParamIndex, getHelperSignature } from "@/lib/utils/handlebars/helperSignatures";
import { SignatureHint } from "@/components/ui/VariableEditor/SignatureHint";
import { getVariableViewMode } from "../Variable/variable-storage.utils";
import { HandlebarsExpressionIcon } from "./HandlebarsExpressionIcon";

const ALL_HELPERS = [...BUILTIN_HELPERS, ...UNIVERSAL_HELPERS].sort();

const MAX_LABEL = 40;

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

/**
 * The partial helper name under the caret, or null when the caret is not in a
 * helper position.
 *
 * A helper name is only ever the first token of the expression or of a
 * `(sub expression)` — once there is whitespace after that token the author is
 * writing arguments, and suggesting helpers there would be noise.
 */
export function helperQuery(inner: string): string | null {
  const openParen = inner.lastIndexOf("(");
  const token = (openParen === -1 ? inner : inner.slice(openParen + 1)).replace(/^#/, "");
  if (/\s/.test(token)) return null;
  if (!/^[a-zA-Z0-9_-]*$/.test(token)) return null;
  return token;
}

export const HandlebarsExpressionView: React.FC<NodeViewProps> = ({
  node,
  editor,
  updateAttributes,
  deleteNode,
}) => {
  const raw: string = node.attrs.raw || "";
  const { inner, triple } = useMemo(() => toInner(raw), [raw]);
  const expr = useMemo(() => classifyExpression(inner, triple), [inner, triple]);

  const [isEditing, setIsEditing] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  // Text up to the caret, which is what decides the active parameter.
  const [draftBeforeCaret, setDraftBeforeCaret] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const editableRef = useRef<HTMLSpanElement>(null);

  const variableViewMode = getVariableViewMode(editor);

  const issues = useMemo(() => validateHandlebars(raw), [raw]);
  const errors = issues.filter((i) => i.severity === "error");
  const isInvalid = errors.length > 0;

  const suggestions = useMemo(() => {
    if (query === null) return [];
    if (!query) return ALL_HELPERS;
    return ALL_HELPERS.filter((name) => name.toLowerCase().startsWith(query.toLowerCase()));
  }, [query]);

  const showSuggestions = isEditing && suggestions.length > 0;

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

  // Opened straight from the helper autocomplete — drop into edit mode so the
  // signature hint is up and the caret is where the arguments go.
  useEffect(() => {
    if (!node.attrs.autoEdit || isEditing) return;
    setIsEditing(true);
    setQuery(null);
    updateAttributes({ autoEdit: false });
  }, [node.attrs.autoEdit, isEditing, updateAttributes]);

  const commit = useCallback(() => {
    setIsEditing(false);
    setQuery(null);
    const next = (editableRef.current?.textContent || "").trim();

    if (!next) {
      deleteNode();
      return;
    }

    const nextRaw = toRaw(next, triple);
    const nextExpr = classifyExpression(next, triple);
    updateAttributes({
      raw: nextRaw,
      kind: nextExpr.kind,
      name: nextExpr.name,
      isInvalid: validateHandlebars(nextRaw).some((i) => i.severity === "error"),
    });
  }, [deleteNode, triple, updateAttributes]);

  const applySuggestion = useCallback((helper: string) => {
    const el = editableRef.current;
    if (!el) return;
    const current = el.textContent || "";
    const q = helperQuery(current) ?? "";
    el.textContent = current.slice(0, current.length - q.length) + helper;
    setQuery(null);
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
    setQuery(helperQuery(before));
    setSelectedIndex(0);
  }, [readBeforeCaret]);

  const handleInput = useCallback(() => {
    syncFromCaret();
  }, [syncFromCaret]);

  // In preview the whole field is rendered through Handlebars, so an expression
  // has no standalone output of its own to show.
  if (variableViewMode === "wysiwyg") {
    return (
      <NodeViewWrapper as="span" className="courier-inline" contentEditable={false}>
        {""}
      </NodeViewWrapper>
    );
  }

  const label = expr.kind === "comment" ? "comment" : inner.trim();
  const display = label.length > MAX_LABEL ? `${label.slice(0, MAX_LABEL - 1)}…` : label;
  const title = issues.length ? issues.map((i) => i.message).join("\n") : raw;

  return (
    <NodeViewWrapper as="span" className="courier-inline courier-max-w-full">
      <span
        className={cn(
          "courier-handlebars-chip",
          isInvalid && "courier-handlebars-chip-invalid",
          `courier-handlebars-chip-${expr.kind}`
        )}
        data-handlebars-kind={expr.kind}
        data-testid="handlebars-expression-chip"
        title={title}
        onDoubleClick={() => {
          if (!editor.isEditable) return;
          setIsEditing(true);
          setQuery(null);
        }}
      >
        <span className="courier-flex-shrink-0 courier-flex courier-items-center">
          <HandlebarsExpressionIcon color={isInvalid ? "#DC2626" : "#6D28D9"} />
        </span>
        {isEditing ? (
          <span
            ref={editableRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            className="courier-outline-none courier-whitespace-pre"
            onBlur={commit}
            onInput={handleInput}
            onKeyUp={syncFromCaret}
            onMouseUp={syncFromCaret}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <span>{display}</span>
        )}
        {showSignature && signature && (
          <SignatureHint name={editingName} signature={signature} activeParam={activeParam} />
        )}
        {showSuggestions && (
          <span className="courier-handlebars-suggestions" contentEditable={false}>
            {suggestions.slice(0, 8).map((helper, i) => (
              <span
                key={helper}
                className={cn(
                  "courier-handlebars-suggestion",
                  i === selectedIndex && "courier-handlebars-suggestion-active"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applySuggestion(helper);
                }}
              >
                {helper}
              </span>
            ))}
          </span>
        )}
      </span>
    </NodeViewWrapper>
  );
};
