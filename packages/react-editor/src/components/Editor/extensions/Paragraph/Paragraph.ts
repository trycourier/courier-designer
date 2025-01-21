// import { mergeAttributes } from "@tiptap/core";
import TiptapParagraph from "@tiptap/extension-paragraph";
// import { ReactNodeViewRenderer } from "@tiptap/react";
import type { ParagraphProps } from "./Paragraph.types";
// import { ParagraphComponentNode } from "./ParagraphComponent";

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

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        // Don't handle Enter if we're in a blockquote
        if (editor.isActive('blockquote')) {
          return false;
        }

        // Don't handle Enter if variable suggestion is active
        const isVariableSuggestionActive = editor.view.dom.querySelector('.variable-suggestion');
        if (isVariableSuggestionActive) {
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
        parseHTML: (element) => element.style.padding ? parseInt(element.style.padding) : defaultParagraphProps.padding,
        renderHTML: (attributes) => ({
          style: `padding: ${attributes.padding}px`,
        }),
      },
      textAlign: {
        default: defaultParagraphProps.textAlign,
        parseHTML: (element) => {
          console.log(element.style.textAlign)
          return element.style.textAlign || defaultParagraphProps.textAlign
        },
        renderHTML: (attributes) => ({
          style: `text-align: ${attributes.textAlign}`,
        }),
      },
      margin: {
        default: defaultParagraphProps.margin,
        parseHTML: (element) => element.style.margin ? parseInt(element.style.margin) : defaultParagraphProps.margin,
        renderHTML: (attributes) => ({
          style: `margin: ${attributes.margin}px 0px`,
        }),
      },
      backgroundColor: {
        default: defaultParagraphProps.backgroundColor,
        parseHTML: (element) => element.style.backgroundColor || defaultParagraphProps.backgroundColor,
        renderHTML: (attributes) => ({
          style: `background-color: ${attributes.backgroundColor}`,
        }),
      },
      borderWidth: {
        default: defaultParagraphProps.borderWidth,
        parseHTML: (element) => element.style.borderWidth ? parseInt(element.style.borderWidth) : defaultParagraphProps.borderWidth,
        renderHTML: (attributes) => ({
          style: `border-width: ${attributes.borderWidth}px`,
        }),
      },
      borderRadius: {
        default: defaultParagraphProps.borderRadius,
        parseHTML: (element) => element.style.borderRadius ? parseInt(element.style.borderRadius) : defaultParagraphProps.borderRadius,
        renderHTML: (attributes) => ({
          style: `border-radius: ${attributes.borderRadius}px`,
        }),
      },
      borderColor: {
        default: defaultParagraphProps.borderColor,
        parseHTML: (element) => element.style.borderColor || defaultParagraphProps.borderColor,
        renderHTML: (attributes) => ({
          style: `border-color: ${attributes.borderColor}`,
        }),
      },
      textColor: {
        default: defaultParagraphProps.textColor,
        parseHTML: (element) => element.style.color || defaultParagraphProps.textColor,
        renderHTML: (attributes) => ({
          style: `color: ${attributes.textColor}`,
        }),
      },
    };
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
