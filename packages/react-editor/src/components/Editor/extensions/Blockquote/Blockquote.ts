import { Blockquote as TiptapBlockquote } from '@tiptap/extension-blockquote'
import { mergeAttributes } from '@tiptap/core'

export const Blockquote = TiptapBlockquote.extend({
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { selection } = editor.state
        const { empty } = selection

        // Only handle empty selections (cursor)
        if (!empty) {
          return false
        }

        // Check if we're in a paragraph within a blockquote
        const isInBlockquote = editor.isActive('blockquote')
        const isInParagraph = editor.isActive('paragraph')

        if (!isInParagraph || !isInBlockquote) {
          return false
        }

        // Split the block and lift the new paragraph out of blockquote
        return editor
          .chain()
          .command(({ tr }) => {
            // Split the block at cursor position
            tr.split(selection.from)

            // Find the newly created paragraph
            const pos = tr.selection.from
            const $pos = tr.doc.resolve(pos)

            // If we're in a blockquote, lift the paragraph out
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

  parseHTML() {
    return [
      {
        tag: 'blockquote',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['blockquote', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },
})

export default Blockquote 