import { Extension, getMarkRange, type Editor } from "@tiptap/core";
import type { MarkType } from "@tiptap/pm/model";
import type { EditorState } from "@tiptap/pm/state";

export interface AtomicLinksOptions {
  /** A link is atomic when its href includes any of these substrings.
   *  Deleting any part of such a link removes the whole link at once. */
  hrefIncludes: string[];
}

const SEPARATOR = /[\s|·•-]/;

function isProtectedHref(href: string, hrefIncludes: string[]): boolean {
  return hrefIncludes.some((token) => href.includes(token));
}

/** The contiguous range of a protected link mark covering `pos`, or null. */
function protectedLinkRangeAt(
  state: EditorState,
  pos: number,
  linkType: MarkType,
  hrefIncludes: string[]
): { from: number; to: number } | null {
  if (pos < 0 || pos > state.doc.content.size) return null;
  const $pos = state.doc.resolve(pos);
  const range = getMarkRange($pos, linkType);
  if (!range) return null;
  const node = state.doc.nodeAt(range.from);
  const mark = node?.marks.find((m) => m.type === linkType);
  const href = (mark?.attrs.href as string) ?? "";
  return isProtectedHref(href, hrefIncludes) ? range : null;
}

/** Grow a delete range to swallow one run of adjacent separator text (" | ")
 *  so removing an action link does not leave an orphan separator. Prefers the
 *  trailing side, then the leading side. Stays within the textblock. */
function expandOverSeparators(
  state: EditorState,
  from: number,
  to: number
): { from: number; to: number } {
  const $from = state.doc.resolve(from);
  const blockStart = $from.start();
  const blockEnd = $from.end();

  let newTo = to;
  while (newTo < blockEnd && SEPARATOR.test(state.doc.textBetween(newTo, newTo + 1))) {
    newTo += 1;
  }
  if (newTo > to) return { from, to: newTo };

  let newFrom = from;
  while (newFrom > blockStart && SEPARATOR.test(state.doc.textBetween(newFrom - 1, newFrom))) {
    newFrom -= 1;
  }
  return { from: newFrom, to };
}

/**
 * Makes selected links atomic on deletion: pressing Backspace/Delete adjacent
 * to or inside a protected link — or deleting a selection that overlaps one —
 * removes the ENTIRE link (and an adjacent separator) rather than a single
 * character. Downstream `onChange` then sees the link gone and the consumer
 * unchecks the matching toggle.
 */
export const AtomicLinks = Extension.create<AtomicLinksOptions>({
  name: "atomicLinks",

  addOptions() {
    return { hrefIncludes: [] };
  },

  addKeyboardShortcuts() {
    const { hrefIncludes } = this.options;

    const handleDelete =
      (direction: "backward" | "forward") =>
      ({ editor }: { editor: Editor }) => {
        if (!hrefIncludes.length) return false;
        const { state } = editor;
        const linkType = state.schema.marks.link;
        if (!linkType) return false;
        const { selection } = state;

        // Only the collapsed-cursor case is atomic: deleting a single
        // character adjacent to a protected link removes the whole link. An
        // explicit range selection is left to ProseMirror's default handling
        // (it deletes exactly what's selected); the resulting change still
        // trips the consumer's "link edited → uncheck toggle" logic.
        if (!selection.empty) return false;

        const probe = direction === "backward" ? selection.from - 1 : selection.from;
        const range = protectedLinkRangeAt(state, probe, linkType, hrefIncludes);
        if (!range) return false;
        const { from, to } = expandOverSeparators(state, range.from, range.to);
        return editor.chain().focus().deleteRange({ from, to }).run();
      };

    return {
      Backspace: handleDelete("backward"),
      Delete: handleDelete("forward"),
    };
  },
});
