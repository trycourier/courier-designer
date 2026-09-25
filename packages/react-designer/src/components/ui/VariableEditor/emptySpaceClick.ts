import { TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { resolveEmptySpaceClick } from "./VariableInput";

/**
 * A `handleClick` that puts the caret at the end when the click lands in the
 * empty space of a one-line editor.
 *
 * Chips are selectable, so without this a click past a trailing chip selects
 * the chip and the next character typed replaces it — which is what the
 * sidebar's Label field did.
 *
 * `near` is injectable so the decision can be tested without a real view.
 */
export function emptySpaceClickHandler({
  near = TextSelection.near,
}: { near?: typeof TextSelection.near } = {}) {
  return (view: EditorView, pos: number, event: MouseEvent): boolean => {
    const { state } = view;
    const { doc } = state;
    const paragraph = doc.firstChild;
    if (!paragraph) return false;

    const $pos = doc.resolve(pos);
    const paragraphEnd = 1 + paragraph.content.size;

    let endCoordsRight: number | null = null;
    try {
      endCoordsRight = view.coordsAtPos(paragraphEnd).right;
    } catch {
      // coordsAtPos can throw for edge-case positions
    }

    const result = resolveEmptySpaceClick(
      $pos.depth,
      pos,
      paragraph.content.size,
      event.clientX,
      endCoordsRight
    );
    if (!result) return false;

    view.dispatch(state.tr.setSelection(near(doc.resolve(result.targetPos), result.bias)));
    // Force DOM selection re-sync (dispatch is a no-op if the selection was already here)
    view.focus();
    return true;
  };
}
