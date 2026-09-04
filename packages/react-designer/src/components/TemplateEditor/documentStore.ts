/**
 * The document being edited, and who last wrote to it.
 *
 * Before this file there was one atom — `templateEditorContentAtom` — that was
 * simultaneously the source the editors render from, the sink they write to,
 * and the payload autosave reads. Because a write carried no indication of
 * which of those roles it was playing, every consumer had to guess, and the
 * guesses were focus checks, a module-global form counter, transition flags and
 * timers. See C-20386.
 *
 * Here a write says what it is:
 *
 *   `seedDocument`    the host handing us a document — an API response, the
 *                     `value` prop, a sibling channel's idea of the truth.
 *                     Advisory: it is ignored once the author owns the document.
 *   `commitDocument`  the author's own edit, arriving from a channel's
 *                     `onUpdate`. Always wins, and takes ownership.
 *   `replaceDocument` a deliberate host replacement — version restore, undo.
 *                     Overrides ownership; that is the point of it.
 *   `resetDocument`   a different template is being opened. Clears everything,
 *                     ownership included.
 *
 * Ownership is the whole trick. "What I typed last wins" (criterion 1) is not a
 * question about focus, it is a question about who the document belongs to, and
 * the author takes it at their first keystroke. A late GET is then not a
 * conflict to arbitrate — it is simply stale, and gets dropped.
 */
import { atom } from "jotai";
import type { ElementalContent } from "@/types/elemental.types";

/**
 * Which role a write was playing.
 *
 * `author` is the one the channels care about: it means the editor already has
 * this document, because it is where it came from. `host` and `restore` both
 * mean "put this on screen"; they differ only in who owns the result.
 */
export type DocumentSource = "host" | "author" | "restore";

export interface DocumentState {
  content: ElementalContent | null | undefined;
  /**
   * Bumped on every accepted write. Channels re-apply the document when they
   * see a revision they have not applied yet, which is what replaces the old
   * "deep-compare the whole document on every render" restoration effects.
   */
  revision: number;
  source: DocumentSource;
  /**
   * True once the author has edited since the document was last seeded or
   * replaced. While true, `seedDocument` writes are dropped.
   */
  authored: boolean;
}

export const INITIAL_DOCUMENT_STATE: DocumentState = {
  content: null,
  revision: 0,
  source: "host",
  authored: false,
};

/** Content transformer — a host hook applied to every document we accept. */
export type ContentTransformer = (content: ElementalContent) => ElementalContent;
export const contentTransformerAtom = atom<ContentTransformer | null>(null);

export const documentStateAtom = atom<DocumentState>(INITIAL_DOCUMENT_STATE);

/** The revision channels watch. Reading this does not pull in the document. */
export const documentRevisionAtom = atom((get) => get(documentStateAtom).revision);

/** Who wrote the current revision. */
export const documentSourceAtom = atom((get) => get(documentStateAtom).source);

/** Whether the author owns the document. */
export const documentAuthoredAtom = atom((get) => get(documentStateAtom).authored);

const applyTransformer = (
  transformer: ContentTransformer | null,
  content: ElementalContent
): ElementalContent => {
  if (!transformer) {
    return content;
  }
  try {
    return transformer(content);
  } catch (error) {
    console.error("[ContentTransformer] Error applying transformer:", error);
    return content;
  }
};

const sameContent = (a: DocumentState["content"], b: DocumentState["content"]) =>
  JSON.stringify(a) === JSON.stringify(b);

// ============================================================================
// History
// ============================================================================
/**
 * One undo history over the document, not one per editor instance (criterion
 * 6). ProseMirror's history plugin lives in the `EditorState`, so it dies with
 * the `Editor` — and the editor is torn down by a channel switch, by preview
 * mode, and by any `key` change on the layout. An author who switches channel
 * and presses undo is not asking about an editor instance.
 *
 * Only author commits are recorded. A re-sync the author did not cause must not
 * become a step they have to undo past (criterion 6, second half).
 */
export interface DocumentHistory {
  past: ElementalContent[];
  future: ElementalContent[];
}

const HISTORY_LIMIT = 100;

export const documentHistoryAtom = atom<DocumentHistory>({ past: [], future: [] });

export const canUndoDocumentAtom = atom((get) => get(documentHistoryAtom).past.length > 0);
export const canRedoDocumentAtom = atom((get) => get(documentHistoryAtom).future.length > 0);

// ============================================================================
// Writes
// ============================================================================

/**
 * The host handing us a document. Dropped while the author owns it.
 *
 * Clearing (null/undefined) is always accepted: it is how a host says "there is
 * no document", and a stale ownership flag must not be able to keep a cleared
 * editor populated.
 */
