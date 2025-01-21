import { Editor, useEditorState } from '@tiptap/react'
import { ContentPickerOptions } from '../components/ContentTypePicker'

export const useTextmenuContentTypes = (editor: Editor) => {
  return useEditorState({
    editor,
    selector: (ctx): ContentPickerOptions => [
      {
        label: 'Normal text',
        onClick: () => {
          ctx.editor.chain()
            .focus()
            .setNode('paragraph')
            .run()
        },
        id: 'paragraph',
        disabled: () => !ctx.editor.can().setParagraph(),
        isActive: () => ctx.editor.isActive('paragraph') && !ctx.editor.isActive('heading'),
        type: 'option',
      },
      {
        label: 'Heading 1',
        onClick: () => {
          ctx.editor.chain()
            .focus()
            .setNode('heading', { level: 1 })
            .run()
        },
        id: 'heading1',
        disabled: () => !ctx.editor.can().setHeading({ level: 1 }),
        isActive: () => ctx.editor.isActive('heading', { level: 1 }),
        type: 'option',
      },
      {
        label: 'Heading 2',
        onClick: () => {
          ctx.editor.chain()
            .focus()
            .setNode('heading', { level: 2 })
            .run()
        },
        id: 'heading2',
        disabled: () => !ctx.editor.can().setHeading({ level: 2 }),
        isActive: () => ctx.editor.isActive('heading', { level: 2 }),
        type: 'option',
      },
      {
        label: 'Heading 3',
        onClick: () => {
          ctx.editor.chain()
            .focus()
            .setNode('heading', { level: 3 })
            .run()
        },
        id: 'heading3',
        disabled: () => !ctx.editor.can().setHeading({ level: 3 }),
        isActive: () => ctx.editor.isActive('heading', { level: 3 }),
        type: 'option',
      },
    ],
  })
}
