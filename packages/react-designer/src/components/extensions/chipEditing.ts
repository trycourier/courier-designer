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
    clear();
    // `open`/`clear` are recreated per render by their callers; depending on
    // them would reopen the chip on every render while the flag is still set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEdit, isEditing]);
}
