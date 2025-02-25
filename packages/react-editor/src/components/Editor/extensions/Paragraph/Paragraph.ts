import { mergeAttributes } from "@tiptap/core";
import TiptapParagraph from "@tiptap/extension-paragraph";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { defaultTextBlockProps, TextBlockComponentNode } from "../TextBlock";
import { v4 as uuidv4 } from 'uuid';
import { TextSelection } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';

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
        class: '',
      },
    };
  },

  onCreate() {
    const id = `node-${uuidv4()}`
    this.editor.commands.updateAttributes(this.name, {
      id: id
    });
  },

  addAttributes() {
    return {
      paddingVertical: {
        default: defaultTextBlockProps.paddingVertical,
        parseHTML: (element) => element.style.paddingTop ? parseInt(element.style.paddingTop) : defaultTextBlockProps.paddingVertical,
        renderHTML: (attributes) => ({
          "data-padding-vertical": attributes.paddingVertical,
        }),
      },
      paddingHorizontal: {
        default: defaultTextBlockProps.paddingHorizontal,
        parseHTML: (element) => element.style.paddingLeft ? parseInt(element.style.paddingLeft) : defaultTextBlockProps.paddingHorizontal,
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
        parseHTML: (element) => element.style.backgroundColor || defaultTextBlockProps.backgroundColor,
        renderHTML: (attributes) => ({
          "data-background-color": attributes.backgroundColor,
        }),
      },
      borderWidth: {
        default: defaultTextBlockProps.borderWidth,
        parseHTML: (element) => element.style.borderWidth ? parseInt(element.style.borderWidth) : defaultTextBlockProps.borderWidth,
        renderHTML: (attributes) => ({
          "data-border-width": attributes.borderWidth,
        }),
      },
      borderRadius: {
        default: defaultTextBlockProps.borderRadius,
        parseHTML: (element) => element.style.borderRadius ? parseInt(element.style.borderRadius) : defaultTextBlockProps.borderRadius,
        renderHTML: (attributes) => ({
          "data-border-radius": attributes.borderRadius,
        }),
      },
      borderColor: {
        default: defaultTextBlockProps.borderColor,
        parseHTML: (element) => element.style.borderColor || defaultTextBlockProps.borderColor,
        renderHTML: (attributes) => ({
          "data-border-color": attributes.borderColor,
        }),
      },
      textColor: {
        default: defaultTextBlockProps.textColor,
        parseHTML: (element) => element.style.color || defaultTextBlockProps.textColor,
        renderHTML: (attributes) => ({
          "data-text-color": attributes.textColor,
        }),
      },
      id: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => ({
          "data-id": attributes.id,
        }),
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
        'Mod-a': ({ selection, tr }) => {
          // Let the default Cmd+A behavior work first
          document.execCommand('selectAll');

          // Then check if we need to constrain the selection to the current node
          const { $from } = selection;
          let depth = $from.depth;
          let currentNode = null;

          // Find the current paragraph or heading node
          while (depth > 0) {
            const node = $from.node(depth);
            if (node.type.name === 'paragraph' || node.type.name === 'heading') {
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
    ];
  },

  addKeyboardShortcuts() {
    // Helper function to handle both Backspace and Delete
    const handleDeletion = (editor: any, isBackspace = true) => {
      const { empty, $anchor, $head } = editor.state.selection;

      // Find the current paragraph or heading node
      let depth = $anchor.depth;
      let currentNode = null;

      // Traverse up the tree to find the closest paragraph or heading
      while (depth > 0) {
        const node = $anchor.node(depth);
        if (node.type.name === 'paragraph' || node.type.name === 'heading') {
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

      if (isAtBoundary || isEmpty) {
        return true; // Prevent deletion
      }

      // Handle selection deletion
      if (!empty) {
        editor.commands.command(({ tr, dispatch }: { tr: any, dispatch: any }) => {
          if (dispatch) {
            tr.insertText('', editor.state.selection.from, editor.state.selection.to);
            return true;
          }
          return false;
        });
        return true;
      }

      // Let Tiptap handle other cases
      return false;
    };

    return {
      Enter: ({ editor }) => {
        // Don't handle Enter if variable suggestion is active
        const isVariableSuggestionActive = editor.view.dom.querySelector('.variable-suggestion');
        if (isVariableSuggestionActive) {
          return false;
        }

        if (editor.view.state.selection.$from.node().type.spec.code) {
          return false;
        }

        const { state, dispatch } = editor.view;
        const { tr } = state;

        // Insert a line break instead of a new paragraph
        tr.replaceSelectionWith(state.schema.nodes.hardBreak.create())
          .scrollIntoView();
        dispatch(tr);
        return true;
      },
      'Mod-a': ({ editor }) => {
        const { $from } = editor.state.selection;
        let depth = $from.depth;

        // Find the current paragraph or heading node
        while (depth > 0) {
          const node = $from.node(depth);
          if (node.type.name === 'paragraph' || node.type.name === 'heading') {
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
      Tab: () => true, // Prevent default tab behavior
      'Shift-Tab': () => true, // Prevent default shift+tab behavior
    };
  },

  addCommands() {
    return {
      // setParagraph:
      //   () =>
      //     ({ chain }) => {
      //       return chain()
      //         .setParagraph()
      //         .updateAttributes(this.name, {
      //           ...defaultTextBlockProps,
      //           id: `node-${uuidv4()}`
      //         })
      //         .run();
      //     },
      setTextAlign:
        (alignment) =>
          ({ chain }) => {
            return chain()
              .updateAttributes(this.name, { textAlign: alignment })
              .run();
          },
    };
  },
});

export default Paragraph;
