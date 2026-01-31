import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { ColumnCellComponentNode } from "./ColumnCellComponent";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columnCell: {
      insertColumnCell: () => ReturnType;
    };
  }
}

export const ColumnCell = Node.create({
  name: "columnCell",
  group: "columnRow",
  content: "block*",
  isolating: true,
  selectable: false,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => ({
          "data-id": attributes.id,
        }),
      },
      index: {
        default: 0,
        parseHTML: (element) => {
          const idx = element.getAttribute("data-cell-index");
          return idx ? parseInt(idx, 10) : 0;
        },
        renderHTML: (attributes) => ({
          "data-cell-index": attributes.index,
        }),
      },
      columnId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-column-id"),
        renderHTML: (attributes) => ({
          "data-column-id": attributes.columnId,
        }),
      },
      isEditorMode: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-editor-mode") === "true",
        renderHTML: (attributes) => ({
          "data-editor-mode": attributes.isEditorMode ? "true" : "false",
        }),
      },
      width: {
        default: 50, // Default 50% for 2 columns
        parseHTML: (element) => {
          const width = element.getAttribute("data-cell-width");
          return width ? parseFloat(width) : 50;
        },
        renderHTML: (attributes) => ({
          "data-cell-width": attributes.width,
        }),
      },
      // Frame attributes
      paddingHorizontal: {
        default: 0,
        parseHTML: (element) => {
          const val = element.getAttribute("data-padding-horizontal");
          return val ? parseInt(val, 10) : 0;
        },
        renderHTML: (attributes) => ({
          "data-padding-horizontal": attributes.paddingHorizontal,
        }),
      },
      paddingVertical: {
        default: 0,
        parseHTML: (element) => {
          const val = element.getAttribute("data-padding-vertical");
          return val ? parseInt(val, 10) : 0;
        },
        renderHTML: (attributes) => ({
          "data-padding-vertical": attributes.paddingVertical,
        }),
      },
      backgroundColor: {
        default: "transparent",
        parseHTML: (element) => element.getAttribute("data-background-color") || "transparent",
        renderHTML: (attributes) => ({
          "data-background-color": attributes.backgroundColor,
        }),
      },
      // Border attributes
      borderWidth: {
        default: 0,
        parseHTML: (element) => {
          const val = element.getAttribute("data-border-width");
          return val ? parseInt(val, 10) : 0;
        },
        renderHTML: (attributes) => ({
          "data-border-width": attributes.borderWidth,
        }),
      },
      borderRadius: {
        default: 0,
        parseHTML: (element) => {
          const val = element.getAttribute("data-border-radius");
          return val ? parseInt(val, 10) : 0;
        },
        renderHTML: (attributes) => ({
          "data-border-radius": attributes.borderRadius,
        }),
      },
      borderColor: {
        default: "transparent",
        parseHTML: (element) => element.getAttribute("data-border-color") || "transparent",
        renderHTML: (attributes) => ({
          "data-border-color": attributes.borderColor,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="column-cell"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const width = node.attrs.width || 50;
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "column-cell",
        style: `flex: 0 0 ${width}%; width: ${width}%;`,
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ColumnCellComponentNode);
  },

  addCommands() {
    return {
      insertColumnCell:
        () =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
            })
            .run();
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("columnCellCleanup"),
        appendTransaction: (transactions, _oldState, newState) => {
          // Only run if document changed
          if (!transactions.some((tr) => tr.docChanged)) {
            return null;
          }

          const tr = newState.tr;
          let modified = false;

          // Find all columnCell nodes and manage isEditorMode + clean up empty paragraphs
          newState.doc.descendants((node, pos) => {
            if (node.type.name === "columnCell") {
              const isEmpty = node.childCount === 0;
              const hasOnlyEmptyParagraph =
                node.childCount === 1 &&
                node.firstChild?.type.name === "paragraph" &&
                node.firstChild?.content.size === 0;

              // Determine what isEditorMode should be
              let targetIsEditorMode = node.attrs.isEditorMode;

              if (isEmpty) {
                // Cell is completely empty, should show placeholder
                targetIsEditorMode = false;
              } else if (!isEmpty) {
                // Cell has content, should show content
                targetIsEditorMode = true;
              }

              // Update isEditorMode if it changed
              if (targetIsEditorMode !== node.attrs.isEditorMode) {
                tr.setNodeAttribute(pos, "isEditorMode", targetIsEditorMode);
                modified = true;
              }

              // Only delete empty paragraphs if target mode is false (not intentionally added)
              if (hasOnlyEmptyParagraph && targetIsEditorMode === false) {
                tr.delete(pos + 1, pos + node.nodeSize - 1);
                modified = true;
              }
            }
            return true;
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});

export default ColumnCell;
