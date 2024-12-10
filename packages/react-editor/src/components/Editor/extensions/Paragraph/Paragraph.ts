import { mergeAttributes } from "@tiptap/core";
import TiptapParagraph from "@tiptap/extension-paragraph";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { ParagraphProps } from "./Paragraph.types";
import { ParagraphComponentNode } from "./ParagraphComponent";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paragraph: {
      /**
       * Set paragraph attributes
       */
      setParagraph: () => ReturnType;
    };
  }
}

const defaultProps: ParagraphProps = {
  padding: 0,
  margin: 0,
  backgroundColor: "#ffffff",
  borderWidth: 0,
  borderRadius: 0,
  borderColor: "#ffffff",
};

export const Paragraph = TiptapParagraph.extend({
  draggable: true,
  selectable: true,

  addOptions() {
    return {
      ...this.parent?.(),
      placeholder: "Press '/' for commands",
    };
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        return this.editor.commands.splitBlock();
      },
    };
  },

  addAttributes() {
    return {
      padding: {
        default: defaultProps.padding,
        parseHTML: (element) => element.getAttribute("data-padding"),
        renderHTML: (attributes) => ({
          "data-padding": attributes.padding,
        }),
      },
      margin: {
        default: defaultProps.margin,
        parseHTML: (element) => element.getAttribute("data-margin"),
        renderHTML: (attributes) => ({
          "data-margin": attributes.margin,
        }),
      },
      backgroundColor: {
        default: defaultProps.backgroundColor,
        parseHTML: (element) => element.getAttribute("data-background-color"),
        renderHTML: (attributes) => ({
          "data-background-color": attributes.backgroundColor,
        }),
      },
      borderWidth: {
        default: defaultProps.borderWidth,
        parseHTML: (element) => element.getAttribute("data-border-width"),
        renderHTML: (attributes) => ({
          "data-border-width": attributes.borderWidth,
        }),
      },
      borderRadius: {
        default: defaultProps.borderRadius,
        parseHTML: (element) => element.getAttribute("data-border-radius"),
        renderHTML: (attributes) => ({
          "data-border-radius": attributes.borderRadius,
        }),
      },
      borderColor: {
        default: defaultProps.borderColor,
        parseHTML: (element) => element.getAttribute("data-border-color"),
        renderHTML: (attributes) => ({
          "data-border-color": attributes.borderColor,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "p",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["p", mergeAttributes(HTMLAttributes), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ParagraphComponentNode, {
      contentDOMElementTag: "span",
    });
  },

  addCommands() {
    return {
      setParagraph:
        () =>
        ({ chain }) => {
          return chain()
            .setParagraph()
            .updateAttributes(this.name, defaultProps)
            .run();
        },
    };
  },
});

export default Paragraph;
