import { cn } from "@/lib/utils";
import type { Content, JSONContent } from "@tiptap/core";
import TiptapDocument from "@tiptap/extension-document";
import TiptapParagraph from "@tiptap/extension-paragraph";
import TiptapText from "@tiptap/extension-text";
import { EditorContent, useEditor } from "@tiptap/react";
import * as React from "react";
import { useCallback, useEffect } from "react";
import { Variable, VariableNode, VariablePaste } from "../../extensions/Variable";
import { isValidVariableName } from "../../utils/validateVariableName";

export interface VariableTextareaProps {
  /** The current value with {{variable}} syntax */
  value?: string;
  /** Called when the value changes */
  onChange?: (value: string) => void;
  /** List of available variable names for autocomplete */
  variables?: string[];
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether to disable variable autocomplete suggestions */
  disableVariableAutocomplete?: boolean;
  /** Called when the input gains focus */
  onFocus?: () => void;
  /** Called when the input loses focus */
  onBlur?: () => void;
}

/**
 * Parses a string with {{variable}} syntax into TipTap JSON content
 */
function parseStringToContent(text: string): Content {
  if (!text) {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
  }

  const variableRegex = /\{\{([^}]+)\}\}/g;
  const nodes: JSONContent[] = [];
  let lastIndex = 0;
  let match;

  while ((match = variableRegex.exec(text)) !== null) {
    // Add text before the variable
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index);
      if (beforeText) {
        nodes.push({ type: "text", text: beforeText });
      }
    }

    // Add the variable node
    const variableName = match[1].trim();
    if (isValidVariableName(variableName)) {
      nodes.push({ type: "variable", attrs: { id: variableName } });
    } else {
      // Invalid variable name, keep as plain text
      nodes.push({ type: "text", text: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last variable
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      nodes.push({ type: "text", text: remainingText });
    }
  }

  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: nodes.length > 0 ? nodes : undefined,
      },
    ],
  };
}

/**
 * Converts TipTap JSON content back to string with {{variable}} syntax
 */
function contentToString(doc: JSONContent): string {
  if (!doc.content) return "";

  let result = "";

  const processNode = (node: JSONContent) => {
    if (node.type === "text" && node.text) {
      result += node.text;
    } else if (node.type === "variable" && node.attrs?.id) {
      result += `{{${node.attrs.id}}}`;
    } else if (node.type === "paragraph" || node.type === "doc") {
      if (node.content) {
        node.content.forEach((child) => processNode(child));
      }
    }
  };

  doc.content.forEach((node) => processNode(node));
  return result;
}

/**
 * A textarea-like input that renders {{variable}} patterns as styled chips.
 * Uses a minimal TipTap editor under the hood for rich content rendering.
 */
export const VariableTextarea = React.forwardRef<HTMLDivElement, VariableTextareaProps>(
  (
    {
      value = "",
      onChange,
      variables = [],
      placeholder,
      className,
      disabled = false,
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
        TiptapDocument.configure({
          // Single paragraph only - no multi-line support needed for simple inputs
        }),
        TiptapParagraph.configure({
          HTMLAttributes: {
            class: "courier-m-0",
          },
        }),
        TiptapText,
        VariableNode,
        Variable.configure({
          variables: Object.fromEntries(variables.map((v) => [v, v])),
          disableSuggestions: disableVariableAutocomplete,
        }),
        VariablePaste,
      ],
      content: parseStringToContent(value),
      editable: !disabled,
      editorProps: {
        attributes: {
          class: "courier-outline-none courier-min-h-[20px]",
          "data-placeholder": placeholder || "",
        },
        handleKeyDown: (_view, event) => {
          // Prevent Enter from creating new paragraphs - treat as single-line
          if (event.key === "Enter" && !event.shiftKey) {
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
          // Base textarea styles matching the existing Textarea component
          "courier-flex courier-min-h-[44px] courier-w-full courier-rounded-md courier-border-none courier-bg-secondary courier-text-secondary-foreground courier-p-1.5 courier-text-base md:courier-text-sm",
          // Focus styles
          "focus-within:courier-outline-none focus-within:courier-ring-2 focus-within:courier-ring-ring focus-within:courier-ring-offset-0",
          // Disabled styles
          disabled && "courier-cursor-not-allowed courier-opacity-50",
          // Variable textarea specific styles
          "[&_.ProseMirror]:courier-outline-none [&_.ProseMirror]:courier-min-h-[20px] [&_.ProseMirror]:courier-p-0",
          // Placeholder styles
          "[&_.ProseMirror.is-editor-empty:first-child::before]:courier-content-[attr(data-placeholder)] [&_.ProseMirror.is-editor-empty:first-child::before]:courier-text-muted-foreground [&_.ProseMirror.is-editor-empty:first-child::before]:courier-float-left [&_.ProseMirror.is-editor-empty:first-child::before]:courier-h-0 [&_.ProseMirror.is-editor-empty:first-child::before]:courier-pointer-events-none",
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
