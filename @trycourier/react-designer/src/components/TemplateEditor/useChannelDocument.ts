/**
 * One rule for getting a document into a channel's editor, replacing the six
 * near-identical restoration effects (C-20386, step 4).
 *
 * What each of those did: watch `templateEditorContentAtom`, deep-compare the
 * whole document against the editor's own, and — behind `editor.isFocused`,
 * `getFormUpdating()`, a `[data-sidebar-form]` check, and a `setTimeout(…, 1)`
 * that re-checked all three — call `setContent`. The guards were there because
 * the effect could not tell an incoming document from an echo of its own last
 * write, so it had to guess from focus whether the author would mind.
 *
 * It does not have to guess any more. `documentStore` tags every write with the
 * role it is playing, so:
 *
 *   - a write the author caused (`source === "author"`) is an echo; the editor
 *     already has it, and re-applying it is what used to eat keystrokes
 *   - anything else is a document to show, and the store has already dropped
 *     the stale ones (a GET landing after the author started typing never gets
 *     this far — see `seedDocumentAtom`)
 *
 * So the rule is: apply what you have not applied yet, unless you wrote it.
 * No focus check, no form counter, no timer.
 */
import type { Editor } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import { useAtomValue, useSetAtom } from "@/lib/store";
import { useEffect, useRef } from "react";

import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import { resolveSelectedNode } from "@/components/ui/TextMenu/resolveSelectedNode";
import type { TiptapDoc } from "@/lib/utils";
import type { ElementalContent } from "@/types/elemental.types";
import { documentStateAtom, INITIAL_DOCUMENT_STATE } from "./documentStore";

/**
 * Put a document on screen without disturbing the author any more than the new
 * document itself does.
 *
 * Three things this does that a bare `setContent` does not:
 *
 *  - one transaction, marked `addToHistory: false`. A re-sync is not something
 *    the author did, so it must not be a step they have to undo past
 *    (criterion 6). Chained commands share a transaction, so the meta set in
 *    the last step covers the replacement in the first.
 *  - keeps the caret where it was, clamped into the new document.
 *  - re-resolves the selected node against the new document. The atom holds a
 *    raw ProseMirror `Node`; replacing the document replaces every node
 *    identity, so the old reference is detached and the sidebar would go on
 *    writing into an object nothing renders (criterion 4).
 */
export const applyDocumentToEditor = (
  editor: Editor,
  doc: TiptapDoc,
  setSelectedNode?: (node: Node | null) => void
): void => {
  const hadSelection = editor.state.selection.anchor;
  const wasEmpty = editor.state.doc.content.size === 0;

  editor
    .chain()
    .setContent(doc, false)
    .command(({ tr }) => {
      tr.setMeta("addToHistory", false);
      return true;
    })
    .run();

  if (!wasEmpty) {
    const pos = Math.min(hadSelection, Math.max(0, editor.state.doc.content.size - 1));
    editor.commands.setTextSelection(pos);
  }

  setSelectedNode?.(resolveSelectedNode(editor));
};

/**
 * The document as the EDITOR would hold it, not as the converter emits it.
 *
 * `convertElementalToTiptap` produces plain JSON; the schema then fills in
 * every attribute default when the editor takes it (a `border_color:
 * "transparent"` the stored Elemental never mentioned, say). So a stored
 * document and the same document sitting in an editor never compare equal
 * unless you put the stored one through the schema first.
 *
 * That difference is why opening a template looks like an edit. Anything asking
 * "did the author actually change something?" has to compare like with like.
 */
export const canonicalizeForEditor = (editor: Editor, doc: TiptapDoc): TiptapDoc =>
  editor.schema.nodeFromJSON(doc).toJSON() as TiptapDoc;

export interface UseChannelDocumentOptions {
  editor: Editor | null | undefined;
  /**
   * Turn the stored document into this channel's TipTap document. Returning
   * null means "nothing to show" and no write happens — a channel with no
   * content of its own must not blank the canvas.
   */
  toTiptap: (content: ElementalContent | null | undefined) => TiptapDoc | null;
  /** Skip while the template is still loading. */
  enabled?: boolean;
}

export const useChannelDocument = ({
  editor,
  toTiptap,
  enabled = true,
}: UseChannelDocumentOptions): void => {
  // `?? INITIAL_DOCUMENT_STATE` for a store that has not been initialised —
  // most often a suite that mocks jotai wholesale rather than providing one.
  // Falling back to the initial state means "no document yet", which is the
  // truthful reading and keeps a channel from crashing its host over it.
  const { content, revision, source } = useAtomValue(documentStateAtom) ?? INITIAL_DOCUMENT_STATE;
  const setSelectedNode = useSetAtom(selectedNodeAtom);
  const appliedRevisionRef = useRef<number | null>(null);
  // `toTiptap` closes over per-channel props (locale, subject) and is rebuilt
  // every render; holding it in a ref keeps it out of the effect's deps so a
  // parent re-render cannot masquerade as a new document.
  const toTiptapRef = useRef(toTiptap);
  toTiptapRef.current = toTiptap;

  useEffect(() => {
    if (!editor || !enabled) {
      return;
    }

    if (appliedRevisionRef.current === null) {
      // First run for this editor instance. It was constructed from the
      // document the store already held, so there is nothing to apply — just
      // record where we came in.
      appliedRevisionRef.current = revision;
      return;
    }

    if (appliedRevisionRef.current === revision) {
      return;
    }

    appliedRevisionRef.current = revision;

    if (source === "author") {
      // Our own edit coming back around.
      return;
    }

    const doc = toTiptapRef.current(content);
    if (!doc) {
      return;
    }

    applyDocumentToEditor(editor, doc, setSelectedNode);
  }, [editor, enabled, content, revision, source, setSelectedNode]);
};
