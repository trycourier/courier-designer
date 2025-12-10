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

export interface VariableTextareaProps extends VariableEditorBaseProps {}

/**
 * A textarea-like input that renders {{variable}} patterns as styled chips.
 * Uses a minimal TipTap editor under the hood for rich content rendering.
 */
export const VariableTextarea = React.forwardRef<HTMLDivElement, VariableTextareaProps>(
  ({ value = "", onChange, placeholder, className, disabled = false, onFocus, onBlur }, ref) => {
    // Track if we're updating from props to avoid circular updates
    const isUpdatingFromProps = React.useRef(false);
    const lastValueRef = React.useRef(value);

    const editor = useEditor({
      extensions: [
        TiptapDocument,
        TiptapParagraph.configure({
          HTMLAttributes: {
            class: "courier-m-0 courier-leading-normal",
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
      editable: !disabled,
      editorProps: {
        attributes: {
          class: "courier-outline-none courier-min-h-[20px]",
        },
        handleKeyDown: (_view, event) => {
          // Prevent Enter from creating new paragraphs - treat as single-line
          if (event.key === "Enter" && !event.shiftKey) {
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

    // Update editable state when disabled changes
    useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled);
      }
    }, [editor, disabled]);

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
          "variable-textarea-placeholder",
          // Base textarea styles matching the existing Textarea component
          "courier-min-h-[44px] courier-w-full courier-rounded-md courier-border-none courier-bg-secondary courier-text-secondary-foreground courier-p-1.5 courier-text-base md:courier-text-sm",
          // Disabled styles
          disabled && "courier-cursor-not-allowed courier-opacity-50",
          // Variable textarea specific styles - ensure content aligns to top
          "[&_.ProseMirror]:courier-outline-none [&_.ProseMirror]:courier-min-h-[20px] [&_.ProseMirror]:courier-border-none [&_.ProseMirror]:courier-p-0",
          "[&_.tiptap]:courier-outline-none [&_.tiptap]:courier-border-none",
          className
        )}
        onClick={() => editor?.commands.focus()}
      >
        <EditorContent editor={editor} className="courier-w-full" />
      </div>
    );
  }
);

VariableTextarea.displayName = "VariableTextarea";
