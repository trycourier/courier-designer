import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Node } from "@tiptap/pm/model";
export interface SelectionOptions {
  HTMLAttributes: Record<string, any>;
  setSelectedNode: (node: Node) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    selection: {
      updateSelectionState: (node: Node | null) => ReturnType;
    }
  }
}

export const SelectionPlugin = new PluginKey('selection');

export const Selection = Extension.create<SelectionOptions>({
  name: 'selection',

  addOptions() {
    return {
      HTMLAttributes: {},
      setSelectedNode: () => { },
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
      updateSelectionState: (node: Node | null) => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.doc.descendants((nodeItem, pos) => {
            // Only set attributes on block-level nodes that support attributes
            if (nodeItem.type.name !== 'text' && nodeItem.type.spec.attrs?.isSelected !== undefined) {
              if (nodeItem === node) {
                tr.setNodeAttribute(pos, 'isSelected', true);
              } else {
                tr.setNodeAttribute(pos, 'isSelected', false);
              }
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
          handleClick: (view, _, event) => {
            const { state } = view;

            const target = event.target as HTMLElement;
            const targetPos = view.posAtDOM(target, 0);
            const targetNode = state.doc.resolve(targetPos).node();

            if (targetNode && ['paragraph', 'heading', 'blockquote'].includes(targetNode.type.name)) {
              this.options.setSelectedNode(targetNode);
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
}); 