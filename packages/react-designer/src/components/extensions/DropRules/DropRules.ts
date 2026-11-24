import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import { Fragment, type Node as ProseMirrorNode } from "@tiptap/pm/model";
import {
  type EditorState,
  NodeSelection,
  Plugin,
  PluginKey,
  type Transaction,
  TextSelection,
} from "@tiptap/pm/state";

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
  /**
   * The channel sets trailing-row drops itself, from its own layout (MS Teams), through
   * setLastTrailingTarget; blocks then only draw the ghost it names.
   */
  layoutTrailingDrop?: boolean;
}

/** A drag type without its preset suffix: "button:primary" → "button". */
const baseType = (type: unknown): string => String(type).split(":")[0];

/** Top-level block indexes with trailing ones moved last, or null when they already are. */
export const reorderTrailing = (doc: ProseMirrorNode, trailingTypes: string[]): number[] | null => {
  const leading: number[] = [];
  const trailing: number[] = [];
  let outOfOrder = false;
  doc.forEach((node, _offset, index) => {
    if (trailingTypes.includes(node.type.name)) {
      trailing.push(index);
    } else {
      if (trailing.length) outOfOrder = true;
      leading.push(index);
    }
  });
  return outOfOrder ? [...leading, ...trailing] : null;
};

/** Start of each top-level block, by index. */
const blockStarts = (nodes: ProseMirrorNode[]) => {
  let pos = 0;
  return nodes.map((node) => {
    const start = pos;
    pos += node.nodeSize;
    return start;
  });
};

/**
 * Moves trailing blocks last, keeping the selection in the block it was in: replacing the
 * whole document would otherwise map the caret into the last block (a button's label).
 */
const reorderTrailingTr = (
  state: EditorState,
  tr: Transaction,
  trailingTypes: string[]
): Transaction | null => {
  const order = reorderTrailing(state.doc, trailingTypes);
  if (!order) return null;
  const nodes: ProseMirrorNode[] = [];
  state.doc.forEach((node) => nodes.push(node));
  const oldStarts = blockStarts(nodes);
  const newStarts = blockStarts(order.map((i) => nodes[i]));
  const newStartOf = (index: number) => newStarts[order.indexOf(index)];

  tr.replaceWith(0, state.doc.content.size, Fragment.fromArray(order.map((i) => nodes[i])));

  const { selection } = state;
  const $from = selection.$from;
  const index = $from.index(0);
  if (selection instanceof NodeSelection && $from.depth === 0) {
    return tr.setSelection(NodeSelection.create(tr.doc, newStartOf(index)));
  }
  if ($from.depth === 0 || selection.$to.index(0) !== index) return tr;
  const shift = newStartOf(index) - oldStarts[index];
  return tr.setSelection(
    TextSelection.create(tr.doc, selection.anchor + shift, selection.head + shift)
  );
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
          return reorderTrailingTr(newState, newState.tr, trailingTypes);
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
  const tr = reorderTrailingTr(editor.state, editor.state.tr, types);
  if (tr) editor.view.dispatch(tr);
};

/** Whether blocks of this type are dragged by the whole block (see `wholeDragTypes`). */
export const isWholeDragType = (editor: EditorLike, type: unknown): boolean =>
  !!getDropRules(editor)?.wholeDragTypes?.includes(baseType(type));

/** A trailing-row block's drop beside another, by that block's id. */
export interface TrailingDropTarget {
  id: string;
  edge: "left" | "right";
}

/** The drop a trailing-row drag would make, with what its ghost shows. */
export interface TrailingDrop extends TrailingDropTarget {
  dragType: string | null;
  label: string | null;
}

// The last block a trailing-row drag showed its ghost beside. The ghost reflows the row (a
// line can wrap), which can leave the pointer over a gap; the drop stays there until the
// pointer reaches another block or leaves the row. One drag runs at a time.
let lastTrailingTarget: TrailingDrop | null = null;
const trailingTargetListeners = new Set<() => void>();

export const getLastTrailingTarget = () => lastTrailingTarget;

const sameTarget = (a?: TrailingDropTarget | null, b?: TrailingDropTarget | null) =>
  a?.id === b?.id && a?.edge === b?.edge;

export const setLastTrailingTarget = (target: TrailingDrop | null) => {
  const last = lastTrailingTarget;
  if (sameTarget(target, last) && target?.label === last?.label) return;
  lastTrailingTarget = target;
  trailingTargetListeners.forEach((listener) => listener());
};

export const subscribeLastTrailingTarget = (listener: () => void) => {
  trailingTargetListeners.add(listener);
  return () => {
    trailingTargetListeners.delete(listener);
  };
};

/**
 * The id a dragged top-level block has now. The editor can give blocks new ids once a drag
 * has started, so the id in the drag's data may be gone; the block is still at the index it
 * was dragged from.
 */
export const currentSourceId = (
  editor: Pick<Editor, "state"> | null | undefined,
  data: Record<string | symbol, unknown>
): unknown => {
  if (!editor || data.type !== "editor") return data.id;
  let found = false;
  editor.state.doc.forEach((node) => {
    if (node.attrs.id === data.id) found = true;
  });
  if (found || typeof data.index !== "number" || data.index >= editor.state.doc.childCount) {
    return data.id;
  }
  return editor.state.doc.child(data.index).attrs.id;
};

/** The label a dragged block's ghost shows: the one its drag carries, or its text. */
export const draggedBlockLabel = (
  editor: Pick<Editor, "state"> | null | undefined,
  data: Record<string | symbol, unknown>
): string | null => {
  if (typeof data.label === "string" && data.label) return data.label;
  if (!editor || data.type !== "editor") return null;
  const id = currentSourceId(editor, data);
  let label: string | null = null;
  editor.state.doc.forEach((node) => {
    if (node.attrs.id === id) label = node.textContent || null;
  });
  return label;
};
