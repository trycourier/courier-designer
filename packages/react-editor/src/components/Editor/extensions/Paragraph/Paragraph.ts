import { mergeAttributes } from "@tiptap/core";
import TiptapParagraph from "@tiptap/extension-paragraph";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { ParagraphProps } from "./Paragraph.types";
import { ParagraphComponentNode } from "./ParagraphComponent";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paragraph: {
      setParagraph: () => ReturnType;
    };
    textAlign: {
      setTextAlign: (
        alignment: "left" | "center" | "right" | "justify"
      ) => ReturnType;
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
  textAlign: "left",
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
        // Check if there's a visible tippy popup with slash-command or variable theme
        if (
          document.querySelector('.tippy-box[data-theme="slash-command"]') ||
          document.querySelector(".tippy-box[data-theme='variable']")
        ) {
          return false;
        }

        const { state, dispatch } = this.editor.view;
        const { tr } = state;
        const { selection } = tr;

        tr.split(selection.from).setNodeMarkup(
          selection.from + 1,
          undefined,
          defaultProps
        );
        dispatch(tr);
        return true;
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
      textAlign: {
        default: "left",
        parseHTML: (element) =>
          element.getAttribute("style")?.match(/text-align:\s*(\w+)/)?.[1] ||
          "left",
        renderHTML: (attributes) => ({
          style: `text-align: ${attributes.textAlign}`,
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
      setTextAlign:
        (alignment) =>
        ({ chain }) => {
          return chain()
            .updateAttributes(this.name, { textAlign: alignment })
            .run();
        },
    };
  },
});

export default Paragraph;
