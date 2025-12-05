import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { v4 as uuidv4 } from "uuid";
import { generateNodeIds } from "../../utils";
import type { ColumnProps } from "./Column.types";
import { ColumnComponentNode } from "./ColumnComponent";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    column: {
      setColumn: (props: Partial<ColumnProps>) => ReturnType;
    };
  }
}

export const defaultColumnProps: ColumnProps = {
  columnsCount: 2,
  paddingHorizontal: 0,
  paddingVertical: 0,
  backgroundColor: "transparent",
  borderWidth: 0,
  borderRadius: 0,
  borderColor: "transparent",
  cells: [],
};

export const Column = Node.create({
  name: "column",
  group: "block",
  content: "columnRow?", // Make content optional for backward compatibility
  isolating: true,
  selectable: false,

  onCreate() {
    generateNodeIds(this.editor, this.name);
    // Note: We no longer auto-create cells. They will be created on first drop.
  },

  addAttributes() {
    return {
      columnsCount: {
        default: defaultColumnProps.columnsCount,
        parseHTML: (element) => element.getAttribute("data-columns-count"),
        renderHTML: (attributes) => ({
          "data-columns-count": attributes.columnsCount,
        }),
      },
      paddingHorizontal: {
        default: defaultColumnProps.paddingHorizontal,
        parseHTML: (element) => element.getAttribute("data-padding-horizontal"),
        renderHTML: (attributes) => ({
          "data-padding-horizontal": attributes.paddingHorizontal,
        }),
      },
      paddingVertical: {
        default: defaultColumnProps.paddingVertical,
        parseHTML: (element) => element.getAttribute("data-padding-vertical"),
        renderHTML: (attributes) => ({
          "data-padding-vertical": attributes.paddingVertical,
        }),
      },
      backgroundColor: {
        default: defaultColumnProps.backgroundColor,
        parseHTML: (element) => element.getAttribute("data-background-color"),
        renderHTML: (attributes) => ({
          "data-background-color": attributes.backgroundColor,
        }),
      },
      borderWidth: {
        default: defaultColumnProps.borderWidth,
        parseHTML: (element) => element.getAttribute("data-border-width"),
        renderHTML: (attributes) => ({
          "data-border-width": attributes.borderWidth,
        }),
      },
      borderRadius: {
        default: defaultColumnProps.borderRadius,
        parseHTML: (element) => element.getAttribute("data-border-radius"),
        renderHTML: (attributes) => ({
          "data-border-radius": attributes.borderRadius,
        }),
      },
      borderColor: {
        default: defaultColumnProps.borderColor,
        parseHTML: (element) => element.getAttribute("data-border-color"),
        renderHTML: (attributes) => ({
          "data-border-color": attributes.borderColor,
        }),
      },
      id: {
        default: () => `node-${uuidv4()}`,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => ({
          "data-id": attributes.id,
          "data-node-id": attributes.id,
        }),
      },
      locales: {
        default: undefined,
        parseHTML: () => undefined,
        renderHTML: () => ({}),
      },
      cells: {
        default: [],
        parseHTML: (element) => {
          const cellsAttr = element.getAttribute("data-cells");
          return cellsAttr ? JSON.parse(cellsAttr) : [];
        },
        renderHTML: (attributes) => ({
          "data-cells": JSON.stringify(attributes.cells || []),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="column"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "column",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ColumnComponentNode);
  },

  addCommands() {
    return {
      setColumn:
        (props) =>
        ({ chain }) => {
          const columnsCount = props.columnsCount || defaultColumnProps.columnsCount;

          // Generate a unique ID for this column
          const columnId = `node-${Date.now()}`;

          // Create cells for the row
          const cells = Array.from({ length: columnsCount }, (_, index) => ({
            type: "columnCell",
            attrs: {
              index,
              columnId,
            },
            content: [
              {
                type: "paragraph",
              },
            ],
          }));

          return chain()
            .insertContent({
              type: this.name,
              attrs: {
                ...props,
                id: columnId,
              },
              content: [
                {
                  type: "columnRow",
                  content: cells,
                },
              ],
            })
            .run();
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Prevent text input that could replace the column block
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        const node = editor.state.doc.nodeAt(selection.$anchor.pos);

        if (node?.type.name === "column") {
          return true;
        }
        return false;
      },
      Delete: ({ editor }) => {
        const { selection } = editor.state;
        const node = editor.state.doc.nodeAt(selection.$anchor.pos);

        if (node?.type.name === "column") {
          return true;
        }
        return false;
      },
    };
  },
});
