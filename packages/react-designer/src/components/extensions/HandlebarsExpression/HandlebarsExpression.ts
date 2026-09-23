import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { autoEditAttribute, CHIP_NODE_PRIORITY, enterOpensChip } from "../chipEditing";
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
  priority: CHIP_NODE_PRIORITY,
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
      autoEdit: autoEditAttribute,
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

  addKeyboardShortcuts() {
    return { Enter: enterOpensChip(this) };
  },

  addNodeView() {
    return ReactNodeViewRenderer(HandlebarsExpressionView);
  },
});
