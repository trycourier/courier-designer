import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ButtonComponentNode } from "./ButtonComponent";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    button: {
      /**
       * Add a button node
       */
      setButton: (content: { text: string }) => ReturnType;
    };
  }
}

export const Button = Node.create({
  name: "button",

  group: "block",

  content: "text*",

  parseHTML() {
    return [
      {
        tag: 'div[data-type="button"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "button",
        class: "my-0", // This will remove vertical margins
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ButtonComponentNode);
  },

  addCommands() {
    return {
      setButton:
        (content) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            content: [{ type: "text", text: content.text }],
          });
        },
    };
  },
});