export const seedDocumentAtom = atom(
  null,
  (get, set, content: ElementalContent | null | undefined) => {
    const current = get(documentStateAtom);

    if (!content) {
      if (current.content === content) {
        return;
      }
      set(documentStateAtom, {
        content,
        revision: current.revision + 1,
        source: "host",
        authored: false,
      });
      return;
    }

    if (current.authored) {
      // Stale by definition: the author has moved on since this was fetched.
      return;
    }

    const next = applyTransformer(get(contentTransformerAtom), content);
    if (sameContent(current.content, next)) {
      return;
    }

    set(documentStateAtom, {
      content: next,
      revision: current.revision + 1,
      source: "host",
      authored: false,
    });
  }
);

/**
 * The author's own edit. Always accepted, takes ownership, and is the only
 * thing that records history.
 */
export const commitDocumentAtom = atom(null, (get, set, content: ElementalContent) => {
  const current = get(documentStateAtom);
  const next = applyTransformer(get(contentTransformerAtom), content);

  if (sameContent(current.content, next)) {
    // Still ownership-taking: the author touched the document even if the
    // serialized result is identical (a formatting no-op, a re-typed
    // character). Otherwise the next stale GET would be allowed to land.
    if (!current.authored) {
      set(documentStateAtom, { ...current, authored: true, source: "author" });
    }
    return;
  }

  if (current.content) {
    const { past } = get(documentHistoryAtom);
    set(documentHistoryAtom, {
      past: [...past, current.content].slice(-HISTORY_LIMIT),
      future: [],
    });
  }

  set(documentStateAtom, {
    content: next,
    revision: current.revision + 1,
    source: "author",
    authored: true,
  });
});

/**
 * A change to the document that is not the author's edit and not a new document
 * either — the editor normalising what it was handed. Back-filling the email
 * channel's default colours is the one that matters: the renderer has those
 * defaults, the document does not say so, and the Frame controls have to show
 * something. It has to be written down to be saved, but it is not an edit.
 *
 * So: it changes the content and it does not take ownership. Tagged `author`
 * because the editors already show it — there is nothing to re-apply — and it
 * records no history, because nobody should be able to undo their way back to
 * a document that was missing a property.
 */
export const amendDocumentAtom = atom(null, (get, set, content: ElementalContent) => {
  const current = get(documentStateAtom);
  const next = applyTransformer(get(contentTransformerAtom), content);

  if (sameContent(current.content, next)) {
    return;
  }

  set(documentStateAtom, {
    ...current,
    content: next,
    revision: current.revision + 1,
    source: "author",
  });
});

/**
 * A deliberate host replacement — restoring a saved version, applying an undo.
 * Overrides ownership, and hands the document back to the host: what is on
 * screen afterwards is the host's document, not the author's edit.
 */
export const replaceDocumentAtom = atom(
  null,
  (get, set, content: ElementalContent | null | undefined) => {
    const current = get(documentStateAtom);
    const next = content ? applyTransformer(get(contentTransformerAtom), content) : content;

    if (sameContent(current.content, next) && !current.authored) {
      return;
    }

    set(documentStateAtom, {
      content: next,
      revision: current.revision + 1,
      source: "host",
      authored: false,
    });
  }
);

/** A different template is being opened. */
export const resetDocumentAtom = atom(null, (get, set) => {
  const current = get(documentStateAtom);
  set(documentStateAtom, {
    ...INITIAL_DOCUMENT_STATE,
    revision: current.revision + 1,
  });
  set(documentHistoryAtom, { past: [], future: [] });
});

/**
 * Step back one author commit. Returns the document that is now current, or
 * null when there is nothing to undo.
 */
export const undoDocumentAtom = atom(null, (get, set): ElementalContent | null => {
  const { past, future } = get(documentHistoryAtom);
  if (past.length === 0) {
    return null;
  }

  const current = get(documentStateAtom);
  const previous = past[past.length - 1];

  set(documentHistoryAtom, {
    past: past.slice(0, -1),
    future: current.content ? [current.content, ...future].slice(0, HISTORY_LIMIT) : future,
  });

  set(documentStateAtom, {
    content: previous,
    revision: current.revision + 1,
    // "restore", not "author": the editors have to put this on screen. But
    // ownership stays with the author — a GET landing afterwards must not be
    // able to undo the undo.
    source: "restore",
    authored: true,
  });

  return previous;
});

/** Step forward again. Returns the document that is now current, or null. */
export const redoDocumentAtom = atom(null, (get, set): ElementalContent | null => {
  const { past, future } = get(documentHistoryAtom);
  if (future.length === 0) {
    return null;
  }

  const current = get(documentStateAtom);
  const [next, ...rest] = future;

  set(documentHistoryAtom, {
    past: current.content ? [...past, current.content].slice(-HISTORY_LIMIT) : past,
    future: rest,
  });

  set(documentStateAtom, {
    content: next,
    revision: current.revision + 1,
    source: "restore",
    authored: true,
  });

  return next;
});
