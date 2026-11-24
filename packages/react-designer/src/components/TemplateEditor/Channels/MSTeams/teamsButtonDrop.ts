import type { Editor } from "@tiptap/core";
import type { TrailingDropTarget } from "@/components/extensions/DropRules";

/** Teams shows this many buttons on a card; the rest go under its "…" menu. */
export const MSTEAMS_VISIBLE_BUTTONS = 6;

// Each button's slot in the row: its 24px inset, less the 16px it pulls the next one back
// (styles.css), so 8px past the button. The 6th leaves 48px more for the "…" chip.
const SLOT_EXTRA = 8;
const CHIP_EXTRA = 48;
const BUTTON_INSET = 24;

interface Slot {
  id: string | null;
  width: number;
}

interface Shown extends Slot {
  element: HTMLElement;
}

const CHIP_WIDTH = 40;

// Button widths as the row was before its ghost showed: the ghost hides the 6th button
// while it pushes it under "…", and measuring that would let the ghost move the drop.
let measured: { doc: unknown; widths: Map<string | null, number> } | null = null;

const buttonWidths = (editor: Editor, row: HTMLElement) => {
  if (measured?.doc === editor.state.doc) return measured.widths;
  const widths = new Map<string | null, number>();
  row.querySelectorAll<HTMLElement>(":scope > .node-button").forEach((element) => {
    const id = element.querySelector("[data-id]")?.getAttribute("data-id") ?? null;
    widths.set(id, element.querySelector<HTMLElement>(".node-element")?.offsetWidth ?? 0);
  });
  measured = { doc: editor.state.doc, widths };
  return widths;
};

/** The buttons the row shows while this drag runs, in order, without the dragged one. */
const shownButtons = (editor: Editor, row: HTMLElement, sourceId: unknown): Shown[] => {
  const widths = buttonWidths(editor, row);
  const shown: Shown[] = [];
  row.querySelectorAll<HTMLElement>(":scope > .node-button").forEach((element) => {
    const id = element.querySelector("[data-id]")?.getAttribute("data-id") ?? null;
    const width = widths.get(id) ?? 0;
    // Hidden under "…", or the dragged button, which leaves its slot.
    if (!width || id === sourceId) return;
    shown.push({ id, width, element });
  });
  return shown;
};

/** Lays slots out as the row's flex-wrap does: each slot's line and left edge. */
const layOut = (row: HTMLElement, slots: Slot[], hasChip: boolean) => {
  const lineWidth = row.clientWidth;
  let line = 0;
  let used = 0;
  return slots.map((slot, i) => {
    const extra = SLOT_EXTRA + (hasChip && i === MSTEAMS_VISIBLE_BUTTONS - 1 ? CHIP_EXTRA : 0);
    const size = slot.width + extra;
    if (used > 0 && used + size > lineWidth) {
      line += 1;
      used = 0;
    }
    const left = used + BUTTON_INSET;
    used += size;
    return { line, left };
  });
};

/**
 * The drop a Teams button drag makes at this pointer, read off the row laid out without the
 * ghost: the ghost moves buttons and the "…" chip, and reading the row as shown would let it
 * move the drop, which moves the ghost back. "chip" over the chip's place in that layout;
 * over a button's left half the button lands before it, over its right half or past a
 * line's end after it, and below the last line after the last button. Null off the rows.
 */
export const resolveTeamsButtonDrop = (
  editor: Editor,
  pointer: { x: number; y: number },
  sourceId: unknown
): TrailingDropTarget | "chip" | null => {
  const row = editor.view?.dom as HTMLElement | undefined;
  if (!row || typeof document === "undefined") return null;
  const shown = shownButtons(editor, row, sourceId);
  if (!shown.length) return null;

  const box = row.getBoundingClientRect();
  // The first line, from the first button: the ghost can hide the 6th, not the first.
  const firstFace = (
    shown[0].element.querySelector(".node-element") ?? shown[0].element
  ).getBoundingClientRect();
  const lineHeight = firstFace.height || 40;
  const top = firstFace.top;
  const y = pointer.y - top;
  const x = pointer.x - box.left;
  const pointerLine = Math.floor(y / lineHeight);

  // The chip, as the row shows it before any ghost: after the 6th button, or the last.
  const hasChip = !!row
    .closest("[data-msteams-editor-root]")
    ?.querySelector(".courier-msteams-button-overflow-chip");
  const slots = layOut(row, shown, hasChip);
  if (hasChip) {
    const i = Math.min(MSTEAMS_VISIBLE_BUTTONS, shown.length) - 1;
    const chipLeft = slots[i].left + shown[i].width + SLOT_EXTRA;
    if (pointerLine === slots[i].line && x >= chipLeft - 4 && x <= chipLeft + CHIP_WIDTH + 4) {
      return "chip";
    }
  }

  // A new or hidden button dropped into a full row pushes the 6th under "…".
  const placed = [...shown];
  if (row.closest("[data-row-full-insert]") && placed.length >= MSTEAMS_VISIBLE_BUTTONS) {
    placed.splice(MSTEAMS_VISIBLE_BUTTONS - 1, 1);
  }
  const placedSlots = layOut(row, placed, hasChip);
  const lastLine = Math.max(slots[slots.length - 1].line, placedSlots[placedSlots.length - 1].line);
  // The ghost can add a line below the last one; it still belongs to the row.
  if (y < 0 || pointerLine > lastLine + 1 || pointer.x < box.left || pointer.x > box.right) {
    return null;
  }
  const last = placed[placed.length - 1];
  const placedLast = placedSlots[placedSlots.length - 1].line;
  if (pointerLine > placedLast) return { id: last.id ?? "", edge: "right" };

  const onLine = placed
    .map((slot, i) => ({ slot, ...placedSlots[i] }))
    .filter((entry) => entry.line === pointerLine);
  const hit = onLine.find(({ slot, left }) => x < left + slot.width / 2);
  return hit
    ? { id: hit.slot.id ?? "", edge: "left" }
    : { id: onLine[onLine.length - 1].slot.id ?? "", edge: "right" };
};
