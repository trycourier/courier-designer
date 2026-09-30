import type { Editor } from "@tiptap/core";

/**
 * Whether the position sits inside a looping list, where `$.item` and `$.index`
 * are real names.
 *
 * Shared because the variable chip and the expression chip have to agree: the
 * expression chip judged its arguments with `inLoop` false and drew valid loop
 * references red.
 */
export function isInsideLoopAt(editor: Editor, pos: number): boolean {
  try {
    const $pos = editor.state.doc.resolve(pos);
    for (let depth = $pos.depth; depth >= 0; depth--) {
      const ancestor = $pos.node(depth);
      if (ancestor.type.name === "list" && ancestor.attrs.loop) return true;
    }
  } catch {
    /* the position is gone; it is not in a loop */
  }
  return false;
}
