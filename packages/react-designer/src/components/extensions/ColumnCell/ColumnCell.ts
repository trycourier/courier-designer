import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
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
  content: "block+",
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
});

export default ColumnCell;
