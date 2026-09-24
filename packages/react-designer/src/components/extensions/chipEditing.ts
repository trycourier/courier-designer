import type { Attribute, Editor, KeyboardShortcutCommand } from "@tiptap/core";
import type { NodeType } from "prosemirror-model";
import { NodeSelection } from "prosemirror-state";
import { useEffect } from "react";

/**
 * Shared "open this chip for editing" behaviour for the atomic inline chips —
 * the variable chip and the handlebars expression chip.
 *
 * The two nodes are separate because they serialize differently, but to the
 * author they are one control: click selects, Enter opens, double-click opens.
 * Keeping the rule in one place is what stops the two drifting apart.
 */

/**
 * Set when a chip should open for editing as soon as it renders — inserted from
 * an autocomplete, or Enter pressed while it was selected. Cleared on the first
 * render that acts on it, and never persisted to HTML or Elemental.
 */
export const autoEditAttribute: Partial<Attribute> = {
  default: false,
  parseHTML: () => false,
  renderHTML: () => ({}),
};

/**
 * Chips must outrank Paragraph (100) or Enter splits the block before the chip
 * ever sees the key.
 */
export const CHIP_NODE_PRIORITY = 1001;

/**
 * Enter on a selected chip opens it for editing rather than splitting the
 * block. Call from a node's `addKeyboardShortcuts` with `this`.
 */
export function enterOpensChip(ctx: {
  editor: Editor;
  type: NodeType;
  name: string;
}): KeyboardShortcutCommand {
  return () => {
    const { editor, type, name } = ctx;
    const { selection } = editor.state;
    if (selection instanceof NodeSelection && selection.node.type === type) {
      return editor.commands.updateAttributes(name, { autoEdit: true });
    }
    return false;
  };
}

/**
 * Drop into edit mode when the node arrives with `autoEdit` set, then clear the
 * flag so a later re-render does not reopen the chip behind the author's back.
 */
export function useAutoEdit({
  autoEdit,
  isEditing,
  open,
  clear,
}: {
  autoEdit: boolean;
  isEditing: boolean;
  open: () => void;
  clear: () => void;
}): void {
  useEffect(() => {
    if (!autoEdit || isEditing) return;
    open();
    // Clearing dispatches a transaction; doing that inside the effect makes
    // TipTap flush it from a React lifecycle method, which React warns about.
    queueMicrotask(clear);
    // `open`/`clear` are recreated per render by their callers; depending on
    // them would reopen the chip on every render while the flag is still set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEdit, isEditing]);
}

/**
 * Replace a variable chip with the expression chip for `helperName`, opened for
 * editing with the caret where the arguments go.
 *
 * Shared because the canvas chip and the subject/label chip are one control to
 * the author: the sidebar's Label field offered only variables while the same
 * label on the canvas offered helpers too.
 */
export function replaceChipWithHelper({
  editor,
  pos,
  nodeSize,
  helperName,
  isBlock,
}: {
  editor: Editor;
  pos: number;
  nodeSize: number;
  helperName: string;
  isBlock: boolean;
}): boolean {
  const type = editor.schema.nodes.handlebarsExpression;
  if (!type) return false;

  // A block helper carries its `#`, so the template stays balanced even if the
  // author stops typing right here.
  const raw = isBlock ? `{{#${helperName} }}` : `{{${helperName} }}`;

  return editor
    .chain()
    .focus()
    .command(({ tr }) => {
      tr.replaceWith(
        pos,
        pos + nodeSize,
        type.create({
          raw,
          kind: isBlock ? "blockOpen" : "helperCall",
          name: helperName,
          isInvalid: false,
          autoEdit: true,
        })
      );
      return true;
    })
    .run();
}

/**
 * Whether the chip this node view was built for is still at `pos`.
 *
 * A node view outlives the node when something replaces it — `}}` folding a
 * chip and the text after it into one expression, for instance — and a write
 * made afterwards lands on whatever took that position.
 */
export function chipStillAt(editor: Editor, pos: number, typeName: string): boolean {
  return editor.state.doc.nodeAt(pos)?.type.name === typeName;
}

/**
 * Whether a chip that has just committed should put the caret back after
 * itself.
 *
 * It should not when the author has already clicked somewhere else: the commit
 * runs a frame later, and restoring then drags the caret back to the chip while
 * the click's block stays highlighted, so the next keystroke lands on the old
 * line.
 */
export function shouldRestoreCaret({
  selectionFrom,
  pos,
  nodeSize,
}: {
  selectionFrom: number;
  pos: number;
  nodeSize: number;
}): boolean {
  return selectionFrom >= pos && selectionFrom <= pos + nodeSize;
}
