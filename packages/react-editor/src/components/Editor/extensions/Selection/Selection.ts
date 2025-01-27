import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export interface SelectionOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    selection: {
      setSelectedNode: (pos: number) => ReturnType;
      clearSelectedNode: () => ReturnType;
    }
  }
}

export const SelectionPlugin = new PluginKey('selection');

export const Selection = Extension.create<SelectionOptions>({
  name: 'selection',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'button', 'divider', 'imageBlock', 'blockquote'],
        attributes: {
          isSelected: {
            default: false,
            parseHTML: () => false,
            renderHTML: attributes => {
              if (!attributes.isSelected) {
                return {};
              }

              return {
                class: 'selected-element',
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setSelectedNode: (pos: number) => ({ tr, dispatch }) => {
        if (dispatch) {
          // Clear previous selection
          tr.doc.descendants((node, nodePos) => {
            if (node.attrs.isSelected) {
              tr.setNodeAttribute(nodePos, 'isSelected', false);
            }
            return true;
          });

          // Set new selection
          const node = tr.doc.nodeAt(pos);
          if (node && ['paragraph', 'heading', 'button', 'divider', 'imageBlock', 'blockquote'].includes(node.type.name)) {
            tr.setNodeAttribute(pos, 'isSelected', true);
          }
        }
        return true;
      },
      clearSelectedNode: () => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.doc.descendants((node, pos) => {
            if (node.attrs.isSelected) {
              tr.setNodeAttribute(pos, 'isSelected', false);
            }
            return true;
          });
        }
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: SelectionPlugin,
        props: {
          // handleClick: (view, pos, event) => {
          handleClick: (view, pos) => {
            const { state } = view;
            const { tr } = state;
            const node = state.doc.nodeAt(pos);

            // console.log('handleClick', node, node?.type.name, event);
            // TODO: try to fix element selection here
            if (node && ['paragraph', 'heading', 'button', 'divider', 'imageBlock', 'blockquote'].includes(node.type.name)) {
              // Clear previous selection
              tr.doc.descendants((n, p) => {
                if (n.attrs.isSelected) {
                  tr.setNodeAttribute(p, 'isSelected', false);
                }
                return true;
              });

              // Set new selection
              tr.setNodeAttribute(pos, 'isSelected', true);
              view.dispatch(tr);
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
}); 