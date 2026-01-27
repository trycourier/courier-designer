import { cn } from "@/lib/utils";
import TiptapDocument from "@tiptap/extension-document";
import TiptapParagraph from "@tiptap/extension-paragraph";
import TiptapPlaceholder from "@tiptap/extension-placeholder";
import TiptapText from "@tiptap/extension-text";
import { EditorContent, useEditor } from "@tiptap/react";
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
              "courier-m-0 courier-leading-normal !courier-inline-flex courier-whitespace-nowrap courier-flex-nowrap courier-items-center",
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
        onClick={() => !readOnly && !disabled && editor?.commands.focus()}
      >
        <EditorContent editor={editor} className="courier-flex-1 courier-min-w-0" />
        {showToolbar && !disabled && <VariableEditorToolbar editor={editor} />}
      </div>
    );
  }
);

VariableInput.displayName = "VariableInput";
