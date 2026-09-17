import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { HandlebarsExpressionView } from "./HandlebarsExpressionView";

export interface HandlebarsExpressionOptions {
  HTMLAttributes?: Record<string, unknown>;
}

/**
 * A handlebars expression that is not a plain variable reference — a block
 * opener/closer, `{{else}}`, a helper call, a partial, a comment, or a
 * triple-stache.
 *
 * It stores the occurrence verbatim in `raw` and re-emits exactly that, so a
 * template authored through the API survives an editor open/save byte-for-byte.
 * Variables stay on the existing `variable` node; this covers everything the
 * editor cannot resolve to a value.
 */
export const HandlebarsExpressionNode = Node.create<HandlebarsExpressionOptions>({
  name: "handlebarsExpression",
  group: "inline",
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      raw: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-raw") || "",
        renderHTML: (attributes) => ({ "data-raw": attributes.raw }),
      },
      kind: {
        default: "helperCall",
        parseHTML: (element) => element.getAttribute("data-kind") || "helperCall",
        renderHTML: (attributes) => ({ "data-kind": attributes.kind }),
      },
      name: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-name") || "",
        renderHTML: (attributes) => ({ "data-name": attributes.name }),
      },
      /**
       * Set when the node is created from the helper autocomplete, so the chip
       * opens ready to type arguments instead of making the author double-click
       * the thing they just inserted. Cleared on first render; never persisted.
       */
      autoEdit: {
        default: false,
        parseHTML: () => false,
        renderHTML: () => ({}),
      },
      isInvalid: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-invalid") === "true",
        renderHTML: (attributes) => ({
          "data-invalid": attributes.isInvalid ? "true" : undefined,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-handlebars]",
        getAttrs: (element) => {
          const raw = (element as HTMLElement).getAttribute("data-raw");
          return raw ? { raw } : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return ["span", { "data-handlebars": true, ...HTMLAttributes }, node.attrs.raw || ""];
  },

  renderText({ node }) {
    return node.attrs.raw || "";
  },

  addNodeView() {
    return ReactNodeViewRenderer(HandlebarsExpressionView);
  },
});
