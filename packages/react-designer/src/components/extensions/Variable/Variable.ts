import { Extension, InputRule, Node } from "@tiptap/core";
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
        default: "",
        parseHTML: (element) => element.getAttribute("data-id") || "",
        renderHTML: (attributes) => {
          return {
            "data-id": attributes.id,
          };
        },
      },
      isInvalid: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-invalid") === "true",
        renderHTML: (attributes) => {
          return {
            "data-invalid": attributes.isInvalid ? "true" : undefined,
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

/**
 * Extension that inserts an empty variable chip when user types {{
 * This is used when autocomplete is disabled (disableVariablesAutocomplete=true)
 */
export const VariableInputRule = Extension.create({
  name: "variableInputRule",

  addInputRules() {
    return [
      new InputRule({
        // Match {{ at any position
        find: /\{\{$/,
        handler: ({ range, chain }) => {
          chain()
            .deleteRange(range)
            .insertContent([{ type: "variable", attrs: { id: "", isInvalid: false } }])
            .run();
        },
      }),
    ];
  },
});

/**
 * Extension that provides variable autocomplete suggestions.
 * When user types {{, shows a dropdown with available variables.
 * Pass `variables` option to configure available variables.
 * Pass `disableSuggestions: true` to disable autocomplete (falls back to VariableInputRule behavior).
 */
export const Variable = Extension.create<VariableOptions>({
  name: "variableSuggestion",

  addOptions() {
    return {
      HTMLAttributes: {},
      suggestion: {
        char: "{{",
        ...suggestion,
      },
      variables: {},
      disableSuggestions: false,
    };
  },

  addProseMirrorPlugins() {
    if (this.options.disableSuggestions) {
      return [];
    }

    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

/**
 * @deprecated This extension has been removed. Variable conversion now happens via VariableInputRule or Variable.
 * This is a no-op extension provided for backwards compatibility and will be removed in a future major version.
 */
export const VariableTypeHandler = Extension.create({
  name: "variableTypeHandler",
});
