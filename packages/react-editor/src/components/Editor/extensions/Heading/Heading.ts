import { mergeAttributes } from '@tiptap/core'
import TiptapHeading from '@tiptap/extension-heading'
import type { Level } from '@tiptap/extension-heading'
import { defaultTextBlockProps, TextBlockComponentNode } from "../TextBlock";
import { ReactNodeViewRenderer } from '@tiptap/react';
import { generateNodeIds } from "../../utils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    heading: {
      setHeading: (attributes: { level: Level }) => ReturnType;
      toggleHeading: (attributes: { level: Level }) => ReturnType;
    };
    textAlign: {
      setTextAlign: (alignment: string) => ReturnType;
      unsetTextAlign: () => ReturnType;
    };
  }
}

export const Heading = TiptapHeading.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {
        class: '',
      },
    };
  },
  onCreate() {
    generateNodeIds(this.editor, this.name);
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      paddingVertical: {
        default: defaultTextBlockProps.paddingVertical,
        parseHTML: (element) => element.style.paddingTop ? parseInt(element.style.paddingTop) : defaultTextBlockProps.paddingVertical,
        renderHTML: (attributes) => ({
          style: `padding-top: ${attributes.paddingVertical}px; padding-bottom: ${attributes.paddingVertical}px;`,
        }),
      },
      paddingHorizontal: {
        default: defaultTextBlockProps.paddingHorizontal,
        parseHTML: (element) => element.style.paddingLeft ? parseInt(element.style.paddingLeft) : defaultTextBlockProps.paddingHorizontal,
        renderHTML: (attributes) => ({
          style: `padding-left: ${attributes.paddingHorizontal}px; padding-right: ${attributes.paddingHorizontal}px;`,
        }),
      },
      textAlign: {
        default: defaultTextBlockProps.textAlign,
        parseHTML: (element) => element.style.textAlign || defaultTextBlockProps.textAlign,
        renderHTML: (attributes) => ({
          style: `text-align: ${attributes.textAlign}`,
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
      id: {
        default: () => null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => ({
          "data-id": attributes.id,
        }),
      },
    }
  },

  addCommands() {
    return {
      // setHeading: (attributes) => ({ chain }) => {
      //   return chain()
      //     .setHeading(attributes)
      //     .updateAttributes(this.name, {
      //       ...defaultTextBlockProps,
      //       id: `node-${uuidv4()}`
      //     })
      //     .run()
      // },
      setTextAlign: (alignment) => ({ chain }) => {
        return chain()
          .updateAttributes(this.name, { textAlign: alignment })
          .run()
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="heading"]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const nodeLevel = parseInt(node.attrs.level, 10) as Level
    const hasLevel = this.options.levels.includes(nodeLevel)
    const level = hasLevel ? nodeLevel : this.options.levels[0]

    return [`h${level}`, mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(TextBlockComponentNode);
  },
})

export default Heading
