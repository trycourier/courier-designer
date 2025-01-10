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

              // Set the selection to the full link range
              const tr = state.tr.setSelection(TextSelection.create(doc, startPos, endPos + 1));
              view.dispatch(tr);

              // Show the link form
              const showFormTr = view.state.tr.setMeta('showLinkForm', {
                from: startPos,
                to: endPos + 1
              });
              view.dispatch(showFormTr);

              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});

export default Link;
