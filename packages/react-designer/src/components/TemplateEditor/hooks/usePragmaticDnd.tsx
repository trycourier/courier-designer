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

interface ColumnDropData {
  type: "column-cell";
  columnId: string;
  index: number;
  isEmpty?: boolean;
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

  const createNodeFromDragType = useCallback((dragType: string) => {
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

    const nodeType =
      dragType === "text"
        ? "paragraph"
        : dragType === "image"
          ? "imageBlock"
          : dragType === "spacer"
            ? "divider"
            : dragType;

    return {
      type: nodeType,
      attrs: { ...attrs, id: uuidv4() },
    };
  }, []);

  const handleColumnDrop = useCallback(
    (sourceData: DragData, targetData: ColumnDropData) => {
      if (!activeEditor) return;

      const { columnId, index: cellIndex, isEmpty } = targetData;
      let contentToInsert: any = null;
      let sourceNodeSize = 0;
      let sourcePos = -1;

      // Handle Source
      if (sourceData.type === "sidebar") {
        if (!sourceData.dragType) return;
        contentToInsert = createNodeFromDragType(sourceData.dragType);
      } else if (sourceData.type === "editor") {
        // Find the node in the editor
        const oldIndex = items.Editor.findIndex((id) => id === sourceData.id);
        if (oldIndex === -1) return;

        sourcePos = getDocumentPosition(oldIndex);
        const node = activeEditor.state.doc.nodeAt(sourcePos);

        if (node) {
          contentToInsert = node.toJSON();
          sourceNodeSize = node.nodeSize;

          // Update items state to remove from root list
          const newEditorItems = [...items.Editor];
          newEditorItems.splice(oldIndex, 1);
          setItems({ ...items, Editor: newEditorItems });
        }
      }

      if (!contentToInsert) return;

      // Find target column
      let columnPos: number = -1;
      let columnNode: any = null;

      activeEditor.state.doc.descendants((node, pos) => {
        if (node.type.name === "column" && node.attrs.id === columnId) {
          columnPos = pos;
          columnNode = node;
          return false;
        }
        return true;
      });

      if (columnPos === -1 || !columnNode) return;

      // If source was editor node, we need to handle position shifts
      // If source is BEFORE target column, columnPos needs adjustment
      if (sourcePos !== -1 && sourcePos < columnPos) {
        columnPos -= sourceNodeSize;
      }

      const tr = activeEditor.state.tr;

      // If source was editor node, delete it first
      if (sourcePos !== -1) {
        tr.delete(sourcePos, sourcePos + sourceNodeSize);
      }

      if (isEmpty) {
        // Create structure for empty column
        const schema = activeEditor.schema;
        const cells = Array.from({ length: columnNode.attrs.columnsCount }, (_, idx) => {
          const cell = schema.nodes.columnCell.create(
            {
              index: idx,
              columnId: columnId,
              isEditorMode: false,
            },
            idx === cellIndex ? [schema.nodeFromJSON(contentToInsert)] : []
          );
          return cell;
        });
        const columnRow = schema.nodes.columnRow.create({}, cells);

        // Replace content of column
        tr.replaceWith(columnPos + 1, columnPos + columnNode.nodeSize - 1, columnRow);
      } else {
        // Insert into existing cell
        // We need to map the position relative to the potentially shifted columnPos
        let currentPos = columnPos + 1;

        columnNode.content.forEach((rowNode: any) => {
          if (rowNode.type.name === "columnRow") {
            let cellPosInRow = currentPos + 1;
            rowNode.content.forEach((cellNode: any, _offset: number, index: number) => {
              if (index === cellIndex) {
                // Found the cell. Insert at end of cell content.
                const insertPos = cellPosInRow + cellNode.nodeSize - 1;
                tr.insert(insertPos, activeEditor.schema.nodeFromJSON(contentToInsert));
              }
              cellPosInRow += cellNode.nodeSize;
            });
          }
          currentPos += rowNode.nodeSize;
        });
      }

      activeEditor.view.dispatch(tr);
      triggerAutoSave();
    },
    [activeEditor, items, setItems, getDocumentPosition, createNodeFromDragType, triggerAutoSave]
  );

