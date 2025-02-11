import { Extension } from '@tiptap/core'
import { v4 as uuidv4 } from 'uuid'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface UniqueIdOptions {
  types: string[]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    uniqueId: {
      setUniqueId: () => ReturnType
    }
  }
}

export const UniqueIdPluginKey = new PluginKey('uniqueId')

export const UniqueId = Extension.create<UniqueIdOptions>({
  name: 'uniqueId',

  addOptions() {
    return {
      types: ['node-paragraph', 'node-heading', 'node-button'],
    }
  },

  addProseMirrorPlugins() {
    const selectors = this.options.types.map(type => `.react-renderer.${type}`).join(',')

    return [
      new Plugin({
        key: UniqueIdPluginKey,
        view: (view) => {
          // Add IDs to existing elements
          view.dom.querySelectorAll(selectors).forEach(el => {
            if (el instanceof HTMLElement && !el.getAttribute('data-id')) {
              const id = `node-${uuidv4()}`
              el.setAttribute('data-id', id)
            }
          })

          return {
            update: (view) => {
              // Add IDs to any new elements
              view.dom.querySelectorAll(selectors).forEach(el => {
                if (el instanceof HTMLElement && !el.getAttribute('data-id')) {
                  const id = `node-${uuidv4()}`
                  el.setAttribute('data-id', id)
                }
              })
            }
          }
        }
      })
    ]
  },

  addCommands() {
    return {
      setUniqueId: () => ({ tr, state }) => {
        let hasChanged = false

        state.doc.descendants((node, pos) => {
          if (!node.attrs['data-id']) {
            tr.setNodeAttribute(pos, 'data-id', `node-${uuidv4()}`)
            hasChanged = true
          }
        })

        return hasChanged
      },
    }
  },
}) 