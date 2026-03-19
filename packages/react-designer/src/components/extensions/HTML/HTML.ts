import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { v4 as uuidv4 } from "uuid";
import { generateNodeIds } from "../../utils";
import type { HTMLProps } from "./HTML.types";
import { HTMLComponentNode } from "./HTMLComponent";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    customCode: {
      setCustomCode: (props: Partial<HTMLProps>) => ReturnType;
    };
  }
}

export const defaultHTMLProps: HTMLProps = {
  code: "<!-- Add your HTML code here -->",
};

export const HTML = Node.create({
  name: "customCode",
  group: "block",
  atom: true,
  selectable: false,

  onCreate() {
    generateNodeIds(this.editor, this.name);
  },

  addAttributes() {
    return {
      code: {
        default: defaultHTMLProps.code,
        parseHTML: (element) => element.getAttribute("data-code") || "",
        renderHTML: (attributes) => ({
          "data-code": attributes.code,
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
        tag: 'div[data-type="custom-code"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "custom-code",
      }),
      [
        "div",
        {
          innerHTML: HTMLAttributes.code || defaultHTMLProps.code,
        },
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(HTMLComponentNode);
  },

  addCommands() {
    return {
      setCustomCode:
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
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        const node = editor.state.doc.nodeAt(selection.$anchor.pos);

        if (node?.type.name === "customCode") {
          return true;
        }
        return false;
      },
      Delete: ({ editor }) => {
        const { selection } = editor.state;
        const node = editor.state.doc.nodeAt(selection.$anchor.pos);

        if (node?.type.name === "customCode") {
          return true;
        }
        return false;
      },
    };
  },
});
