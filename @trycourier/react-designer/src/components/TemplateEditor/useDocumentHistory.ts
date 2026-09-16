/**
 * Wires a channel's editor to the store's document history.
 *
 * The returned handlers are what `DocumentHistory` calls once ProseMirror's own
 * stack is spent. They are deliberately stable across renders: they go into
 * `ExtensionKit`, which is memoized, and a new identity there would rebuild the
 * extensions and remount the editor.
 */
import type { Editor } from "@tiptap/core";
import { useSetAtom, useStore } from "@/lib/store";
import { useMemo, useRef } from "react";

import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import { resolveSelectedNode } from "@/components/ui/TextMenu/resolveSelectedNode";
import type { TiptapDoc } from "@/lib/utils";
import type { ElementalContent } from "@/types/elemental.types";
import {
  canRedoDocumentAtom,
  canUndoDocumentAtom,
  redoDocumentAtom,
  undoDocumentAtom,
} from "./documentStore";

export interface UseDocumentHistoryOptions {
  toTiptap: (content: ElementalContent | null | undefined) => TiptapDoc | null;
}

export const useDocumentHistory = ({ toTiptap }: UseDocumentHistoryOptions) => {
  const store = useStore();
  const setSelectedNode = useSetAtom(selectedNodeAtom);
  const toTiptapRef = useRef(toTiptap);
  toTiptapRef.current = toTiptap;

  return useMemo(
    () => ({
      undoDocument: () => toTiptapRef.current(store.set(undoDocumentAtom)),
      redoDocument: () => toTiptapRef.current(store.set(redoDocumentAtom)),
      canUndoDocument: () => store.get(canUndoDocumentAtom),
      canRedoDocument: () => store.get(canRedoDocumentAtom),
      // The document was replaced, so every node identity is new and the
      // sidebar's held reference is detached. Re-resolve rather than carry.
      onDocumentApplied: (editor: Editor) => setSelectedNode(resolveSelectedNode(editor)),
    }),
    [store, setSelectedNode]
  );
};
