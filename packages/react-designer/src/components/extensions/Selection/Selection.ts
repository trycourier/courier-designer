import type { Node } from "@tiptap/pm/model";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export interface SelectionOptions {
  HTMLAttributes: Record<string, unknown>;
  setSelectedNode: (node: Node) => void;
  shouldHandleClick?: () => boolean;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    selection: {
      updateSelectionState: (node: Node | null) => ReturnType;
    };
  }
}

export const SelectionPlugin = new PluginKey("selection");

export const Selection = Extension.create<SelectionOptions>({
  name: "selection",

  addOptions() {
    return {
      HTMLAttributes: {},
      setSelectedNode: () => {},
      shouldHandleClick: () => true,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph",
          "heading",
          "button",
          "spacer",
          "divider",
          "imageBlock",
          "blockquote",
          "customCode",
          "column",
          "list",
        ],
        attributes: {
          isSelected: {
            default: false,
            parseHTML: () => false,
            renderHTML: (attributes) => {
              if (!attributes.isSelected) {
                return {};
              }

              return {
                class: "selected-element",
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      updateSelectionState:
        (node: Node | null) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            // Get the ID of the node to select (if it has one)
            const nodeId = node?.attrs?.id;
            const nodeType = node?.type?.name;

            tr.doc.descendants((nodeItem, pos) => {
              // Only set attributes on block-level nodes that support attributes
              if (
                nodeItem.type.name !== "text" &&
                nodeItem.type.spec.attrs?.isSelected !== undefined
              ) {
                let isMatch = false;

                if (nodeId) {
                  // Compare by ID and type if ID is available
                  isMatch = nodeItem.attrs?.id === nodeId && nodeItem.type.name === nodeType;
                } else if (nodeType) {
                  // For nodes without ID, compare by type and content similarity
                  // This handles cases like blockquote that might not have an ID yet
                  isMatch =
                    nodeItem.type.name === nodeType &&
                    nodeItem.content.size === node?.content?.size;
                }

                if (isMatch) {
                  tr.setNodeAttribute(pos, "isSelected", true);
                } else {
                  tr.setNodeAttribute(pos, "isSelected", false);
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

            // Skip if we should not handle clicks (e.g., during drag operations)
            if (this.options.shouldHandleClick && !this.options.shouldHandleClick()) {
              return false;
            }

            const target = event.target as HTMLElement;

            // Skip if clicking inside a blockquote - let BlockquoteComponent handle it
            if (target.closest(".node-blockquote")) {
              return false;
            }

            // Skip if clicking inside a list - let ListComponentNode handle it
            if (target.closest(".node-list")) {
              return false;
            }

            // Skip if clicking on or near a drag handle to prevent selection when starting drag
            if (
              target.closest('[data-cypress="draggable-handle"]') ||
              target.closest('button[class*="courier-cursor-grab"]')
            ) {
              return false;
            }

            // Handle click outside of text nodes that puts the caret in the nearest text node but doesn't select the node
            try {
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const caretElement = range.startContainer.parentElement;

                if (
                  caretElement &&
                  (["P", "H1", "H2", "H3"].includes(caretElement.tagName) ||
                    ["P", "H1", "H2", "H3"].some((tag) => caretElement.closest(tag)))
                ) {
                  const caretPos = view.posAtDOM(caretElement, 0);
                  const $pos = state.doc.resolve(caretPos);

                  const caretNode = $pos.node();
                  if (caretNode && ["paragraph", "heading"].includes(caretNode.type.name)) {
                    this.options.setSelectedNode(caretNode);
                    this.editor.commands.updateSelectionState(caretNode);
                    return true;
                  }
                }
              }
            } catch (error) {
              console.error("Error handling click:", error);
            }

            const targetPos = view.posAtDOM(target, 0);
            const targetNode = state.doc.resolve(targetPos).node();

            if (targetNode && ["paragraph", "heading"].includes(targetNode.type.name)) {
              this.options.setSelectedNode(targetNode);
              this.editor.commands.updateSelectionState(targetNode);
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});
