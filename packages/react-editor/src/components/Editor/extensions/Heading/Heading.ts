import { mergeAttributes } from '@tiptap/core'
import TiptapHeading from '@tiptap/extension-heading'
import type { Level } from '@tiptap/extension-heading'
import { defaultTextBlockProps, TextBlockComponentNode } from "../TextBlock";
import { ReactNodeViewRenderer } from '@tiptap/react';
import { v4 as uuidv4 } from 'uuid';

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
    const id = `node-${uuidv4()}`
    this.editor.commands.updateAttributes(this.name, {
      id: id
    });
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
