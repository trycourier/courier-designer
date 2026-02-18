import { mergeAttributes } from "@tiptap/core";
import { Blockquote as TiptapBlockquote } from "@tiptap/extension-blockquote";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { generateNodeIds } from "../../utils/generateNodeIds";
import type { BlockquoteProps } from "./Blockquote.types";
import { BlockquoteComponentNode } from "./BlockquoteComponent";

export const defaultBlockquoteProps: BlockquoteProps = {
  paddingHorizontal: 8,
  paddingVertical: 0,
  backgroundColor: "transparent",
  borderLeftWidth: 2,
  borderColor: "#e0e0e0",
};

/**
 * Text style applied to quote body content.
 * Matches styles.css blockquote color so editor and HTML preview match (darker gray than #696969).
 */
export const QUOTE_TEXT_STYLE = {
  color: "#525252",
  fontSize: "14px",
  lineHeight: "18px",
  fontStyle: "italic" as const,
} as const;

/**
 * Quote text style variants when text_style is h1/h2/subtext.
 * Values derived from styles.css (.ProseMirror h1/h2/h3): 1.4rem, 1.2rem, 1.1rem, line-height 1.1 (16px base).
 */
export const QUOTE_TEXT_STYLE_VARIANTS: Record<
  "h1" | "h2" | "subtext" | "quote",
  { fontSize: string; fontWeight: string; lineHeight: string }
> = {
  h1: { fontSize: "22.4px", fontWeight: "600", lineHeight: "25px" },
  h2: { fontSize: "19.2px", fontWeight: "600", lineHeight: "21px" },
  subtext: { fontSize: "17.6px", fontWeight: "600", lineHeight: "19px" },
  quote: { fontSize: "14px", fontWeight: "normal", lineHeight: "18px" },
};

export const Blockquote = TiptapBlockquote.extend({
  content: "block+",

  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {
        class: "",
      },
    };
  },

  onCreate() {
    generateNodeIds(this.editor, this.name);
  },

  addAttributes() {
    return {
      id: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => ({
          "data-id": attributes.id,
        }),
      },
      paddingHorizontal: {
        default: defaultBlockquoteProps.paddingHorizontal,
        parseHTML: (element) => element.getAttribute("data-padding-horizontal"),
        renderHTML: (attributes) => ({
          "data-padding-horizontal": attributes.paddingHorizontal,
        }),
      },
      paddingVertical: {
        default: defaultBlockquoteProps.paddingVertical,
        parseHTML: (element) => element.getAttribute("data-padding-vertical"),
        renderHTML: (attributes) => ({
          "data-padding-vertical": attributes.paddingVertical,
        }),
      },
      backgroundColor: {
        default: defaultBlockquoteProps.backgroundColor,
        parseHTML: (element) => element.getAttribute("data-background-color"),
        renderHTML: (attributes) => ({
          "data-background-color": attributes.backgroundColor,
        }),
      },
      borderLeftWidth: {
        default: defaultBlockquoteProps.borderLeftWidth,
        parseHTML: (element) => element.getAttribute("data-border-left-width"),
        renderHTML: (attributes) => ({
          "data-border-left-width": attributes.borderLeftWidth,
        }),
      },
      borderColor: {
        default: defaultBlockquoteProps.borderColor,
        parseHTML: (element) => element.getAttribute("data-border-color"),
        renderHTML: (attributes) => ({
          "data-border-color": attributes.borderColor,
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
    return [{ tag: "blockquote" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "blockquote",
      mergeAttributes(HTMLAttributes, {
        "data-type": "blockquote",
        "data-id": HTMLAttributes.id,
      }),
      0,
    ];
  },

  addKeyboardShortcuts() {
    return {
      // Block italic shortcut inside blockquote – text is already rendered
      // as italic visually, and the italic mark is not supported in Elemental
      // quote content on the backend.
      "Mod-i": ({ editor }) => editor.isActive("blockquote"),
      Enter: ({ editor }) => {
        const { selection } = editor.state;
        const { empty } = selection;

        if (!empty) return false;

        const isInBlockquote = editor.isActive("blockquote");
        const isInParagraph = editor.isActive("paragraph");

        if (!isInParagraph || !isInBlockquote) return false;

        return editor
          .chain()
          .command(({ tr }) => {
            tr.split(selection.from);
            const pos = tr.selection.from;
            const $pos = tr.doc.resolve(pos);
            if ($pos.depth > 1) {
              const range = $pos.blockRange();
              if (range) {
                tr.lift(range, 0);
              }
            }
            return true;
          })
          .focus()
          .run();
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(BlockquoteComponentNode);
  },
});

export default Blockquote;
