import { VARIABLE_ICON_PATHS, VARIABLE_ICON_VIEWBOX } from "@/components/utils/chipIcons";
import { Node } from "@tiptap/core";
import { TextSelection } from "prosemirror-state";
import type { Content, JSONContent } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import * as React from "react";
import { useCallback } from "react";
import { classifyExpression } from "@/lib/utils/handlebars/classifyExpression";
import { isVariableLike, segmentText } from "@/lib/utils/handlebars/segmentText";
import {
  autoEditAttribute,
  CHIP_NODE_PRIORITY,
  enterOpensChip,
} from "@/components/extensions/chipEditing";
import { VariableChipBase } from "./VariableChipBase";

/**
 * Simple variable icon for the chip
 */
/**
 * Colour comes from the chip via `currentColor` unless a caller pins one, so
 * the chip's states live in the stylesheet rather than in a second hex table
 * here — the editable and read-only chips were drawing the same glyph in
 * different colours because this defaulted to amber while the string renderer
 * inherited.
 */
export const VariableChipIcon: React.FC<{ color?: string }> = ({ color = "currentColor" }) => (
  <svg
    width="14"
    height="14"
    viewBox={VARIABLE_ICON_VIEWBOX}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="courier-flex-shrink-0"
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
      // Same swap the canvas does: typing `{{` opens a variable chip, so at
      // human speed `#if x` or `else` is typed INSIDE it and would commit as a
      // variable name. It draws as a variable and takes no part in block
      // matching, which is why the subject showed red variable chips where the
      // body showed expression chips for the same text.
      const expr = classifyExpression(attrs.id);
      if (attrs.id && !isVariableLike(expr, false) && typeof getPos === "function") {
        try {
          const pos = getPos();
          if (typeof pos === "number" && editor.schema.nodes.handlebarsExpression) {
            const raw = `{{${attrs.id}}}`;
            editor
              .chain()
              .command(({ tr }) => {
                const created = editor.schema.nodes.handlebarsExpression.create({
                  raw,
                  kind: expr.kind,
                  name: expr.name,
                  isInvalid: false,
                });
                tr.replaceWith(pos, pos + node.nodeSize, created);
                tr.setSelection(TextSelection.create(tr.doc, pos + created.nodeSize));
                return true;
              })
              .focus()
              .run();
            return;
          }
        } catch {
          /* node is gone; fall through to a plain attribute update */
        }
      }

      updateAttributes(attrs);
    },
    [updateAttributes, editor, getPos, node.nodeSize]
  );

  const handleAutoEditConsumed = useCallback(() => {
    updateAttributes({ autoEdit: false });
  }, [updateAttributes]);

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
        icon={<VariableChipIcon />}
        readOnly={!editor.isEditable}
        autoEdit={node.attrs.autoEdit}
        onAutoEditConsumed={handleAutoEditConsumed}
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
  // Matches the canvas chip: outranks Paragraph so Enter opens the chip rather
  // than splitting, and selectable so a click selects it and the arrow keys
  // land on it instead of stepping straight past.
  priority: CHIP_NODE_PRIORITY,
  group: "inline",
  inline: true,
  selectable: true,
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
      autoEdit: autoEditAttribute,
    };
  },

  addKeyboardShortcuts() {
    return { Enter: enterOpensChip(this) };
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
      // Never emit `{{}}` for an empty/unbound id — it breaks the backend Handlebars compile.
      node.attrs.id ? `{{${node.attrs.id}}}` : "",
    ];
  },

  renderText({ node }) {
    return node.attrs.id ? `{{${node.attrs.id}}}` : "";
  },

  addNodeView() {
    return ReactNodeViewRenderer(SimpleVariableView);
  },
});

// Zero-width space character used to ensure cursor can be positioned after inline nodes
const ZERO_WIDTH_SPACE = "\u200B";

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

  const nodes: JSONContent[] = [];

  for (const segment of segmentText(text)) {
    if (segment.type === "text") {
      nodes.push({ type: "text", text: segment.text });
      continue;
    }

    if (segment.type === "variable") {
      // A malformed or empty name is not a chip; keep the author's text as they
      // wrote it. `{{}}` in particular is a backend parse error, not a variable
      // waiting to be filled in.
      if (segment.isInvalid || segment.name === "") {
        nodes.push({ type: "text", text: `{{${segment.name}}}` });
      } else {
        nodes.push({ type: "variable", attrs: { id: segment.name, isInvalid: false } });
      }
      continue;
    }

    nodes.push({
      type: "handlebarsExpression",
      attrs: {
        raw: segment.raw,
        kind: segment.kind,
        name: segment.name,
        isInvalid: segment.isInvalid,
      },
    });
  }

  // If the last node is an inline atom, add a zero-width space so the cursor can
  // be placed after it.
  const lastType = nodes[nodes.length - 1]?.type;
  if (lastType === "variable" || lastType === "handlebarsExpression") {
    nodes.push({ type: "text", text: ZERO_WIDTH_SPACE });
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
      // Strip zero-width spaces that were added for cursor positioning
      result += node.text.replace(/\u200B/g, "");
    } else if (node.type === "variable" && node.attrs?.id) {
      result += `{{${node.attrs.id}}}`;
    } else if (node.type === "handlebarsExpression" && node.attrs?.raw) {
      result += node.attrs.raw;
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
