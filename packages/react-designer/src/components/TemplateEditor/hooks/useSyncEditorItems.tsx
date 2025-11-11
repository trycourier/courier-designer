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
      console.log("[DnD Debug] syncEditorItems called");

      // Cancel any pending frame request
      if (rafId.current && typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(rafId.current);
      }

      // Use setTimeout to ensure DOM has time to fully update
      const timeoutId = setTimeout(() => {
        // Check if requestAnimationFrame is available (browser environment)
        if (typeof requestAnimationFrame !== "undefined") {
          rafId.current = requestAnimationFrame(() => {
            try {
              // Get the editor DOM element
              const editorDOM = editor?.view.dom;
              if (!editorDOM) {
                console.warn("[DnD Debug] syncEditorItems: Editor DOM element not found");
                return;
              }

              console.log("[DnD Debug] Editor DOM found:", editorDOM);

              // Find all rendered node view wrappers - direct children only
              const nodeWrappers = editorDOM.querySelectorAll(
                ".react-renderer > div[data-node-view-wrapper][data-id]"
              );

              console.log("[DnD Debug] Node wrappers found:", nodeWrappers.length);

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
                    console.log("[DnD Debug] Added item:", id);
                  } else {
                    console.log("[DnD Debug] Skipped cell item:", id);
                  }
                }
              });

              console.log("[DnD Debug] Final domIds:", domIds);

              // Update the state with the derived IDs from the DOM
              setItems((prevItems) => {
                console.log("[DnD Debug] Updating items from", prevItems.Editor, "to", domIds);
                return {
                  Editor: domIds,
                  Sidebar: prevItems.Sidebar,
                };
              });
            } catch (error) {
              console.error("[DnD Debug] Error syncing editor items:", error);
              setItems((prev) => ({ ...prev })); // Avoid resetting state on error
            }
          });
        } else {
          // In test environment, run synchronously without RAF
          try {
            const editorDOM = editor?.view.dom;
            if (!editorDOM) return;

            const nodeWrappers = editorDOM.querySelectorAll(
              ".react-renderer > div[data-node-view-wrapper][data-id]"
            );

            const domIds: string[] = [];
            nodeWrappers.forEach((wrapper) => {
              const htmlWrapper = wrapper as HTMLElement;
              const id = htmlWrapper.dataset.id;

              if (id) {
                // Check if this element is inside a Column cell
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

            setItems((prevItems) => ({
              Editor: domIds,
              Sidebar: prevItems.Sidebar,
            }));
          } catch (error) {
            console.error("Error syncing editor items:", error);
          }
        }
      }, 50); // Small delay to let DOM updates settle

      // Store timeout ID for cleanup
      return () => clearTimeout(timeoutId);
    },
    [setItems, rafId]
  );

  useEffect(() => {
    console.log("[DnD Debug] useSyncEditorItems useEffect triggered", {
      hasActiveEditor: !!activeEditor,
      editorType: typeof activeEditor?.on,
      isDestroyed: activeEditor?.isDestroyed,
    });

    // Early return if no valid editor
    if (!activeEditor || typeof activeEditor.on !== "function") {
      console.warn("[DnD Debug] useSyncEditorItems: No valid editor, skipping setup");
      return;
    }

    // Store cleanup functions for pending timeouts
    let cleanupFn: (() => void) | undefined;

    const updateItems = () => {
      console.log("[DnD Debug] updateItems triggered by editor event");
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

    console.log("[DnD Debug] Event listeners attached to editor");

    // Initial call to populate items immediately if editor is ready
    if (activeEditor && !activeEditor.isDestroyed) {
      console.log("[DnD Debug] Calling updateItems for initial population");
      updateItems();
    }

    // Listen for node duplication events
    const handleNodeDuplicated = (_event: CustomEvent) => {
      console.log("[DnD Debug] Node duplicated event received");
      updateItems();
    };
    document.addEventListener("node-duplicated", handleNodeDuplicated as EventListener);

    // Cleanup
    return () => {
      console.log("[DnD Debug] Cleaning up useSyncEditorItems");
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
