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
  borderColor: "#000000",
};

export const Column = Node.create({
  name: "column",
  group: "block",
  atom: true,
  selectable: false,

  onCreate() {
    generateNodeIds(this.editor, this.name);
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
          return chain()
            .insertContent({
              type: this.name,
              attrs: props,
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
