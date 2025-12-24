import { Node } from "@tiptap/core";
import type { Content, JSONContent } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import * as React from "react";
import { useCallback } from "react";
import { isValidVariableName } from "../../utils/validateVariableName";
import { VariableChipBase } from "./VariableChipBase";

/**
 * Simple variable icon for the chip
 */
export const VariableChipIcon: React.FC<{ color?: string }> = ({ color = "#B45309" }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 20 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="courier-flex-shrink-0"
  >
    <path
      d="M5.75 0H7.25C7.65625 0 8 0.34375 8 0.75C8 1.1875 7.65625 1.5 7.25 1.5H5.75C5.03125 1.5 4.5 2.0625 4.5 2.75V4.1875C4.5 4.90625 4.1875 5.625 3.6875 6.125L2.78125 7L3.6875 7.90625C4.1875 8.40625 4.5 9.125 4.5 9.84375V11.25C4.5 11.9688 5.03125 12.5 5.75 12.5H7.25C7.65625 12.5 8 12.8438 8 13.25C8 13.6875 7.65625 14 7.25 14H5.75C4.21875 14 3 12.7812 3 11.25V9.84375C3 9.5 2.84375 9.1875 2.625 8.96875L1.21875 7.53125C0.90625 7.25 0.90625 6.78125 1.21875 6.46875L2.625 5.0625C2.84375 4.84375 3 4.53125 3 4.1875V2.75C3 1.25 4.21875 0 5.75 0ZM14.25 0C15.75 0 17 1.25 17 2.75V4.1875C17 4.53125 17.125 4.84375 17.3438 5.0625L18.7812 6.5C19.0625 6.78125 19.0625 7.25 18.7812 7.53125L17.3438 8.96875C17.125 9.1875 17 9.5 17 9.84375V11.25C17 12.7812 15.75 14 14.25 14H12.75C12.3125 14 12 13.6875 12 13.25C12 12.8438 12.3125 12.5 12.75 12.5H14.25C14.9375 12.5 15.5 11.9688 15.5 11.25V9.84375C15.5 9.125 15.7812 8.40625 16.2812 7.90625L17.1875 7L16.2812 6.125C15.7812 5.625 15.5 4.90625 15.5 4.1875V2.75C15.5 2.0625 14.9375 1.5 14.25 1.5H12.75C12.3125 1.5 12 1.1875 12 0.75C12 0.34375 12.3125 0 12.75 0H14.25Z"
      fill={color}
    />
    <circle cx="10" cy="7" r="2" fill={color} />
  </svg>
);

// Get icon color based on invalid state
const getIconColor = (isInvalid: boolean): string => {
  return isInvalid ? "#DC2626" : "#B45309";
};

/**
 * Standalone variable view component with editing support
 * Used in VariableInput and VariableTextarea components
 */
export const SimpleVariableView: React.FC<NodeViewProps> = ({
  node,
  editor,
  getPos,
  updateAttributes,
}) => {
  const variableId = node.attrs.id || "";
  const isInvalid = node.attrs.isInvalid || false;

  const handleUpdateAttributes = useCallback(
    (attrs: { id: string; isInvalid: boolean }) => {
      updateAttributes(attrs);
    },
    [updateAttributes]
  );

  const handleDelete = useCallback(() => {
    if (typeof getPos === "function") {
      const pos = getPos();
      if (typeof pos === "number") {
        editor
          .chain()
          .focus()
          .deleteRange({ from: pos, to: pos + node.nodeSize })
          .run();
      }
    }
  }, [editor, getPos, node.nodeSize]);

  return (
    <NodeViewWrapper as="span" className="courier-inline">
      <VariableChipBase
        variableId={variableId}
        isInvalid={isInvalid}
        onUpdateAttributes={handleUpdateAttributes}
        onDelete={handleDelete}
        icon={<VariableChipIcon color={getIconColor(isInvalid)} />}
        readOnly={!editor.isEditable}
      />
    </NodeViewWrapper>
  );
};

/**
 * Custom VariableNode that uses SimpleVariableView
 * Used in VariableInput and VariableTextarea components
 */
export const SimpleVariableNode = Node.create({
  name: "variable",
  group: "inline",
  inline: true,
  selectable: false,
  atom: true,

  addAttributes() {
    return {
      id: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-id") || "",
        renderHTML: (attributes) => ({
          "data-id": attributes.id,
        }),
      },
      isInvalid: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-invalid") === "true",
        renderHTML: (attributes) => ({
          "data-invalid": attributes.isInvalid ? "true" : undefined,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-variable]",
        getAttrs: (element) => {
          const id = (element as HTMLElement).getAttribute("data-id");
          return id ? { id } : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "span",
      {
        "data-variable": true,
        ...HTMLAttributes,
      },
      `{{${node.attrs.id}}}`,
    ];
  },

  renderText({ node }) {
    return `{{${node.attrs.id}}}`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(SimpleVariableView);
  },
});

/**
 * Parses a string with {{variable}} syntax into TipTap JSON content
 */
export function parseStringToContent(text: string): Content {
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
      nodes.push({ type: "variable", attrs: { id: variableName, isInvalid: false } });
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
export function contentToString(doc: JSONContent): string {
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
 * Base props shared between VariableInput and VariableTextarea
 */
export interface VariableEditorBaseProps {
  /** The current value with {{variable}} syntax */
  value?: string;
  /** Called when the value changes */
  onChange?: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Called when the input gains focus */
  onFocus?: () => void;
  /** Called when the input loses focus */
  onBlur?: () => void;
}
