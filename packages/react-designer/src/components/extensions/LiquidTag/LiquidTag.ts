import { Extension, InputRule, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { NodeSelection } from "prosemirror-state";
import { VARIABLE_ENTER_EDIT_META } from "../Variable/Variable.types";
import { LiquidTagView } from "./LiquidTagView";

export interface LiquidTagNodeOptions {
  HTMLAttributes?: Record<string, unknown>;
}

/**
 * Inline atom node for Liquid `{% ... %}` control-flow tags (if/for/assign/…).
 * The tag is stored verbatim as text on save; this node only gives it a distinct
 * visual chip in the editor. There is no validation — Liquid runs per field, so
 * structural correctness is the author's responsibility (and the renderer's).
 */
export const LiquidTagNode = Node.create<LiquidTagNodeOptions>({
  name: "liquidTag",
  group: "inline",
  inline: true,
  selectable: true,
  atom: true,
  // Above Paragraph (default 100) so Enter-to-edit beats the line-break handler,
  // matching the variable chip.
  priority: 1001,

  addAttributes() {
    return {
      content: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-content") || "",
        renderHTML: (attributes) => ({ "data-content": attributes.content }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-liquid-tag]",
        getAttrs: (element) => {
          const content = (element as HTMLElement).getAttribute("data-content");
          return content !== null ? { content } : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "span",
      { "data-liquid-tag": "true", ...HTMLAttributes },
      `{% ${node.attrs.content} %}`,
    ];
  },

  renderText({ node }) {
    return `{% ${node.attrs.content} %}`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(LiquidTagView);
  },

  addKeyboardShortcuts() {
    return {
      // Enter on a selected tag chip drops into edit mode (see VariableNode).
      Enter: () => {
        const { selection } = this.editor.state;
        if (
          this.editor.isEditable &&
          selection instanceof NodeSelection &&
          selection.node.type.name === this.name
        ) {
          const tr = this.editor.state.tr.setMeta(VARIABLE_ENTER_EDIT_META, selection.from);
          this.editor.view.dispatch(tr);
          return true;
        }
        return false;
      },
    };
  },
});

/**
 * Turns a typed `{%` into a Liquid tag chip. Disabled by default; enabled only
 * when the render engine is Liquid (synced from `VariableViewModeSync`).
 */
export const LiquidTagInputRule = Extension.create({
  name: "liquidTagInputRule",

  addStorage() {
    return {
      disabled: true,
    };
  },

  addInputRules() {
    const storage = this.storage;
    return [
      new InputRule({
        find: /\{%$/,
        handler: ({ range, chain }) => {
          if (storage.disabled) return;
          chain()
            .deleteRange(range)
            .insertContent([{ type: "liquidTag", attrs: { content: "" } }])
            .run();
        },
      }),
    ];
  },
});