  const handleDrop = useCallback(
    (sourceData: DragData, targetData: DropData) => {
      try {
        // Handle sidebar to editor drop
        if (sourceData.type === "sidebar" && targetData.type === "editor") {
          const dragType = sourceData.dragType;
          if (!dragType || !activeEditor) return;

          // Insert after the target element, not before
          const insertIndex = targetData.index + 1;
          const position = getDocumentPosition(insertIndex);

          const nodeData = createNodeFromDragType(dragType);

          activeEditor.commands.insertContentAt(position, nodeData);

          triggerAutoSave();
          return;
        }

        if (sourceData.type === "editor" && targetData.type === "editor") {
          if (!activeEditor) {
            return;
          }

          const oldIndex = items.Editor.findIndex((id) => id === sourceData.id);

          // Calculate the new index
          let newIndex: number;
          if (targetData.index === undefined) {
            // No drop target at all - insert at end
            newIndex = activeEditor.state.doc.childCount;
          } else if (targetData.index === -1) {
            // Special case: dropping above first element
            newIndex = 0;
          } else {
            // When dropping ON an element, insert AFTER it (consistent with sidebar-to-editor behavior)
            newIndex = targetData.index + 1;
          }

          if (oldIndex === -1) {
            return;
          }

          if (oldIndex === newIndex) {
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
    [items, activeEditor, setItems, getDocumentPosition, triggerAutoSave, createNodeFromDragType]
  );

  // Setup global monitor for drag events
  useEffect(() => {
    return monitorForElements({
      onDragStart: ({ source }) => {
        const data = source.data as unknown as DragData;
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

        if (!dropTarget) {
          cleanupPlaceholder();
          setIsDragging(false);
          setActiveId(null);
          setActiveDragType(null);
          return;
        }

        const rawTargetData = dropTarget.data as unknown as DropData | ColumnDropData;

        // Handle column cell drop
        if (rawTargetData.type === "column-cell") {
          handleColumnDrop(sourceData, rawTargetData as ColumnDropData);

          setIsDragging(false);
          setActiveId(null);
          setActiveDragType(null);
          cleanupPlaceholder();
          return;
        }

        let targetData = rawTargetData as DropData;

        // Extract the closest edge from the drop target data
        const closestEdge = extractClosestEdge(dropTarget.data);

        // If we have edge information, use it to determine insert position
        if (closestEdge && targetData.index !== undefined) {
          // Note: handleDrop will add +1 to insert AFTER the target (except for -1)
          // - "top" edge: we want to insert BEFORE this element, so use previous element's index
          //   (can be -1 which handleDrop handles as position 0)
          // - "bottom" edge: we want to insert AFTER this element, so use this element's index
          const adjustedIndex = closestEdge === "top" ? targetData.index - 1 : targetData.index;

          targetData = {
            ...targetData,
            index: adjustedIndex,
          };
        }
        // If dropping on the general editor area (no specific index)
        else if (targetData.index === undefined) {
          // Use cached element bounds and mouse coordinates to find closest element
          const input = location.current.input;
          const mouseY = input.clientY;

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

            targetData = {
              ...targetData,
              index: dropOnIndex,
              // Add a flag to indicate this came from coordinate calculation
              fromCoordinates: true,
            } as unknown as DropData;
          } else {
            // Fallback: insert at end
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
  }, [
    activeEditor,
    setIsDragging,
    cleanupPlaceholder,
    setActiveId,
    setActiveDragType,
    handleDrop,
    handleColumnDrop,
  ]);

  return {
    activeId,
    activeDragType,
    dndMode,
    lastPlaceholderIndex,
    cleanupPlaceholder,
  };
};
