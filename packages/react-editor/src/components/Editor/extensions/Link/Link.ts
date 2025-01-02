import { mergeAttributes } from "@tiptap/core";
import TiptapLink from "@tiptap/extension-link";
import { Plugin, TextSelection } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";

export const Link = TiptapLink.extend({
  inclusive: false,

  parseHTML() {
    return [
      {
        tag: 'a[href]:not([data-type="button"]):not([href *= "javascript:" i])',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: "link cursor-pointer",
      }),
      0,
    ];
  },

  addProseMirrorPlugins() {
    const { editor } = this;

    return [
      ...(this.parent?.() || []),
      new Plugin({
        props: {
          handleClick: (view: EditorView, pos: number, event: MouseEvent) => {
            // Only handle left clicks
            if (event.button !== 0) return false;

            const { state } = view;
            const { doc } = state;
            const $pos = doc.resolve(pos);
            const node = $pos.parent;
            const linkMark = node.marks.find(mark => mark.type.name === 'link');

            if (linkMark) {
              // Find the full range of the link mark
              let startPos = pos;
              let endPos = pos;

              // Search backwards
              while (startPos > $pos.start()) {
                const mark = doc.resolve(startPos - 1).marks().find(m => m.type.name === 'link' && m.attrs.href === linkMark.attrs.href);
                if (!mark) break;
                startPos--;
              }

              // Search forwards
              while (endPos < $pos.end()) {
                const mark = doc.resolve(endPos + 1).marks().find(m => m.type.name === 'link' && m.attrs.href === linkMark.attrs.href);
                if (!mark) break;
                endPos++;
              }

              // Set the selection to the full link range and force a selection update
              const tr = state.tr
                .setSelection(TextSelection.create(doc, startPos, endPos + 1));
              view.dispatch(tr);

              // Force another selection update to ensure the link form shows
              editor.commands.setTextSelection({ from: startPos, to: endPos + 1 });

              return true;
            }

            return false;
          },
          handleKeyDown: (_: EditorView, event: KeyboardEvent) => {
            const { selection } = editor.state;

            if (event.key === "Escape" && selection.empty !== true) {
              editor.commands.focus(selection.to, { scrollIntoView: false });
            }

            return false;
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      ...this.parent?.(),
      toggleLink: (attributes) => ({ commands, chain }) => {
        if (attributes.href === '') {
          // When href is empty, just mark the text as a link and let the side panel handle editing
          return chain()
            .setMark(this.name, { href: 'https://' })
            .run();
        }
        return commands.toggleMark(this.name, attributes);
      },
    };
  },
});

export default Link;
