import type { Editor } from "@tiptap/core";

/**
 * Whether the editor, or anything inside it, has focus.
 *
 * `editor.isFocused` is false while a chip is being edited: the caret is in a
 * contenteditable span inside a node view, which ProseMirror does not own. A
 * content sync that trusted the flag alone replaced the document mid-edit and
 * lost what was being typed.
 */
export function editorHoldsFocus(editor: Pick<Editor, "isFocused"> & { view?: { dom: Node } }) {
  if (editor.isFocused) return true;
  const active = typeof document === "undefined" ? null : document.activeElement;
  return !!active && !!editor.view?.dom.contains(active);
}
