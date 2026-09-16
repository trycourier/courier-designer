import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { v4 as uuidv4 } from "uuid";
import { generateNodeIds } from "../../utils";
import { conditionalAttribute } from "../shared/conditionalAttribute";
import type { JsonnetProps } from "./Jsonnet.types";
import { JsonnetComponentNode } from "./JsonnetComponent";
import { defaultJsonnetTemplate } from "./templates";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    jsonnet: {
      setJsonnet: (props: Partial<JsonnetProps>) => ReturnType;
    };
  }
}

export const defaultJsonnetProps: JsonnetProps = {
  template: defaultJsonnetTemplate,
};

export const Jsonnet = Node.create({
  name: "jsonnet",
  group: "block",
  atom: true,
  selectable: false,

  onCreate() {
    generateNodeIds(this.editor, this.name);
  },

  addAttributes() {
    return {
      ...conditionalAttribute,
      template: {
        default: defaultJsonnetProps.template,
        parseHTML: (element) => element.getAttribute("data-template") || "",
        renderHTML: (attributes) => ({
          "data-template": attributes.template,
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
        tag: 'div[data-type="jsonnet"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "jsonnet",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(JsonnetComponentNode);
  },

  addCommands() {
    return {
      setJsonnet:
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
        return node?.type.name === "jsonnet";
      },
      Delete: ({ editor }) => {
        const { selection } = editor.state;
        const node = editor.state.doc.nodeAt(selection.$anchor.pos);
        return node?.type.name === "jsonnet";
      },
    };
  },
});
