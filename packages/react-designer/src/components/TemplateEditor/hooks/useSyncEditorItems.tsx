import type { UniqueIdentifier } from "@dnd-kit/core";
import type { Editor } from "@tiptap/react";
import { useCallback, useEffect } from "react";
import { templateEditorAtom } from "../store";
import { useAtomValue } from "jotai";

interface UseSyncEditorItemsProps {
  setItems: React.Dispatch<React.SetStateAction<{ Sidebar: string[]; Editor: UniqueIdentifier[] }>>;
  rafId: React.MutableRefObject<number | null>;
  editor?: Editor | null;
}
export const useSyncEditorItems = ({ setItems, rafId, editor }: UseSyncEditorItemsProps) => {
  const templateEditor = useAtomValue(templateEditorAtom);
  const activeEditor = editor || templateEditor;

  // Function to sync editor items - extracted for reuse
  const syncEditorItems = useCallback(
    (editor: Editor) => {
      // Cancel any pending frame request
      if (rafId.current && typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(rafId.current);
      }

      // Sync immediately for React 19 - no async delays
      const performSync = () => {
        try {
          // Get the editor DOM element
          const editorDOM = editor?.view.dom;
          if (!editorDOM) {
            return;
          }

          // Find all rendered node view wrappers - direct children only
          const nodeWrappers = editorDOM.querySelectorAll(
            ".react-renderer > div[data-node-view-wrapper][data-id]"
          );

          // Extract IDs from DOM elements, excluding elements inside Column cells
          const domIds: string[] = [];
          nodeWrappers.forEach((wrapper) => {
            const htmlWrapper = wrapper as HTMLElement;
            const id = htmlWrapper.dataset.id;

            if (id) {
              // Check if this element is inside a Column cell
              // by checking if any parent has data-column-cell attribute
              let parent = htmlWrapper.parentElement;
              let isInsideCell = false;

              while (parent && parent !== editorDOM) {
                if (parent.hasAttribute("data-column-cell")) {
                  isInsideCell = true;
                  break;
                }
                parent = parent.parentElement;
              }

              // Only add if NOT inside a cell
              if (!isInsideCell) {
                domIds.push(id);
              }
            }
          });

          // Update the state with the derived IDs from the DOM
          setItems((prevItems) => {
            return {
              Editor: domIds,
              Sidebar: prevItems.Sidebar,
            };
          });
        } catch (error) {
          console.error("Error syncing editor items:", error);
          setItems((prev) => ({ ...prev })); // Avoid resetting state on error
        }
      };

      // Use RAF for browser, immediate for tests
      if (typeof requestAnimationFrame !== "undefined") {
        rafId.current = requestAnimationFrame(performSync);
      } else {
        // In test environment, run synchronously
        performSync();
      }

      // No cleanup needed since we removed setTimeout
      return undefined;
    },
    [setItems, rafId]
  );

  useEffect(() => {
    // Early return if no valid editor
    if (!activeEditor || typeof activeEditor.on !== "function") {
      return;
    }

    // Store cleanup functions for pending timeouts
    let cleanupFn: (() => void) | undefined;

    const updateItems = () => {
      if (activeEditor) {
        // Clean up any previous pending timeout
        if (cleanupFn) {
          cleanupFn();
        }
        // Store the cleanup function for the new timeout
        cleanupFn = syncEditorItems(activeEditor);
      }
    };

    // Listen to multiple editor events to catch all update scenarios
    activeEditor.on("update", updateItems);
    activeEditor.on("selectionUpdate", updateItems);
    activeEditor.on("create", updateItems);
    activeEditor.on("transaction", updateItems);

    // Initial call to populate items immediately if editor is ready
    if (activeEditor && !activeEditor.isDestroyed) {
      updateItems();
    }

    // Listen for node duplication events
    const handleNodeDuplicated = (_event: CustomEvent) => {
      updateItems();
    };
    document.addEventListener("node-duplicated", handleNodeDuplicated as EventListener);

    // Cleanup
    return () => {
      activeEditor?.off("update", updateItems);
      activeEditor?.off("selectionUpdate", updateItems);
      activeEditor?.off("create", updateItems);
      activeEditor?.off("transaction", updateItems);
      document.removeEventListener("node-duplicated", handleNodeDuplicated as EventListener);
      // Clean up any pending timeout
      if (cleanupFn) {
        cleanupFn();
      }
      // Cancel any pending frame request on unmount
      if (rafId.current && typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [activeEditor, syncEditorItems, rafId]);

  return {
    syncEditorItems,
  };
};
