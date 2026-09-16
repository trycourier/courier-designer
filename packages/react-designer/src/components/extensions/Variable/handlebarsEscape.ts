import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

/**
 * Characters that can only begin a handlebars block, partial or comment — never
 * a variable path.
 */
const SIGILS = new Set(["#", "/", "^", ">", "!"]);

/** How far back to look for the chip that opened the expression. */
const MAX_LOOKBACK = 200;

/**
 * Undo the `{{` input rule when the author turns out to be writing an
 * expression rather than a variable.
 *
 * Typing `{{` swallows the braces and inserts an empty variable chip. That is
 * right for `{{data.name}}`, but the following characters land in the document
 * *after* the chip, so for `{{#if x}}` the chip stays empty, gets dropped on
 * blur, and the author is left with `#if x}}` — the braces are gone and the
 * template silently stops being a conditional. This puts the literal `{{` back
 * as soon as we can tell the difference.
 */
export const handlebarsEscapePluginKey = new PluginKey("handlebarsEscape");

/** Find an empty variable node just before `pos`, with only plain text between. */
function findOpenChip(view: EditorView, pos: number): { from: number; between: string } | null {
  const $pos = view.state.doc.resolve(pos);
  const parent = $pos.parent;
  if (!parent.isTextblock) return null;

  const parentStart = $pos.start();
  let between = "";

  for (let offset = $pos.parentOffset; offset > 0; ) {
    const $at = view.state.doc.resolve(parentStart + offset);
    const node = $at.nodeBefore;
    if (!node) return null;

    if (node.type.name === "variable") {
      if (node.attrs?.id !== "") return null;
      return { from: parentStart + offset - node.nodeSize, between };
    }

    if (!node.isText) return null;

    const text = node.text ?? "";
    between = text + between;
    if (between.length > MAX_LOOKBACK) return null;
    offset -= node.nodeSize;
  }

  return null;
}

export function handlebarsEscapePlugin(): Plugin {
  return new Plugin({
    key: handlebarsEscapePluginKey,
    props: {
      handleTextInput(view, from, to, text) {
        const { state } = view;

        // A sigil typed straight into a fresh, still-empty chip: this is a
        // block/partial/comment, so restore the literal braces immediately.
        if (SIGILS.has(text)) {
          const $from = state.doc.resolve(from);
          const before = $from.nodeBefore;
          if (before?.type.name === "variable" && before.attrs?.id === "") {
            const tr = state.tr.replaceWith(
              from - before.nodeSize,
              to,
              state.schema.text(`{{${text}`)
            );
            view.dispatch(tr);
            return true;
          }
          return false;
        }

        // Completing a `}}` while a chip is still hanging open (`{{else}}`,
        // `{{/if}}` and anything else with no sigil): fold the chip and the text
        // after it back into one literal expression.
        if (text === "}") {
          const $from = state.doc.resolve(from);
          const textBefore = $from.parent.textBetween(
            Math.max(0, $from.parentOffset - 1),
            $from.parentOffset,
            undefined,
            "￼"
          );
          if (textBefore !== "}") return false;

          const open = findOpenChip(view, from);
          if (!open) return false;

          // `between` still carries the first `}` of the pair.
          const body = open.between.slice(0, -1);
          const tr = state.tr.replaceWith(open.from, to, state.schema.text(`{{${body}}}`));
          view.dispatch(tr);
          return true;
        }

        return false;
      },
    },
  });
}
