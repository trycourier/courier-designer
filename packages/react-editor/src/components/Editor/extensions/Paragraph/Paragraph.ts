import TiptapParagraph from "@tiptap/extension-paragraph";
import { defaultTextBlockProps } from "../TextBlock/TextBlock.types";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paragraph: {
      setParagraph: () => ReturnType;
    };
    textAlign: {
      setTextAlign: (alignment: string) => ReturnType;
      unsetTextAlign: () => ReturnType;
    };
  }
}

export const Paragraph = TiptapParagraph.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {
        class: '',
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
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
      ...this.parent?.(),
      padding: {
        default: defaultTextBlockProps.padding,
        parseHTML: (element) => element.style.padding ? parseInt(element.style.padding) : defaultTextBlockProps.padding,
        renderHTML: (attributes) => ({
          style: `padding: ${attributes.padding}px`,
        }),
      },
      textAlign: {
        default: defaultTextBlockProps.textAlign,
        parseHTML: (element) => element.style.textAlign || defaultTextBlockProps.textAlign,
        renderHTML: (attributes) => ({
          style: `text-align: ${attributes.textAlign}`,
        }),
      },
      margin: {
        default: defaultTextBlockProps.margin,
        parseHTML: (element) => element.style.margin ? parseInt(element.style.margin) : defaultTextBlockProps.margin,
        renderHTML: (attributes) => ({
          style: `margin: ${attributes.margin}px 0px`,
        }),
      },
      backgroundColor: {
        default: defaultTextBlockProps.backgroundColor,
        parseHTML: (element) => element.style.backgroundColor || defaultTextBlockProps.backgroundColor,
        renderHTML: (attributes) => ({
          style: `background-color: ${attributes.backgroundColor}`,
        }),
      },
      borderWidth: {
        default: defaultTextBlockProps.borderWidth,
        parseHTML: (element) => element.style.borderWidth ? parseInt(element.style.borderWidth) : defaultTextBlockProps.borderWidth,
        renderHTML: (attributes) => ({
          style: `border-width: ${attributes.borderWidth}px`,
        }),
      },
      borderRadius: {
        default: defaultTextBlockProps.borderRadius,
        parseHTML: (element) => element.style.borderRadius ? parseInt(element.style.borderRadius) : defaultTextBlockProps.borderRadius,
        renderHTML: (attributes) => ({
          style: `border-radius: ${attributes.borderRadius}px`,
        }),
      },
      borderColor: {
        default: defaultTextBlockProps.borderColor,
        parseHTML: (element) => element.style.borderColor || defaultTextBlockProps.borderColor,
        renderHTML: (attributes) => ({
          style: `border-color: ${attributes.borderColor}`,
        }),
      },
      textColor: {
        default: defaultTextBlockProps.textColor,
        parseHTML: (element) => element.style.color || defaultTextBlockProps.textColor,
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
              .updateAttributes(this.name, defaultTextBlockProps)
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
