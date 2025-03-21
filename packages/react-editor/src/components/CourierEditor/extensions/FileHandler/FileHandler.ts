import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Editor } from '@tiptap/core'

export interface FileHandlerOptions {
  allowedMimeTypes?: string[]
  onDrop?: (editor: Editor, files: File[], pos: number) => void
  onPaste?: (editor: Editor, files: File[]) => void
}

export const FileHandlerPlugin = new PluginKey('file-handler')

export const FileHandler = Extension.create<FileHandlerOptions>({
  name: 'fileHandler',

  addOptions() {
    return {
      allowedMimeTypes: [],
      onDrop: () => { },
      onPaste: () => { },
    }
  },

  addProseMirrorPlugins() {
    const { allowedMimeTypes, onDrop, onPaste } = this.options

    return [
      new Plugin({
        key: FileHandlerPlugin,
        props: {
          handleDrop: (view, event, _, moved) => {
            if (!event.dataTransfer?.files || moved) {
              return false
            }

            const { files } = event.dataTransfer
            const coordinates = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            })

            if (!coordinates) {
              return false
            }

            const filteredFiles = Array.from(files).filter((file) =>
              allowedMimeTypes?.includes(file.type)
            )

            if (filteredFiles.length === 0) {
              return false
            }

            event.preventDefault()

            if (onDrop) {
              onDrop(this.editor, filteredFiles, coordinates.pos)
            }

            return true
          },

          handlePaste: (_, event) => {
            if (!event.clipboardData?.files) {
              return false
            }

            const { files } = event.clipboardData
            const filteredFiles = Array.from(files).filter((file) =>
              allowedMimeTypes?.includes(file.type)
            )

            if (filteredFiles.length === 0) {
              return false
            }

            event.preventDefault()

            if (onPaste) {
              onPaste(this.editor, filteredFiles)
            }

            return true
          },
        },
      }),
    ]
  },
})

export default FileHandler 