import type { Editor } from "@tiptap/core";
import TiptapParagraph from "@tiptap/extension-paragraph";
import { mergeAttributes, ReactNodeViewRenderer } from "@tiptap/react";
import type { Transaction } from "prosemirror-state";
import { TextSelection, NodeSelection, Plugin, PluginKey } from "prosemirror-state";
import { keymap } from "prosemirror-keymap";
import { generateNodeIds } from "../../utils";
import { defaultTextBlockProps, TextBlockComponentNode } from "../TextBlock";
import { v4 as uuidv4 } from "uuid";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paragraph: {
      setParagraph: () => ReturnType;
    };
    textAlign: {
      setTextAlign: (alignment: string) => ReturnType;
      unsetTextAlign: () => ReturnType;
    };
  }
}

export const Paragraph = TiptapParagraph.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {
        class: "",
      },
    };
  },

  onCreate() {
    generateNodeIds(this.editor, this.name);
  },

  // Add onTransaction hook to ensure all paragraphs have IDs
  onTransaction() {
    // Check all paragraph nodes and ensure they have IDs
    const tr = this.editor.state.tr;
    let needsUpdate = false;

    this.editor.state.doc.descendants((node, pos) => {
      if (node.type.name === this.name && !node.attrs.id) {
        const id = `node-${uuidv4()}`;
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, id });
        needsUpdate = true;
      }
      return true;
    });

    if (needsUpdate) {
      this.editor.view.dispatch(tr);
    }
  },

  addAttributes() {
    return {
      paddingVertical: {
        default: defaultTextBlockProps.paddingVertical,
        parseHTML: (element) =>
          element.style.paddingTop
            ? parseInt(element.style.paddingTop)
            : defaultTextBlockProps.paddingVertical,
        renderHTML: (attributes) => ({
          "data-padding-vertical": attributes.paddingVertical,
        }),
      },
      paddingHorizontal: {
        default: defaultTextBlockProps.paddingHorizontal,
        parseHTML: (element) =>
          element.style.paddingLeft
            ? parseInt(element.style.paddingLeft)
            : defaultTextBlockProps.paddingHorizontal,
        renderHTML: (attributes) => ({
          "data-padding-horizontal": attributes.paddingHorizontal,
        }),
      },
      textAlign: {
        default: defaultTextBlockProps.textAlign,
        parseHTML: (element) => element.style.textAlign || defaultTextBlockProps.textAlign,
        renderHTML: (attributes) => ({
          "data-text-align": attributes.textAlign,
        }),
      },
      backgroundColor: {
        default: defaultTextBlockProps.backgroundColor,
        parseHTML: (element) =>
          element.style.backgroundColor || defaultTextBlockProps.backgroundColor,
        renderHTML: (attributes) => ({
          "data-background-color": attributes.backgroundColor,
        }),
      },
      borderWidth: {
        default: defaultTextBlockProps.borderWidth,
        parseHTML: (element) =>
          element.style.borderWidth
            ? parseInt(element.style.borderWidth)
            : defaultTextBlockProps.borderWidth,
        renderHTML: (attributes) => ({
          "data-border-width": attributes.borderWidth,
        }),
      },
      borderColor: {
        default: defaultTextBlockProps.borderColor,
        parseHTML: (element) => element.style.borderColor || defaultTextBlockProps.borderColor,
        renderHTML: (attributes) => ({
          "data-border-color": attributes.borderColor,
        }),
      },
      id: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => ({
          "data-id": attributes.id,
        }),
      },
      locales: {
        default: undefined,
        parseHTML: () => undefined,
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="paragraph"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "paragraph",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TextBlockComponentNode);
  },

  addProseMirrorPlugins() {
    return [
      keymap({
        "Mod-a": ({ selection, tr }) => {
          // Let the default Cmd+A behavior work first
          document.execCommand("selectAll");

          // Then check if we need to constrain the selection to the current node
          const { $from } = selection;
          let depth = $from.depth;
          let currentNode = null;

          // Find the current paragraph or heading node
          while (depth > 0) {
            const node = $from.node(depth);
            if (node.type.name === "paragraph" || node.type.name === "heading") {
              currentNode = node;
              break;
            }
            depth--;
          }

          if (currentNode) {
            const start = $from.start(depth);
            const end = $from.end(depth);

            // Only modify selection if it's different from the node boundaries
            if (selection.from !== start || selection.to !== end) {
              tr.setSelection(TextSelection.create(tr.doc, start, end));
              return true;
            }
          }

          // Return false to allow default behavior if we didn't modify anything
          return false;
        },
      }),
      // Comprehensive deletion prevention plugin
      new Plugin({
        key: new PluginKey("preventElementDeletion"),
        props: {
          handleKeyDown: (view, event) => {
            // Catch all deletion key combinations - check both key and keyCode
            const isDeletionKey =
              event.key === "Delete" ||
              event.key === "Backspace" ||
              event.keyCode === 8 || // Backspace
              event.keyCode === 46 || // Delete
              event.code === "Delete" ||
              event.code === "Backspace";

            const hasModifier = event.metaKey || event.ctrlKey || event.altKey;

            if (isDeletionKey) {
              const { state } = view;
              const { selection } = state;
              const { $anchor } = selection;

              // Don't intercept deletion if inside a list item - let the List extension handle it
              for (let d = $anchor.depth; d >= 0; d--) {
                if ($anchor.node(d).type.name === "listItem") {
                  return false; // Let List extension handle deletion
                }
              }

              // Find the current paragraph or heading node
              let depth = $anchor.depth;
              let currentNode = null;

              while (depth > 0) {
                const node = $anchor.node(depth);
                if (node.type.name === "paragraph" || node.type.name === "heading") {
                  currentNode = node;
                  break;
                }
                depth--;
              }

              if (currentNode) {
                const textContent = currentNode.textContent;
                const isAtStart = $anchor.parentOffset === 0;
                const isAtEnd = $anchor.parentOffset === textContent.length;
                const isEmpty = textContent.length === 0;

                // Determine if this is a forward delete (Delete key) or backward delete (Backspace)
                const isForwardDelete =
                  event.key === "Delete" || event.keyCode === 46 || event.code === "Delete";

                // Check if there's a deletable node (like a variable) adjacent to cursor
                const nodeToDelete = isForwardDelete
                  ? selection.$from.nodeAfter
                  : selection.$from.nodeBefore;
                const hasAdjacentNode = nodeToDelete !== null && nodeToDelete !== undefined;

                // Allow deletion of adjacent nodes (variables, etc.) even if paragraph appears empty
                // When there's an adjacent node and the paragraph only contains that node (textContent is empty),
                // we should allow deletion of that node
                if (hasAdjacentNode && isEmpty) {
                  return false; // Allow default deletion behavior for adjacent nodes
                }

                // For any deletion at boundaries or with modifiers, prevent element deletion
                // Only block if there's NO adjacent node to delete
                if (
                  hasModifier ||
                  (isEmpty && !hasAdjacentNode) ||
                  (!isForwardDelete && isAtStart && !hasAdjacentNode) || // Backspace at start
                  (isForwardDelete && isAtEnd && !hasAdjacentNode) // Delete at end
                ) {
                  event.preventDefault();
                  event.stopPropagation();
                  return true;
                }
              }
            }

            return false;
          },
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    // Helper function to handle both Backspace and Delete
    const handleDeletion = (editor: Editor, isBackspace = true) => {
      // Allow deletion of selected nodes (e.g., variable chips selected via click)
      if (editor.state.selection instanceof NodeSelection) {
        return false;
      }

      const { empty, $anchor, $head } = editor.state.selection;

      // Don't handle deletion if inside a list item - let the List extension handle it
      for (let d = $anchor.depth; d >= 0; d--) {
        if ($anchor.node(d).type.name === "listItem") {
          return false; // Let List extension handle Backspace/Delete
        }
      }

      // Find the current paragraph or heading node
      let depth = $anchor.depth;
      let currentNode = null;

      // Traverse up the tree to find the closest paragraph or heading
      while (depth > 0) {
        const node = $anchor.node(depth);
        if (node.type.name === "paragraph" || node.type.name === "heading") {
          currentNode = node;
          break;
        }
        depth--;
      }

      if (!currentNode) {
        return false;
      }

      // For backspace, check if we're at the start; for delete, check if we're at the end
      const isAtBoundary = isBackspace
        ? $anchor.pos === $head.pos && $anchor.parentOffset === 0
        : $anchor.pos === $head.pos && $anchor.parentOffset === currentNode.textContent.length;

      const isEmpty = currentNode.textContent.length === 0;

      // Check if there's a deletable node (like a variable) adjacent to cursor
      const nodeToDelete = isBackspace
        ? editor.state.selection.$from.nodeBefore
        : editor.state.selection.$from.nodeAfter;
      const hasAdjacentNode = nodeToDelete !== null && nodeToDelete !== undefined;

      // Delete adjacent inline atom nodes (e.g., variable chips) directly with a single keypress
      if (empty && hasAdjacentNode && nodeToDelete.type.spec.atom) {
        const delPos = isBackspace ? $anchor.pos - nodeToDelete.nodeSize : $anchor.pos;
        editor
          .chain()
          .deleteRange({ from: delPos, to: delPos + nodeToDelete.nodeSize })
          .run();
        return true;
      }

      // Allow deletion of adjacent nodes even if paragraph appears empty
      if (hasAdjacentNode && isEmpty) {
        return false;
      }

      if ((isAtBoundary && !hasAdjacentNode) || (isEmpty && !hasAdjacentNode)) {
        return true; // Prevent deletion
      }

      // Handle selection deletion
      if (!empty) {
        editor.commands.command(
          ({
            tr,
            dispatch,
          }: {
            tr: Transaction;
            dispatch: ((tr: Transaction) => void) | undefined;
          }) => {
            if (dispatch) {
              tr.insertText("", editor.state.selection.from, editor.state.selection.to);
              return true;
            }
            return false;
          }
        );
        return true;
      }

      // Let Tiptap handle other cases
      return false;
    };

    return {
      Enter: ({ editor }) => {
        // Don't handle Enter if variable suggestion is active
        const isVariableSuggestionActive = editor.view.dom.querySelector(".variable-suggestion");
        if (isVariableSuggestionActive) {
          return false;
        }

        if (editor.view.state.selection.$from.node().type.spec.code) {
          return false;
        }

        // Don't handle Enter if inside a list item - let the List extension handle it
        const { $from } = editor.state.selection;
        for (let d = $from.depth; d >= 0; d--) {
          if ($from.node(d).type.name === "listItem") {
            return false; // Let List extension handle Enter
          }
        }

        const { state, dispatch } = editor.view;
        const { tr } = state;

        // Insert a line break instead of a new paragraph
        tr.replaceSelectionWith(state.schema.nodes.hardBreak.create()).scrollIntoView();
        dispatch(tr);
        return true;
      },
      "Mod-a": ({ editor }) => {
        const { $from } = editor.state.selection;
        let depth = $from.depth;

        // Find the current paragraph or heading node
        while (depth > 0) {
          const node = $from.node(depth);
          if (node.type.name === "paragraph" || node.type.name === "heading") {
            const start = $from.start(depth);
            const end = $from.end(depth);

            // Create a text selection for the entire node content
            editor.commands.setTextSelection({ from: start, to: end });
            return true;
          }
          depth--;
        }

        // If no paragraph found, let default behavior happen
        return false;
      },
      Backspace: ({ editor }) => {
        return handleDeletion(editor, true);
      },
      Delete: ({ editor }) => {
        return handleDeletion(editor, false);
      },
      // Tab: prevent default, but let List extension handle it for nested lists
      Tab: ({ editor }) => {
        // If inside a list item, let the List extension handle Tab for nesting
        if (editor.isActive("listItem")) return false;
        return true; // Prevent default tab behavior outside lists
      },
      // Shift-Tab: prevent default, but let List extension handle it for nested lists
      "Shift-Tab": ({ editor }) => {
        // If inside a list item, let the List extension handle Shift-Tab for outdenting
        if (editor.isActive("listItem")) return false;
        return true; // Prevent default shift+tab behavior outside lists
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setTextAlign:
        (alignment) =>
        ({ chain }) => {
          return chain().updateAttributes(this.name, { textAlign: alignment }).run();
        },
    };
  },
});

export default Paragraph;
