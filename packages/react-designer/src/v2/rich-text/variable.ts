import { InputRule, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { VariableChip } from "./VariableChip";
import type { VariableNodeOptions } from "./variable-types";

/**
 * Inline variable chip node for the v2 footer editor. Serializes to the footer
 * brace format `{id}` (single brace — matches the brand footer's persisted
 * shape and the old designer). Self-contained: options carry the known
 * variables + validation (no jotai / SDK store).
 */
export const Variable = Node.create<VariableNodeOptions>({
  name: "variable",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return { variables: {}, variableValidation: undefined };
  },

  addAttributes() {
    return {
      id: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-id") || "",
        renderHTML: (attrs) => ({ "data-id": attrs.id }),
      },
      isInvalid: {
        default: false,
        parseHTML: (el) => el.getAttribute("data-invalid") === "true",
        renderHTML: (attrs) => ({
          "data-invalid": attrs.isInvalid ? "true" : undefined,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-variable]",
        getAttrs: (el) => {
          const id = (el as HTMLElement).getAttribute("data-id");
          return id ? { id } : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    // Single-brace footer format.
    return ["span", { "data-variable": "", ...HTMLAttributes }, `{${node.attrs.id}}`];
  },

  renderText({ node }) {
    return `{${node.attrs.id}}`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(VariableChip);
  },

  addInputRules() {
    // Typing `{name}` becomes a chip once the closing brace is entered.
    return [
      new InputRule({
        find: /\{([^{}\s][^{}]*)\}$/,
        handler: ({ range, match, chain }) => {
          const id = match[1]?.trim();
          if (!id) return;
          chain()
            .deleteRange(range)
            .insertContent({ type: this.name, attrs: { id, isInvalid: false } })
            .run();
        },
      }),
    ];
  },
});
