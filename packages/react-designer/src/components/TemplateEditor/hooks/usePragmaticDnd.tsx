import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { defaultButtonProps } from "@/components/extensions/Button/Button";
import { defaultColumnProps } from "@/components/extensions/Column/Column";
import { defaultCustomCodeProps } from "@/components/extensions/CustomCode/CustomCode";
import { defaultDividerProps, defaultSpacerProps } from "@/components/extensions/Divider/Divider";
import { defaultImageProps } from "@/components/extensions/ImageBlock/ImageBlock";
import { defaultTextBlockProps } from "@/components/extensions/TextBlock";
import { convertTiptapToElemental, updateElemental } from "@/lib/utils";
import type { TiptapDoc } from "@/types/tiptap.types";
import { v4 as uuidv4 } from "uuid";
import type { Editor } from "@tiptap/react";
import { useAtomValue, useSetAtom, useAtom } from "jotai";
import { useCallback, useRef, useState, useEffect } from "react";
import { templateEditorAtom, isDraggingAtom, templateEditorContentAtom } from "../store";
import { channelAtom } from "@/store";

type UniqueIdentifier = string | number;

interface UsePragmaticDndProps {
  items: { Sidebar: string[]; Editor: UniqueIdentifier[] };
  setItems: React.Dispatch<React.SetStateAction<{ Sidebar: string[]; Editor: UniqueIdentifier[] }>>;
  editor?: Editor | null;
}

interface DragData {
  id: UniqueIdentifier;
  type: "sidebar" | "editor";
  dragType?: string;
  index?: number;
}

interface DropData {
  id: UniqueIdentifier;
  type: "sidebar" | "editor";
  index: number;
}

