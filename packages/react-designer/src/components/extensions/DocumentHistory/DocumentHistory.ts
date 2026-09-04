/**
 * Undo/redo that outlives the editor instance (C-20386, criterion 6).
 *
 * ProseMirror's history is a plugin in the `EditorState`, so the undo stack
 * belongs to the TipTap `Editor` and dies with it. The editor is torn down more
 * often than an author would ever guess: a channel switch unmounts the whole
 * layout, and `EmailLayout` remounts the editor on a `key` whenever read-only
 * or autocomplete flips — so merely looking at the preview threw the stack
 * away. Someone who types, checks the preview, comes back and presses ⌘Z is not
 * asking about an editor instance.
 *
 * This overrides the `undo` and `redo` commands — which is what ⌘Z routes
 * through — to fall back to the store's document history once the local stack
 * is spent. Within one editor session nothing changes: ProseMirror keeps
 * handling it, at its own keystroke granularity. Only when it has nothing left
 * do we step back through committed documents.
 *
 * Must be registered AFTER StarterKit so these commands win the merge.
 */
import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import { redo as pmRedo, redoDepth, undo as pmUndo, undoDepth } from "@tiptap/pm/history";
import { Selection } from "@tiptap/pm/state";
import type { Transaction } from "@tiptap/pm/state";
import type { TiptapDoc } from "@/lib/utils";

export interface DocumentHistoryOptions {
  /**
   * Step the store's history back one author commit and return the document
   * that is now current, or null when there is nothing left. Called only when
   * the command is really executing, never for a `can()` probe — it mutates the
   * stack.
   */
  undoDocument?: () => TiptapDoc | null;
  redoDocument?: () => TiptapDoc | null;
  /** Whether there is anything to step to. Safe to call for `can()`. */
  canUndoDocument?: () => boolean;
  canRedoDocument?: () => boolean;
  /** Called after the swap has been dispatched, to re-resolve the selection. */
  onDocumentApplied?: (editor: Editor) => void;
}

/**
 * Swap the document inside the command's OWN transaction.
 *
 * Dispatching separately from here would leave the transaction TipTap built for
 * this command based on a document that no longer exists — "Applying a
 * mismatched transaction". Doing it in `tr` also makes the swap atomic, which
 * is what an undo should be.
 */
const replaceDocument = (tr: Transaction, editor: Editor, doc: TiptapDoc): void => {
  const anchor = tr.selection.anchor;
  const node = editor.schema.nodeFromJSON(doc);

  tr.replaceWith(0, tr.doc.content.size, node.content);
  tr.setSelection(Selection.near(tr.doc.resolve(Math.min(anchor, tr.doc.content.size))));

  // Not an author action, and the store already holds this document.
  tr.setMeta("addToHistory", false);
  tr.setMeta("preventUpdate", true);
};

export const DocumentHistory = Extension.create<DocumentHistoryOptions>({
  name: "documentHistory",

  addOptions() {
    return {
      undoDocument: undefined,
      redoDocument: undefined,
      canUndoDocument: undefined,
      canRedoDocument: undefined,
      onDocumentApplied: undefined,
    };
  },

  addCommands() {
    return {
      undo:
        () =>
        ({ state, dispatch, tr, editor }) => {
          if (undoDepth(state) > 0) {
            return pmUndo(state, dispatch);
          }
          if (!dispatch) {
            return this.options.canUndoDocument?.() ?? false;
          }
          const doc = this.options.undoDocument?.();
          if (!doc) {
            return false;
          }
          replaceDocument(tr, editor, doc);
          queueMicrotask(() => this.options.onDocumentApplied?.(editor));
          return true;
        },
      redo:
        () =>
        ({ state, dispatch, tr, editor }) => {
          if (redoDepth(state) > 0) {
            return pmRedo(state, dispatch);
          }
          if (!dispatch) {
            return this.options.canRedoDocument?.() ?? false;
          }
          const doc = this.options.redoDocument?.();
          if (!doc) {
            return false;
          }
          replaceDocument(tr, editor, doc);
          queueMicrotask(() => this.options.onDocumentApplied?.(editor));
          return true;
        },
    };
  },
});
