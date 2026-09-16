import { v4 as uuidv4 } from "uuid";
import type { Editor } from "@tiptap/core";

/**
 * Utility function to generate unique IDs for nodes that don't have them
 * @param editor The Tiptap editor instance
 * @param nodeName The name of the node type to assign IDs to
 * @returns void
 */
export function generateNodeIds(editor: Editor, nodeName: string): void {
  const transaction = editor.state.tr;
  let needsUpdate = false;

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === nodeName && !node.attrs.id) {
      const id = `node-${uuidv4()}`;
      transaction.setNodeMarkup(pos, undefined, { ...node.attrs, id });
      needsUpdate = true;
    }
    return false; // Don't need to go deeper
  });

  if (needsUpdate) {
    editor.view.dispatch(transaction);
  }
}
