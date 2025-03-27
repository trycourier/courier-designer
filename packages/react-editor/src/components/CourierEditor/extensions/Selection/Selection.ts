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
        types: ['paragraph', 'heading', 'button', 'spacer', 'divider', 'imageBlock', 'blockquote'],
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

            if (!this.editor.isEditable) {
              return false;
            }


            // Handle click outside of text nodes that puts the caret in the nearest text node but doesn't select the node
            try {
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const caretElement = range.startContainer.parentElement;

                if (caretElement && (['P', 'H1', 'H2', 'H3', 'BLOCKQUOTE'].includes(caretElement.tagName) || ['P', 'H1', 'H2', 'H3', 'BLOCKQUOTE'].some(tag => caretElement.closest(tag)))) {
                  const caretPos = view.posAtDOM(caretElement, 0);
                  const $pos = state.doc.resolve(caretPos);

                  if ($pos.node(1)?.type.name === 'blockquote') {
                    this.options.setSelectedNode($pos.node(1));
                    return true;
                  }

                  const caretNode = $pos.node();
                  if (caretNode && ['paragraph', 'heading', 'blockquote'].includes(caretNode.type.name)) {
                    this.options.setSelectedNode(caretNode);
                    return true;
                  }
                }
              }
            } catch (error) {
              console.error('Error handling click:', error);
            }

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