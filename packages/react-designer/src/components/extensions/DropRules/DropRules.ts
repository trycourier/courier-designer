import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/core";

/**
 * Drop rules for an editor with a fixed layout. A channel adds this extension to its editor;
 * without it every drop is allowed, as before. The drag hook and the block wrapper both read
 * these rules, so a drop on a block, on the editor's empty area, or a block moved, all obey them.
 */
export interface DropRulesOptions {
  /** The first top-level block stays first: nothing lands above it, and it isn't dragged. */
  fixedFirstBlock: boolean;
  /** The sidebar blocks this editor takes, by drag type; `null` takes all. */
  sidebarTypes: string[] | null;
}

export const DropRules = Extension.create<DropRulesOptions>({
  name: "dropRules",

  addOptions() {
    return { fixedFirstBlock: false, sidebarTypes: null };
  },
});

type EditorLike = Pick<Editor, "extensionManager"> | null | undefined;

export const getDropRules = (editor: EditorLike): DropRulesOptions | undefined => {
  const extension = editor?.extensionManager?.extensions.find((e) => e.name === DropRules.name);
  return extension?.options as DropRulesOptions | undefined;
};

export const acceptsSidebarBlock = (editor: EditorLike, dragType: unknown): boolean => {
  const types = getDropRules(editor)?.sidebarTypes;
  return !types || types.includes(String(dragType));
};

/** Where a top-level insert may land: after a fixed first block rather than before it. */
export const allowedInsertPosition = (
  editor: Pick<Editor, "extensionManager" | "state">,
  position: number
): number =>
  position === 0 && getDropRules(editor)?.fixedFirstBlock
    ? (editor.state.doc.firstChild?.nodeSize ?? 0)
    : position;

/** Whether the block at `pos` is a fixed first block, which is never moved. */
export const isFixedFirstBlock = (editor: EditorLike, pos: number): boolean =>
  pos === 0 && !!getDropRules(editor)?.fixedFirstBlock;
