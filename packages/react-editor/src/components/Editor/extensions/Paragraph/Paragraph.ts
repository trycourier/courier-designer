import { mergeAttributes } from "@tiptap/core";
import TiptapParagraph from "@tiptap/extension-paragraph";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { TextSelection } from "prosemirror-state";
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

export const defaultParagraphProps: ParagraphProps = {
  padding: 0,
  margin: 6,
  backgroundColor: "transparent",
  borderWidth: 0,
  borderRadius: 0,
  borderColor: "transparent",
  // TODO: find a way to get the text color from the theme
  textColor: "#292929",
  textAlign: "left",
};

export const Paragraph = TiptapParagraph.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      placeholder: "Press '/' for commands",
    };
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        // Check if there's a visible tippy popup with slash-command or variable theme
        if (
          document.querySelector('.tippy-box[data-theme="slash-command"]') ||
          document.querySelector(".tippy-box[data-theme='variable']")
        ) {
          return false;
        }

        // Don't handle Enter if we're in a blockquote
        if (editor.isActive('blockquote')) {
          return false;
        }

        const { state, dispatch } = editor.view;
        const { tr } = state;
        const { selection } = tr;
        const { $from } = selection;

        // Find the position after the current paragraph
        const pos = $from.after();

        // Insert a new empty paragraph at that position
        tr.insert(pos, state.schema.nodes.paragraph.create(defaultParagraphProps));

        // Move cursor to the new paragraph
        tr.setSelection(TextSelection.create(tr.doc, pos + 1));

        dispatch(tr);
        return true;
      },
      Tab: () => true, // Prevent default tab behavior
      'Shift-Tab': () => true, // Prevent default shift+tab behavior
    };
  },

  addAttributes() {
    return {
      padding: {
        default: defaultParagraphProps.padding,
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
        default: defaultParagraphProps.margin,
        parseHTML: (element) => element.getAttribute("data-margin"),
        renderHTML: (attributes) => ({
          "data-margin": attributes.margin,
        }),
      },
      backgroundColor: {
        default: defaultParagraphProps.backgroundColor,
        parseHTML: (element) => element.getAttribute("data-background-color"),
        renderHTML: (attributes) => ({
          "data-background-color": attributes.backgroundColor,
        }),
      },
      borderWidth: {
        default: defaultParagraphProps.borderWidth,
        parseHTML: (element) => element.getAttribute("data-border-width"),
        renderHTML: (attributes) => ({
          "data-border-width": attributes.borderWidth,
        }),
      },
      borderRadius: {
        default: defaultParagraphProps.borderRadius,
        parseHTML: (element) => element.getAttribute("data-border-radius"),
        renderHTML: (attributes) => ({
          "data-border-radius": attributes.borderRadius,
        }),
      },
      borderColor: {
        default: defaultParagraphProps.borderColor,
        parseHTML: (element) => element.getAttribute("data-border-color"),
        renderHTML: (attributes) => ({
          "data-border-color": attributes.borderColor,
        }),
      },
      textColor: {
        default: defaultParagraphProps.textColor,
        parseHTML: (element) => element.getAttribute("style")?.match(/color:\s*([^;]+)/)?.[1] || "inherit",
        renderHTML: (attributes) => ({
          style: `color: ${attributes.textColor}; text-align: ${attributes.textAlign}`,
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
              .updateAttributes(this.name, defaultParagraphProps)
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
