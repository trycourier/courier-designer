import type { Editor } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";

/**
 * The block the sidebar should be editing, given where the caret is.
 *
 * Priority: list > blockquote > text block. A caret inside a list item is
 * editing the list, not the paragraph inside it — the sidebar has no controls
 * for the latter.
 *
 * Extracted from Email's `onSelectionUpdate` so that the re-sync path can use
 * the same rule. `selectedNodeAtom` holds a raw ProseMirror `Node`, and every
 * node identity is replaced when the document is re-applied, so the selection
 * has to be RE-RESOLVED against the new document rather than carried across it
 * (C-20386, criterion 4). Anything that replaces the document must call this.
 */
export const resolveSelectedNode = (editor: Editor): Node | null => {
  const { $anchor } = editor.state.selection;

  let depth = $anchor.depth;
  let currentNode: Node | null = null;
  let blockquoteNode: Node | null = null;
  let listNode: Node | null = null;

  while (depth > 0) {
    const node = $anchor.node(depth);
    if (!blockquoteNode && node.type.name === "blockquote") {
      blockquoteNode = node;
    }
    if (!listNode && node.type.name === "list") {
      listNode = node;
    }
    if (!currentNode && (node.type.name === "paragraph" || node.type.name === "heading")) {
      currentNode = node;
    }
    depth--;
  }

  return listNode ?? blockquoteNode ?? currentNode;
};
