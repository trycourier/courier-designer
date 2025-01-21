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
        // Don't handle Enter if we're in a blockquote
        if (editor.isActive('blockquote')) {
          return false;
        }

        if (editor.view.state.selection.$from.node().type.spec.code) {
          return false;
        }

        const { state, dispatch } = editor.view;
        const { tr } = state;

        // Insert a line break instead of a new paragraph
        tr.replaceSelectionWith(state.schema.nodes.hardBreak.create())
          .scrollIntoView();
        dispatch(tr);
        return true;
      },
      Backspace: ({ editor }) => {
        const { empty, $anchor } = editor.state.selection;
        const isAtStart = $anchor.pos === 2;

        // If we're at the start of a paragraph
        if (empty && isAtStart) {
          editor
            .chain()
            .focus()
            .deleteRange({ from: 0, to: 2 })
            .run();
          // Prevent default behavior to maintain the empty paragraph
          return true;
        }

        // Let Tiptap handle other Backspace cases
        return false;
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
      contentDOMElementTag: "span"
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
