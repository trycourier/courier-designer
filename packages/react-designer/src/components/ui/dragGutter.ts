/**
 * The strip to the left of a block where its drag handle sits.
 *
 * The handle is out here rather than over the content, but it cannot simply be
 * positioned outside the block's box: `draggable` and `dropTargetForElements`
 * are registered on the same element, and pragmatic-drag-and-drop resolves the
 * drop target from whatever is under the pointer. Grab a handle in the gutter and
 * drag straight down and the pointer stays in that column the whole way — over
 * *other* blocks, which do not extend into it and whose handles are not
 * rendered. `elementFromPoint` finds no `.draggable-item` there, so the target is
 * lost and the drop does nothing.
 *
 * So each block's box is widened leftward to cover the strip while its content
 * stays put: padding-left claims the space, an equal negative margin gives the
 * layout back. The hit area includes the gutter, the visible inset does not
 * change, and the handle sits at the padding box's left edge.
 *
 * Keep the two values equal — they are a matched pair, not two spacings.
 *
 * 48px = the handle's own 28px (`w-7`) plus a 20px gap to the content. That gap
 * is the one the layout had before the handle was moved: the row carried `pl-10`
 * (40px) with the handle at `left-[-8px]`, putting its right edge 20px short of
 * the content. It also clears the 12px the selection outline extends past the
 * content (`.node-element::before`) with 8px to spare, so a selected block's
 * outline never crowds the glyph.
 */
export const DRAG_GUTTER_WIDTH_PX = 48;

export const DRAG_GUTTER_CLASS = "courier-pl-[48px] courier-ml-[-48px]";
