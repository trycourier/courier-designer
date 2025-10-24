import { mergeAttributes, Node } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columnRow: {
      insertColumnRow: () => ReturnType;
    };
  }
}

export const ColumnRow = Node.create({
  name: "columnRow",
  group: "columnContent",
  content: "columnCell+",
  isolating: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="column-row"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "column-row",
        class: "courier-flex courier-flex-row courier-gap-2 courier-w-full",
        style: "display: flex; flex-direction: row; gap: 0.5rem; width: 100%;",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertColumnRow:
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

export default ColumnRow;
