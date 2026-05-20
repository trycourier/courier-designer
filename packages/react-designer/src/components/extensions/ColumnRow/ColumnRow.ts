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
        class: "courier-flex courier-flex-row courier-items-stretch courier-w-full courier-gap-4",
        style: "display: flex; flex-direction: row; align-items: stretch; width: 100%; gap: 16px;",
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
