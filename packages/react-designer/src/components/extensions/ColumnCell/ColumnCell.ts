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
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="column-cell"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "column-cell",
        style: "flex: 1 1 0%; width: 0; min-height: 120px;",
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
