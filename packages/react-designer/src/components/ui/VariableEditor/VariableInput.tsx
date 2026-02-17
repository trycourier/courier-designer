import { cn } from "@/lib/utils";
import TiptapDocument from "@tiptap/extension-document";
import TiptapParagraph from "@tiptap/extension-paragraph";
import TiptapPlaceholder from "@tiptap/extension-placeholder";
import TiptapText from "@tiptap/extension-text";
import { EditorContent, useEditor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import * as React from "react";
import { useCallback, useEffect } from "react";
import { VariableInputRule, VariablePaste } from "../../extensions/Variable";
import {
  SimpleVariableNode,
  parseStringToContent,
  contentToString,
  type VariableEditorBaseProps,
} from "./shared";
import { VariableEditorToolbar } from "./VariableEditorToolbar";

/**
 * Determines if a click landed in the empty space of a VariableInput and returns
 * the correct target position to place the caret, or null if no correction is needed.
 *
 * This handles two cases where the browser's native click handler misplaces the caret
 * inside a flex-layout ProseMirror editor with non-editable variable chip nodes:
 *
 * Case 1 (depth === 0): posAtCoords returned {inside: -1}, meaning the click didn't
 *   land inside any node. The resolved position is at the doc level.
 *
 * Case 2 (depth > 0, clickX past content): posAtCoords returned a paragraph-level
 *   position, but the click coordinates are past the visible content's right edge.
 *   Common when content ends with a variable chip.
 */
export function resolveEmptySpaceClick(
  posDepth: number,
  pos: number,
  paragraphContentSize: number,
  clickX: number,
  endCoordsRight: number | null
): { targetPos: number; bias: -1 | 1 } | null {
  const paragraphEnd = 1 + paragraphContentSize;

  // Case 1: Click resolved to doc level — clearly outside paragraph
  if (posDepth === 0) {
    if (pos >= paragraphEnd) {
      return { targetPos: paragraphEnd, bias: -1 };
    }
    return { targetPos: 1, bias: 1 };
  }

  // Case 2: Click resolved inside paragraph but coordinates are past visible content
  if (endCoordsRight !== null && clickX > endCoordsRight) {
    return { targetPos: paragraphEnd, bias: -1 };
  }

  return null;
}

export interface VariableInputProps extends VariableEditorBaseProps {
  /** Whether the input is read-only */
  readOnly?: boolean;
  /** Whether to show the variable toolbar */
  showToolbar?: boolean;
}

/**
 * A single-line input that renders {{variable}} patterns as styled chips.
 * Uses a minimal TipTap editor under the hood for rich content rendering.
 */
export const VariableInput = React.forwardRef<HTMLDivElement, VariableInputProps>(
  (
    {
      value = "",
      onChange,
      placeholder,
      className,
      disabled = false,
      readOnly = false,
      showToolbar = false,
      onFocus,
      onBlur,
    },
    ref
  ) => {
    // Track if we're updating from props to avoid circular updates
    const isUpdatingFromProps = React.useRef(false);
    const lastValueRef = React.useRef(value);

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        TiptapDocument,
        TiptapParagraph.configure({
          HTMLAttributes: {
            class:
              "courier-m-0 courier-leading-normal courier-flex !courier-whitespace-nowrap courier-flex-nowrap courier-items-center",
          },
        }),
        TiptapText,
        SimpleVariableNode,
        VariableInputRule,
        VariablePaste,
        TiptapPlaceholder.configure({
          placeholder: placeholder || "",
          emptyEditorClass: "is-editor-empty",
        }),
      ],
      content: parseStringToContent(value),
      editable: !disabled && !readOnly,
      editorProps: {
        attributes: {
          class: "courier-outline-none",
        },
        handleKeyDown: (_view, event) => {
          // Prevent Enter from creating new paragraphs - single line input
          if (event.key === "Enter") {
            event.preventDefault();
            return true;
          }
          return false;
        },
        handleClick: (view, pos, event) => {
          // Fix caret placement when clicking in empty space of the input.
          // See resolveEmptySpaceClick() for full explanation of the two cases.
          const { state } = view;
          const { doc } = state;
          const $pos = doc.resolve(pos);
          const paragraph = doc.firstChild;
          if (!paragraph) return false;

          const paragraphEnd = 1 + paragraph.content.size;

          let endCoordsRight: number | null = null;
          try {
            endCoordsRight = view.coordsAtPos(paragraphEnd).right;
          } catch {
            // coordsAtPos can throw for edge-case positions
          }

          const result = resolveEmptySpaceClick(
            $pos.depth,
            pos,
            paragraph.content.size,
            event.clientX,
            endCoordsRight
          );

          if (result) {
            const $target = doc.resolve(result.targetPos);
            const selection = TextSelection.near($target, result.bias);
            view.dispatch(state.tr.setSelection(selection));
            // Force DOM selection re-sync (dispatch is a no-op if selection was already here)
            view.focus();
            return true;
          }

          return false;
        },
      },
      onUpdate: ({ editor }) => {
        if (isUpdatingFromProps.current) return;

        const newValue = contentToString(editor.getJSON());
        if (newValue !== lastValueRef.current) {
          lastValueRef.current = newValue;
          onChange?.(newValue);
        }
      },
      onFocus: () => {
        onFocus?.();
      },
      onBlur: () => {
        onBlur?.();
      },
    });

    // Sync external value changes to editor
    useEffect(() => {
      if (!editor || value === lastValueRef.current) return;

      isUpdatingFromProps.current = true;
      lastValueRef.current = value;

      // Defer setContent to avoid flushSync during React rendering
      // TipTap's setContent uses flushSync internally which can't be called during lifecycle methods
      const timeoutId = setTimeout(() => {
        const newContent = parseStringToContent(value);
        editor.commands.setContent(newContent);
        isUpdatingFromProps.current = false;
      }, 0);

      return () => clearTimeout(timeoutId);
    }, [editor, value]);

    // Update editable state when disabled/readOnly changes
    useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled && !readOnly);
      }
    }, [editor, disabled, readOnly]);

    // Focus method for external use
    const focus = useCallback(() => {
      editor?.commands.focus();
    }, [editor]);

    // Expose focus method via ref
    React.useImperativeHandle(ref, () => {
      const element = editor?.view.dom.parentElement;
      if (element) {
        (element as HTMLDivElement & { focus: () => void }).focus = focus;
      }
      return element as HTMLDivElement;
    }, [editor, focus]);

    return (
      <div
        ref={ref}
        className={cn(
          "variable-input-placeholder variable-editor-container variable-input-no-scrollbar",
          // Base input styles
          "courier-flex courier-items-center courier-w-full courier-rounded-md courier-border-none courier-bg-transparent courier-text-foreground courier-py-1",
          // Single-line input behavior - prevent wrapping, allow horizontal scroll
          "courier-overflow-x-auto courier-overflow-y-clip",
          "[&_.tiptap]:courier-whitespace-nowrap [&_.tiptap]:courier-flex-nowrap",
          "[&_.tiptap]:courier-inline-flex [&_.tiptap]:courier-items-center",
          "[&_.ProseMirror]:courier-inline-flex [&_.ProseMirror]:courier-items-center [&_.ProseMirror]:courier-flex-nowrap",
          // Disabled/readonly styles
          (disabled || readOnly) && "courier-cursor-default",
          disabled && "courier-opacity-50",
          "[&_.tiptap]:courier-outline-none [&_.tiptap]:courier-border-none",
          className
        )}
        style={{
          scrollbarWidth: "none", // Firefox
          msOverflowStyle: "none", // IE/Edge
        }}
        onClick={(e) => {
          if (readOnly || disabled) return;
          // Only call focus() for clicks outside ProseMirror's DOM (e.g., on the flex wrapper).
          // Clicks inside ProseMirror are handled by handleClick which dispatches its own
          // selection + focus. Calling focus() again after handleClick's dispatch causes
          // a blur/refocus race that loses the caret.
          const isInsideEditor = editor?.view?.dom?.contains(e.target as HTMLElement);
          if (!isInsideEditor) {
            editor?.commands.focus();
          }
        }}
      >
        <EditorContent editor={editor} className="courier-flex-1 courier-min-w-0" />
        {showToolbar && !disabled && <VariableEditorToolbar editor={editor} />}
      </div>
    );
  }
);

VariableInput.displayName = "VariableInput";
