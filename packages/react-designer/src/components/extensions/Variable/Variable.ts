import { Extension, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { Suggestion } from "@tiptap/suggestion";
import { suggestion } from "./suggestion";
import type { VariableNodeOptions, VariableOptions } from "./Variable.types";
import { VariableView } from "./VariableView";

export const VariableNode = Node.create<VariableNodeOptions>({
  name: "variable",
  group: "inline",
  inline: true,
  selectable: false,
  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => {
          return {
            "data-id": attributes.id,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-variable]",
        getAttrs: (element) => {
          const id = (element as HTMLElement).getAttribute("data-id");
          return id ? { id } : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "span",
      {
        "data-variable": true,
        ...HTMLAttributes,
      },
      `{{${node.attrs.id}}}`,
    ];
  },

  renderText({ node }) {
    const result = `{{${node.attrs.id}}}`;
    return result;
  },

  addNodeView() {
    return ReactNodeViewRenderer(VariableView);
  },
});

export const Variable = Extension.create<VariableOptions>({
  name: "variableSuggestion",

  addOptions() {
    return {
      HTMLAttributes: {},
      suggestion: {
        char: "{{",
        ...suggestion,
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