export const usePragmaticDnd = ({ items, setItems, editor }: UsePragmaticDndProps) => {
  const [lastPlaceholderIndex] = useState<number | null>(null);
  const [activeDragType, setActiveDragType] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [dndMode] = useState<"outer" | "inner">("outer");

  const cachedColumnBounds = useRef<DOMRect[]>([]);
  const cachedElementBounds = useRef<DOMRect[]>([]);

  const templateEditor = useAtomValue(templateEditorAtom);
  const setIsDragging = useSetAtom(isDraggingAtom);
  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
  const channel = useAtomValue(channelAtom);

  const activeEditor = editor || templateEditor;

  const triggerAutoSave = useCallback(() => {
    if (!activeEditor) return;

    const tiptapDoc = activeEditor.getJSON() as TiptapDoc;
    const elementalElements = convertTiptapToElemental(tiptapDoc);

    const newContent = updateElemental(templateEditorContent, {
      channel: channel,
      elements: elementalElements,
    });

    setTemplateEditorContent(newContent);
  }, [activeEditor, channel, templateEditorContent, setTemplateEditorContent]);

  const cleanupPlaceholder = useCallback(() => {
    activeEditor?.commands.removeDragPlaceholder();
    setItems((prev) => ({
      ...prev,
      Editor: prev.Editor.filter((id) => !id.toString().includes("_temp")),
    }));
  }, [activeEditor?.commands, setItems]);

  const getDocumentPosition = useCallback(
    (index: number) => {
      try {
        const doc = activeEditor?.state.doc;
        if (!doc) {
          return 0;
        }

        if (index === 0) {
          return 0;
        }

        if (index >= doc.childCount) {
          return doc.content.size;
        }

        let pos = 0;
        for (let i = 0; i < Math.min(index, doc.childCount); i++) {
          const child = doc.child(i);
          pos += child.nodeSize;
        }

        return pos;
      } catch (error) {
        console.error("Error calculating document position:", error);
        return 0;
      }
    },
    [activeEditor?.state.doc]
  );

  const handleDrop = useCallback(
    (sourceData: DragData, targetData: DropData) => {
      try {
        console.log("[Pragmatic DnD] Handling drop START", { sourceData, targetData });
        console.log("[Pragmatic DnD] Current editor items:", items.Editor);

        // Skip doc structure log as it might be too large
        console.log("[Pragmatic DnD] Doc child count:", activeEditor?.state.doc.childCount);

        console.log("[Pragmatic DnD] About to check sidebar condition");
        // Handle sidebar to editor drop
        if (sourceData.type === "sidebar" && targetData.type === "editor") {
          console.log("[Pragmatic DnD] SIDEBAR TO EDITOR BRANCH");
          const dragType = sourceData.dragType;
          if (!dragType || !activeEditor) return;

          // Insert after the target element, not before
          const insertIndex = targetData.index + 1;
          const position = getDocumentPosition(insertIndex);

          // Create new node based on drag type
          let attrs = {};
          switch (dragType) {
            case "text":
              attrs = defaultTextBlockProps;
              break;
            case "heading":
              attrs = {};
              break;
            case "image":
              attrs = defaultImageProps;
              break;
            case "button":
              attrs = defaultButtonProps;
              break;
            case "divider":
              attrs = defaultDividerProps;
              break;
            case "spacer":
              attrs = defaultSpacerProps;
              break;
            case "customCode":
              attrs = defaultCustomCodeProps;
              break;
            case "column":
              attrs = defaultColumnProps;
              break;
          }

          // Map dragType to actual TipTap node type
          const nodeType =
            dragType === "text"
              ? "paragraph"
              : dragType === "image"
                ? "imageBlock"
                : dragType === "spacer"
                  ? "divider"
                  : dragType;

          activeEditor.commands.insertContentAt(position, {
            type: nodeType,
            attrs: { ...attrs, id: uuidv4() },
          });

          triggerAutoSave();
          return;
        }

        // Handle editor reordering
        console.log("[Pragmatic DnD] Checking reorder condition:", {
          sourceType: sourceData.type,
          targetType: targetData.type,
          isReorder: sourceData.type === "editor" && targetData.type === "editor",
        });

        if (sourceData.type === "editor" && targetData.type === "editor") {
          console.log("[Pragmatic DnD] Starting reorder logic");

          if (!activeEditor) {
            console.log("[Pragmatic DnD] No active editor, returning");
            return;
          }

          const oldIndex = items.Editor.findIndex((id) => id === sourceData.id);

          // Calculate the new index
          let newIndex: number;
          if (targetData.index === undefined) {
            // No drop target at all - insert at end
            console.log("[Pragmatic DnD] No specific drop target, inserting at end");
            newIndex = activeEditor.state.doc.childCount;
          } else if (targetData.index === -1) {
            // Special case: dropping above first element
            console.log("[Pragmatic DnD] Dropping above first element");
            newIndex = 0;
          } else {
            // When dropping ON an element, insert AFTER it (consistent with sidebar-to-editor behavior)
            newIndex = targetData.index + 1;
          }

          console.log("[Pragmatic DnD] Reordering:", {
            sourceId: sourceData.id,
            oldIndex,
            targetIndex: targetData.index,
            newIndex: newIndex,
            adjustment: "+1 to insert AFTER target",
            willMove: oldIndex !== -1 && oldIndex !== newIndex,
          });

          if (oldIndex === -1) {
            console.log("[Pragmatic DnD] oldIndex is -1, item not found, returning");
            return;
          }

          if (oldIndex === newIndex) {
            console.log("[Pragmatic DnD] oldIndex === newIndex, no move needed, returning");
            return;
          }

          // Reorder items in state
          const newEditorItems = [...items.Editor];
          const [movedItem] = newEditorItems.splice(oldIndex, 1);
          newEditorItems.splice(newIndex, 0, movedItem);

          setItems({
            ...items,
            Editor: newEditorItems,
          });

          // Reorder in editor
          const sourcePos = getDocumentPosition(oldIndex);
          const node = activeEditor.state.doc.nodeAt(sourcePos);

          if (node) {
            // When moving an item, we need to handle position shifts
            // Note: newIndex is already adjusted to insert AFTER the target (+1 at line 176)
            // If moving down: delete first, target position stays the same (accounting for deletion)
            // If moving up: insert first, then delete the source (accounting for the insertion)

            if (newIndex > oldIndex) {
              // Moving down: delete source first, then insert at target
              // newIndex already points to position after target, so no need to add 1 again
              const targetPosBeforeDeletion = getDocumentPosition(newIndex);
              activeEditor
                .chain()
                .deleteRange({ from: sourcePos, to: sourcePos + node.nodeSize })
                .insertContentAt(targetPosBeforeDeletion - node.nodeSize, node.toJSON())
                .run();
            } else {
              // Moving up: insert at target position first, then delete source (position shifts)
              // newIndex already points to position after target
              const targetPos = getDocumentPosition(newIndex);
              activeEditor
                .chain()
                .insertContentAt(targetPos, node.toJSON())
                .deleteRange({ from: sourcePos + node.nodeSize, to: sourcePos + node.nodeSize * 2 })
                .run();
            }
          }

          triggerAutoSave();
        }
      } catch (error) {
        console.error("[Pragmatic DnD] Error in handleDrop:", error);
      }
    },
    [items, activeEditor, setItems, getDocumentPosition, triggerAutoSave]
  );

  // Setup global monitor for drag events
  useEffect(() => {
    return monitorForElements({
      onDragStart: ({ source }) => {
        const data = source.data as unknown as DragData;
        console.log("[Pragmatic DnD] Drag Start", data);
        setIsDragging(true);
        setActiveId(data.id);
        if (data.dragType) {
          setActiveDragType(data.dragType);
        }

        // Cache element bounds at drag start
        const columnElements = activeEditor?.view.dom.querySelectorAll('[data-node-type="column"]');
        if (columnElements) {
          cachedColumnBounds.current = Array.from(columnElements).map((el) =>
            (el as HTMLElement).getBoundingClientRect()
          );
        }

        const allElements = activeEditor?.view.dom.querySelectorAll("[data-node-view-wrapper]");
        if (allElements) {
          const seenMidpoints = new Set<number>();
          const elements = Array.from(allElements).filter((el) => {
            const htmlEl = el as HTMLElement;
            const parent = htmlEl.parentElement;
            if (parent?.hasAttribute("data-column-cell")) {
              return false;
            }

            const rect = htmlEl.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;

            if (seenMidpoints.has(Math.round(midpoint))) {
              return false;
            }

            seenMidpoints.add(Math.round(midpoint));
            return true;
          });

          cachedElementBounds.current = elements.map((el) =>
            (el as HTMLElement).getBoundingClientRect()
          );
        }
      },

      onDrop: ({ source, location }) => {
        const sourceData = source.data as unknown as DragData;
        const dropTarget = location.current.dropTargets[0];

        console.log("[Pragmatic DnD] Drop", {
          sourceData,
          dropTarget: dropTarget?.data,
          allDropTargets: location.current.dropTargets.map((t) => t.data),
        });

        if (!dropTarget) {
          console.log("[Pragmatic DnD] No drop target, cleaning up");
          cleanupPlaceholder();
          setIsDragging(false);
          setActiveId(null);
          setActiveDragType(null);
          return;
        }

        let targetData = dropTarget.data as unknown as DropData;

        // Extract the closest edge from the drop target data
        const closestEdge = extractClosestEdge(dropTarget.data);
        console.log("[Pragmatic DnD] Closest edge:", closestEdge);

        // If we have edge information, use it to determine insert position
        if (closestEdge && targetData.index !== undefined) {
          // Note: handleDrop will add +1 to insert AFTER the target
          // - "top" edge: we want to insert BEFORE this element, so use previous element's index
          // - "bottom" edge: we want to insert AFTER this element, so use this element's index
          const adjustedIndex =
            closestEdge === "top" ? Math.max(0, targetData.index - 1) : targetData.index;

          console.log("[Pragmatic DnD] Using edge-based positioning:", {
            edge: closestEdge,
            originalIndex: targetData.index,
            adjustedIndex,
            explanation: closestEdge === "top" ? "Insert BEFORE element" : "Insert AFTER element",
          });

          targetData = {
            ...targetData,
            index: adjustedIndex,
          };
        }
        // If dropping on the general editor area (no specific index)
        else if (targetData.index === undefined) {
          console.log("[Pragmatic DnD] No specific drop target, using coordinates to find closest");

          // Use cached element bounds and mouse coordinates to find closest element
          const input = location.current.input;
          const mouseY = input.clientY;

          console.log("[Pragmatic DnD] Mouse Y:", mouseY);
          console.log("[Pragmatic DnD] Cached bounds count:", cachedElementBounds.current.length);

          if (cachedElementBounds.current.length > 0) {
            // Find the element whose midpoint is closest to the mouse position
            let closestIndex = 0;
            let closestDistance = Infinity;

            cachedElementBounds.current.forEach((bounds, index) => {
              const midpoint = bounds.top + bounds.height / 2;
              const distance = Math.abs(mouseY - midpoint);

              if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
              }
            });

            // Check if mouse is above or below the closest element
            const closestBounds = cachedElementBounds.current[closestIndex];
            const closestMidpoint = closestBounds.top + closestBounds.height / 2;
            const isBelow = mouseY >= closestMidpoint;

            // Calculate "element to drop ON" (handleDrop will add +1 to insert after)
            // - If below midpoint: drop ON this element (handleDrop adds +1 to insert after)
            // - If above midpoint: drop ON previous element (handleDrop adds +1 to insert at current position)
            //   Special case: if closestIndex is 0 and above, we want position 0, so use -1
            //   (but -1 is invalid, so we'll use 0 and adjust handleDrop logic)
            const dropOnIndex = isBelow ? closestIndex : closestIndex - 1;

            console.log("[Pragmatic DnD] Calculated drop index:", {
              closestIndex,
              closestMidpoint,
              mouseY,
              isBelow,
              dropOnIndex,
              willInsertAt: isBelow ? closestIndex + 1 : closestIndex,
            });

            targetData = {
              ...targetData,
              index: dropOnIndex,
              // Add a flag to indicate this came from coordinate calculation
              fromCoordinates: true,
            } as unknown as DropData;
          } else {
            // Fallback: insert at end
            console.log("[Pragmatic DnD] No cached bounds, inserting at end");
            targetData = {
              ...targetData,
              index: activeEditor?.state.doc.childCount || 0,
            };
          }
        }

        handleDrop(sourceData, targetData);

        setIsDragging(false);
        setActiveId(null);
        setActiveDragType(null);
        cleanupPlaceholder();
      },
    });
  }, [activeEditor, setIsDragging, cleanupPlaceholder, setActiveId, setActiveDragType, handleDrop]);

  return {
    activeId,
    activeDragType,
    dndMode,
    lastPlaceholderIndex,
    cleanupPlaceholder,
  };
};
