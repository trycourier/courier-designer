import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import { Fragment, type Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";

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
  /**
   * Block types the channel always shows in one row after every other block (MS Teams
   * buttons in Adaptive card mode). They drop only beside each other or at the end of that
   * row, and the document keeps them last so its order is the order on screen. A channel
   * may change this option on the live extension when its mode changes.
   */
  trailingTypes: string[] | null;
  /** Block types dragged by the whole block rather than a grip (MS Teams buttons). */
  wholeDragTypes: string[] | null;
}

/** A drag type without its preset suffix: "button:primary" → "button". */
const baseType = (type: unknown): string => String(type).split(":")[0];

/** The top-level blocks with trailing ones moved last, or null when they already are. */
export const reorderTrailing = (
  doc: ProseMirrorNode,
  trailingTypes: string[]
): ProseMirrorNode[] | null => {
  const leading: ProseMirrorNode[] = [];
  const trailing: ProseMirrorNode[] = [];
  let outOfOrder = false;
  doc.forEach((node) => {
    if (trailingTypes.includes(node.type.name)) {
      trailing.push(node);
    } else {
      if (trailing.length) outOfOrder = true;
      leading.push(node);
    }
  });
  return outOfOrder ? [...leading, ...trailing] : null;
};

const dropRulesPluginKey = new PluginKey("dropRules");

export const DropRules = Extension.create<DropRulesOptions>({
  name: "dropRules",

  addOptions() {
    return {
      fixedFirstBlock: false,
      sidebarTypes: null,
      trailingTypes: null,
      wholeDragTypes: null,
    };
  },

  addProseMirrorPlugins() {
    // Read at transaction time: a channel may switch the option on the live extension.
    const getTrailingTypes = () => this.options.trailingTypes;
    return [
      new Plugin({
        key: dropRulesPluginKey,
        appendTransaction: (transactions, _oldState, newState) => {
          const trailingTypes = getTrailingTypes();
          if (!trailingTypes?.length || !transactions.some((tr) => tr.docChanged)) return null;
          const ordered = reorderTrailing(newState.doc, trailingTypes);
          if (!ordered) return null;
          return newState.tr.replaceWith(0, newState.doc.content.size, Fragment.fromArray(ordered));
        },
      }),
    ];
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

/** Whether blocks of this type sit in the editor's trailing row (see `trailingTypes`). */
export const isTrailingType = (editor: EditorLike, type: unknown): boolean =>
  !!getDropRules(editor)?.trailingTypes?.includes(baseType(type));

/**
 * Switches the live editor's trailing types (a channel mode change) and, when they are on,
 * moves any trailing blocks that sit earlier in the document to the end right away.
 */
export const setTrailingTypes = (editor: Editor | null | undefined, types: string[] | null) => {
  const rules = getDropRules(editor);
  if (!editor || !rules) return;
  rules.trailingTypes = types;
  if (!types?.length || editor.isDestroyed) return;
  const ordered = reorderTrailing(editor.state.doc, types);
  if (ordered) {
    editor.view.dispatch(
      editor.state.tr.replaceWith(0, editor.state.doc.content.size, Fragment.fromArray(ordered))
    );
  }
};

/** Whether blocks of this type are dragged by the whole block (see `wholeDragTypes`). */
export const isWholeDragType = (editor: EditorLike, type: unknown): boolean =>
  !!getDropRules(editor)?.wholeDragTypes?.includes(baseType(type));
