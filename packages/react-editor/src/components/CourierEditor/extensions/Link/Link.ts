import { getMarkRange, mergeAttributes } from "@tiptap/core";
import TiptapLink from "@tiptap/extension-link";
import { Plugin, TextSelection } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";

export const Link = TiptapLink.extend({
  inclusive: true,

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
            if (event.button !== 0) return false;

            const { state } = view;
            const { doc } = state;
            const $pos = doc.resolve(pos);

            // Try to find link mark at current position or adjacent positions
            let linkMark = $pos.marks().find(mark => mark.type.name === 'link');

            if (!linkMark) {
              // Check one position before
              if (pos > 0) {
                const before = doc.resolve(pos - 1);
                linkMark = before.marks().find(mark => mark.type.name === 'link');
              }
            }

            if (!linkMark) {
              // Check one position after
              if (pos < doc.content.size) {
                const after = doc.resolve(pos + 1);
                linkMark = after.marks().find(mark => mark.type.name === 'link');
              }
            }

            if (linkMark) {
              // First try to get the mark range
              const range = getMarkRange($pos, linkMark.type);

              // If range exists, use it
              if (range) {
                view.dispatch(state.tr.setSelection(
                  TextSelection.create(doc, range.from, range.to)
                ));

                view.dispatch(view.state.tr.setMeta('showLinkForm', {
                  from: range.from,
                  to: range.to,
                  href: linkMark.attrs.href
                }));
                return true;
              }

              // Fallback for single character - use the position where we found the mark
              view.dispatch(state.tr.setSelection(
                TextSelection.create(doc, pos, pos + 1)
              ));

              view.dispatch(view.state.tr.setMeta('showLinkForm', {
                from: pos,
                to: pos + 1,
                href: linkMark.attrs.href
              }));
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