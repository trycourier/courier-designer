/**
 * Pure decision logic for how a drag should be routed when the cursor is over a
 * Column wrapper. A Column hosts two distinct drop systems that must never
 * overlap:
 *   1. Its cells accept drops INTO the column.
 *   2. The wrapper itself accepts drops BEFORE/AFTER the whole column.
 *
 * To avoid the ambiguity that previously let a drop land before a column while
 * a cell looked targeted, the column body always routes to the cells. A
 * before/after-column drop is only offered where there is a genuine reason to
 * drop next to the column:
 *   - the column is the FIRST/LAST top-level block (drop at the very start/end
 *     of the document), or
 *   - the adjacent top-level block is ALSO a column (so a block can be inserted
 *     in the gap between two stacked columns).
 *
 * This is extracted as a pure function so the branching can be unit-tested
 * without a live editor / DOM.
 */

export interface ColumnCellBand {
  /** Top edge (clientY) of the topmost cell. */
  top: number;
  /** Bottom edge (clientY) of the bottommost cell. */
  bottom: number;
}

export interface ResolveColumnDropZoneArgs {
  /** Whether the column is a direct child of the document (top level). */
  isRootColumn: boolean;
  /** Index of the column among its siblings. */
  columnIndex: number;
  /** Number of siblings in the column's parent. */
  siblingCount: number;
  /** Whether the previous sibling is also a column. */
  prevIsColumn: boolean;
  /** Whether the next sibling is also a column. */
  nextIsColumn: boolean;
  /** Current cursor Y (clientY). */
  mouseY: number;
  /** Measured vertical band covered by the column's cells, if known. */
  cellBand: ColumnCellBand | null;
}

export type ColumnDropZone =
  /** Drop before the whole column (top edge). */
  | "before"
  /** Drop after the whole column (bottom edge). */
  | "after"
  /** Let the cell drop targets own the drop (no column indicator). */
  | "into-cells"
  /** Cell band not measured yet — caller should fall back to generic logic. */
  | "fallthrough";

/** Returns whether the top/bottom before-after strips should be offered. */
export const columnStripsAllowed = ({
  isRootColumn,
  columnIndex,
  siblingCount,
  prevIsColumn,
  nextIsColumn,
}: Pick<
  ResolveColumnDropZoneArgs,
  "isRootColumn" | "columnIndex" | "siblingCount" | "prevIsColumn" | "nextIsColumn"
>): { allowTopStrip: boolean; allowBottomStrip: boolean } => {
  const allowTopStrip = isRootColumn && (columnIndex === 0 || prevIsColumn);
  const allowBottomStrip = isRootColumn && (columnIndex === siblingCount - 1 || nextIsColumn);
  return { allowTopStrip, allowBottomStrip };
};

export const resolveColumnDropZone = (args: ResolveColumnDropZoneArgs): ColumnDropZone => {
  const { mouseY, cellBand } = args;
  const { allowTopStrip, allowBottomStrip } = columnStripsAllowed(args);

  // No strip is offered → the whole body (incl. padding) belongs to the cells.
  if (!allowTopStrip && !allowBottomStrip) {
    return "into-cells";
  }

  // A strip is allowed but we have not measured the cells yet → defer to the
  // caller's generic edge logic.
  if (!cellBand) {
    return "fallthrough";
  }

  if (allowTopStrip && mouseY < cellBand.top) {
    return "before";
  }
  if (allowBottomStrip && mouseY > cellBand.bottom) {
    return "after";
  }
  // Cursor is over the cells (or in a strip that is not allowed on this side).
  return "into-cells";
};
