import { cn } from "@/lib/utils";
import TiptapDocument from "@tiptap/extension-document";
import TiptapParagraph from "@tiptap/extension-paragraph";
import TiptapPlaceholder from "@tiptap/extension-placeholder";
import TiptapText from "@tiptap/extension-text";
import { EditorContent, useEditor } from "@tiptap/react";
import * as React from "react";
import { useCallback, useEffect } from "react";
import { Variable, VariablePaste, VariableTypeHandler } from "../../extensions/Variable";
import {
  SimpleVariableNode,
  parseStringToContent,
  contentToString,
  type VariableEditorBaseProps,
} from "./shared";

export interface VariableInputProps extends VariableEditorBaseProps {
  /** Whether the input is read-only */
  readOnly?: boolean;
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
      variables = [],
      placeholder,
      className,
      disabled = false,
      readOnly = false,
      disableVariableAutocomplete = false,
      onFocus,
      onBlur,
    },
    ref
  ) => {
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
        Variable.configure({
          variables: Object.fromEntries(variables.map((v) => [v, v])),
          disableSuggestions: disableVariableAutocomplete,
        }),
        VariablePaste,
        VariableTypeHandler,
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
            // Allow Enter during suggestion selection (handled by Variable extension)
            const suggestionActive = document.querySelector(".variable-suggestions");
            if (!suggestionActive) {
              event.preventDefault();
              return true;
            }
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

      const newContent = parseStringToContent(value);
      editor.commands.setContent(newContent);

      isUpdatingFromProps.current = false;
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
          "variable-input-placeholder",
          // Base input styles
          "courier-flex courier-items-center courier-w-full courier-rounded-md courier-border-none courier-bg-transparent courier-text-foreground courier-py-1 courier-text-sm md:courier-text-md",
          // Disabled/readonly styles
          (disabled || readOnly) && "courier-cursor-default",
          disabled && "courier-opacity-50",
          // Variable input specific styles
          "[&_.ProseMirror]:courier-h-[25px] [&_.ProseMirror]:courier-flex [&_.ProseMirror]:courier-items-end [&_.ProseMirror]:courier-outline-none [&_.ProseMirror]:courier-border-none [&_.ProseMirror]:courier-p-0 [&_.ProseMirror]:courier-flex-1",
          "[&_.tiptap]:courier-outline-none [&_.tiptap]:courier-border-none",
          className
        )}
        onClick={() => !readOnly && !disabled && editor?.commands.focus()}
      >
        <EditorContent editor={editor} className="courier-w-full courier-flex-1" />
      </div>
    );
  }
);

VariableInput.displayName = "VariableInput";
