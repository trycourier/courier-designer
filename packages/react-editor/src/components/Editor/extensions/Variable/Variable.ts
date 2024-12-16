import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { VariableOptions, VariableNodeOptions } from "./Variable.types";
import { suggestion } from "./suggestion";
import { Node, mergeAttributes } from "@tiptap/core";

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
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        {
          "data-variable": "",
          class: "variable-node bg-blue-100 px-1 rounded",
        },
        this.options.HTMLAttributes ?? {},
        HTMLAttributes
      ),
      `{{${HTMLAttributes["data-id"]}}}`,
    ];
  },
});

export const Variable = Extension.create<VariableOptions>({
  name: "variable",

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
