import { UniqueIdentifier } from "@dnd-kit/core";
import { Editor } from "@tiptap/react";
import { useCallback, useEffect } from "react";
import { brandEditorAtom } from "../store";
import { useAtomValue } from "jotai";

type UseSyncEditorItemsProps = {
  setItems: React.Dispatch<React.SetStateAction<{ Sidebar: string[]; Editor: UniqueIdentifier[] }>>;
  rafId: React.MutableRefObject<number | null>;
}
export const useSyncEditorItems = ({ setItems, rafId }: UseSyncEditorItemsProps) => {
  const brandEditor = useAtomValue(brandEditorAtom);
  
    // Function to sync editor items - extracted for reuse
    const syncEditorItems = useCallback((editor: Editor) => {
      // Cancel any pending frame request
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }

      // Use setTimeout to ensure DOM has time to fully update
      setTimeout(() => {
        rafId.current = requestAnimationFrame(() => {
          try {
            // Get the editor DOM element
            const editorDOM = editor?.view.dom;
            if (!editorDOM) {
              console.warn("syncEditorItems: Editor DOM element not found");
              return;
            }

            // Find all rendered node view wrappers - direct children only
            const nodeWrappers = editorDOM.querySelectorAll(
              ".react-renderer > div[data-node-view-wrapper][data-id]"
            );

            // Extract IDs from DOM elements
            const domIds: string[] = [];
            nodeWrappers.forEach((wrapper) => {
              const id = (wrapper as HTMLElement).dataset.id;
              if (id) {
                domIds.push(id);
              }
            });

            // Update the state with the derived IDs from the DOM
            setItems((prevItems) => ({
              Editor: domIds,
              Sidebar: prevItems.Sidebar,
            }));
          } catch (error) {
            console.error("Error syncing editor items:", error);
            setItems((prev) => ({ ...prev })); // Avoid resetting state on error
          }
        });
      }, 50); // Small delay to let DOM updates settle
    }, []);

    useEffect(() => {
      const updateItems = () => {
        if (brandEditor) {
          syncEditorItems(brandEditor);
        }
      };

      // Listen to multiple editor events to catch all update scenarios
      brandEditor?.on("update", updateItems);
      brandEditor?.on("selectionUpdate", updateItems);
      brandEditor?.on("create", updateItems);
      brandEditor?.on("transaction", updateItems);

      // Initial call to populate items immediately if editor is ready
      if (brandEditor && !brandEditor.isDestroyed) {
        updateItems();
      }

      // Listen for node duplication events
      const handleNodeDuplicated = (_event: CustomEvent) => {
        updateItems();
      };
      document.addEventListener("node-duplicated", handleNodeDuplicated as EventListener);

      // Cleanup
      return () => {
        brandEditor?.off("update", updateItems);
        brandEditor?.off("selectionUpdate", updateItems);
        brandEditor?.off("create", updateItems);
        brandEditor?.off("transaction", updateItems);
        document.removeEventListener("node-duplicated", handleNodeDuplicated as EventListener);
        // Cancel any pending frame request on unmount
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
        }
      };
    }, [brandEditor, syncEditorItems]);

    return {
      syncEditorItems,
    }
}