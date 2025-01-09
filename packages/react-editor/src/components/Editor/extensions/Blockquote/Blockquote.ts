import { Blockquote as TiptapBlockquote } from '@tiptap/extension-blockquote'
import { mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { BlockquoteComponentNode } from './BlockquoteComponent'
import { BlockquoteProps } from './Blockquote.types'

export const defaultBlockquoteProps: BlockquoteProps = {
  padding: 8,
  margin: 6,
  backgroundColor: "transparent",
  borderLeftWidth: 4,
  borderColor: "#e0e0e0",
};

export const Blockquote = TiptapBlockquote.extend({
  addAttributes() {
    return {
      padding: {
        default: defaultBlockquoteProps.padding,
        parseHTML: (element) => element.getAttribute("data-padding"),
        renderHTML: (attributes) => ({
          "data-padding": attributes.padding,
        }),
      },
      margin: {
        default: defaultBlockquoteProps.margin,
        parseHTML: (element) => element.getAttribute("data-margin"),
        renderHTML: (attributes) => ({
          "data-margin": attributes.margin,
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
    return [{ tag: 'blockquote' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['blockquote', mergeAttributes(HTMLAttributes), 0]
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { selection } = editor.state
        const { empty } = selection

        if (!empty) return false

        const isInBlockquote = editor.isActive('blockquote')
        const isInParagraph = editor.isActive('paragraph')

        if (!isInParagraph || !isInBlockquote) return false

        return editor
          .chain()
          .command(({ tr }) => {
            tr.split(selection.from)
            const pos = tr.selection.from
            const $pos = tr.doc.resolve(pos)
            if ($pos.depth > 1) {
              const range = $pos.blockRange()
              if (range) {
                tr.lift(range, 0)
              }
            }
            return true
          })
          .focus()
          .run()
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(BlockquoteComponentNode)
  },
})

export default Blockquote 