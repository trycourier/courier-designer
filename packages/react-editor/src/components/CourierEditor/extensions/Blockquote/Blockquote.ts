import { mergeAttributes } from "@tiptap/core";
import { Blockquote as TiptapBlockquote } from "@tiptap/extension-blockquote";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { generateNodeIds } from "../../utils/generateNodeIds";
import type { BlockquoteProps } from "./Blockquote.types";
import { BlockquoteComponentNode } from "./BlockquoteComponent";

export const defaultBlockquoteProps: BlockquoteProps = {
  paddingHorizontal: 8,
  paddingVertical: 6,
  backgroundColor: "transparent",
  borderLeftWidth: 4,
  borderColor: "#e0e0e0",
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
