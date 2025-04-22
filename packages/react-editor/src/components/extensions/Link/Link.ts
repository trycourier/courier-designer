import { getMarkRange, mergeAttributes } from "@tiptap/core";
import TiptapLink from "@tiptap/extension-link";
import { Plugin, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

export const Link = TiptapLink.extend({
  inclusive: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      hasVariables: {
        default: false,
      },
      originalHref: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[href]:not([data-type="button"]):not([href *= "javascript:" i])',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // Check if this link has variables in its URL
    if (HTMLAttributes.hasVariables && HTMLAttributes.originalHref) {
      // Use the original href with the variable syntax intact
      HTMLAttributes.href = HTMLAttributes.originalHref;

      // Clean up attributes we don't want to render
      delete HTMLAttributes.hasVariables;
      delete HTMLAttributes.originalHref;
    } else if (HTMLAttributes.href) {
      // Restore variable placeholders in URLs if present
      const href = HTMLAttributes.href as string;
      if (href.includes("__VAR_")) {
        // Convert __VAR_name__ back to {{name}}
        HTMLAttributes.href = href.replace(/__VAR_([^_]+)__/g, "{{$1}}");
      }
    }

    return [
      "a",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: "link cursor-pointer",
      }),
      0,
    ];
  },

  addProseMirrorPlugins() {
    const plugins = [
      ...(this.parent?.() || []),
      new Plugin({
        props: {
          handleClick: (view: EditorView, pos: number, event: MouseEvent) => {
            if (event.button !== 0) return false;

            const { state } = view;
            const { doc } = state;
            const $pos = doc.resolve(pos);

            // Try to find link mark at current position or adjacent positions
            let linkMark = $pos.marks().find((mark) => mark.type.name === "link");

            if (!linkMark) {
              // Check one position before
              if (pos > 0) {
                const before = doc.resolve(pos - 1);
                linkMark = before.marks().find((mark) => mark.type.name === "link");
              }
            }

            if (!linkMark) {
              // Check one position after
              if (pos < doc.content.size) {
                const after = doc.resolve(pos + 1);
                linkMark = after.marks().find((mark) => mark.type.name === "link");
              }
            }

            if (linkMark) {
              // First try to get the mark range
              const range = getMarkRange($pos, linkMark.type);

              // If range exists, use it
              if (range) {
                view.dispatch(
                  state.tr.setSelection(TextSelection.create(doc, range.from, range.to))
                );

                view.dispatch(
                  view.state.tr.setMeta("showLinkForm", {
                    from: range.from,
                    to: range.to,
                    href: linkMark.attrs.originalHref || linkMark.attrs.href,
                  })
                );
                return true;
              }

              // Fallback for single character - use the position where we found the mark
              view.dispatch(state.tr.setSelection(TextSelection.create(doc, pos, pos + 1)));

              view.dispatch(
                view.state.tr.setMeta("showLinkForm", {
                  from: pos,
                  to: pos + 1,
                  href: linkMark.attrs.originalHref || linkMark.attrs.href,
                })
              );
              return true;
            }

            return false;
          },
        },
      }),
      // Add a plugin to detect and fix link URL variables
      new Plugin({
        appendTransaction(transactions, _, newState) {
          // Only proceed if there were actual changes
          if (!transactions.some((tr) => tr.docChanged)) return null;

          const tr = newState.tr;
          let modified = false;

          // Find all link marks with variable placeholders
          newState.doc.descendants((node, pos) => {
            // Check all marks on this node
            node.marks.forEach((mark) => {
              if (mark.type.name === "link" && mark.attrs.href) {
                const href = mark.attrs.href;

                // Check if href contains variable placeholders
                if (href.includes("__VAR_")) {
                  // Replace placeholder with actual variable syntax
                  const newHref = href.replace(/__VAR_([^_]+)__/g, "{{$1}}");

                  // If the href has changed, update the mark
                  if (newHref !== href) {
                    const range = getMarkRange(newState.doc.resolve(pos), mark.type);
                    if (range) {
                      tr.removeMark(range.from, range.to, mark.type);
                      tr.addMark(
                        range.from,
                        range.to,
                        mark.type.create({
                          ...mark.attrs,
                          href: newHref,
                          hasVariables: true,
                          originalHref: newHref,
                        })
                      );
                      modified = true;
                    }
                  }
                }
              }
            });

            return true;
          });

          return modified ? tr : null;
        },
      }),
    ];

    return plugins;
  },
});

export default Link;
