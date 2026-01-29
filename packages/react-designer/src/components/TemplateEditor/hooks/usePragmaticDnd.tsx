import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { defaultBlockquoteProps } from "@/components/extensions/Blockquote/Blockquote";
import { defaultButtonProps } from "@/components/extensions/Button/Button";
import { defaultColumnProps } from "@/components/extensions/Column/Column";
import { defaultCustomCodeProps } from "@/components/extensions/CustomCode/CustomCode";
import { defaultDividerProps, defaultSpacerProps } from "@/components/extensions/Divider/Divider";
import { defaultImageProps } from "@/components/extensions/ImageBlock/ImageBlock";
import { defaultListProps } from "@/components/extensions/List/List";
import { defaultTextBlockProps } from "@/components/extensions/TextBlock";
import { convertTiptapToElemental, updateElemental } from "@/lib/utils";
import type { TiptapDoc } from "@/types/tiptap.types";
import { v4 as uuidv4 } from "uuid";
import type { Editor } from "@tiptap/react";
import type { Node } from "@tiptap/pm/model";
import { useAtomValue, useSetAtom, useAtom } from "jotai";
import { useCallback, useRef, useState, useEffect } from "react";
import {
  templateEditorAtom,
  isDraggingAtom,
  templateEditorContentAtom,
  pendingAutoSaveAtom,
  blockPresetsAtom,
  blockDefaultsAtom,
  type VisibleBlockItem,
  type BlockElementType,
} from "../store";
import { channelAtom } from "@/store";

type UniqueIdentifier = string | number;

// Type for TipTap node JSON representation (as returned by node.toJSON())
interface NodeJSON {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: NodeJSON[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

// Type for node creation data (as returned by createNodeFromDragType)
interface NodeCreationData {
  type: string;
  attrs: Record<string, unknown> & { id: string };
  content?: NodeJSON[];
}

// Union type for content that can be inserted
type ContentToInsert = NodeJSON | NodeCreationData;

interface UsePragmaticDndProps {
  items: { Sidebar: VisibleBlockItem[]; Editor: UniqueIdentifier[] };
  setItems: React.Dispatch<
    React.SetStateAction<{ Sidebar: VisibleBlockItem[]; Editor: UniqueIdentifier[] }>
  >;
  editor?: Editor | null;
}

interface DragData {
  id: UniqueIdentifier;
  type: "sidebar" | "editor" | "column-cell-item" | "nested-drag";
  dragType?: string;
  index?: number;
  pos?: number;
  columnId?: string;
  cellIndex?: number;
}

interface DropData {
  id: UniqueIdentifier;
  type: "sidebar" | "editor" | "column-cell-item" | "nested-drag";
  index: number;
  pos?: number;
  fromCoordinates?: boolean;
  insertPos?: number;
  columnId?: string;
  cellIndex?: number;
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
  const setPendingAutoSave = useSetAtom(pendingAutoSaveAtom);
  const channel = useAtomValue(channelAtom);
  const blockPresets = useAtomValue(blockPresetsAtom);
  const blockDefaults = useAtomValue(blockDefaultsAtom);

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
    setPendingAutoSave(newContent);
  }, [activeEditor, channel, templateEditorContent, setTemplateEditorContent, setPendingAutoSave]);

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

  const createNodeFromDragType = useCallback(
    (dragType: string): NodeCreationData => {
      // Check if this is a preset reference (format: "blockType:presetKey")
      const isPresetReference = dragType.includes(":");
      let baseBlockType = dragType;
      let presetKey: string | null = null;

      if (isPresetReference) {
        const parts = dragType.split(":");
        baseBlockType = parts[0];
        presetKey = parts[1];
      }

      // Get base attributes for the block type
      let attrs: Record<string, unknown> = {};
      switch (baseBlockType) {
        case "text":
          attrs = defaultTextBlockProps as unknown as Record<string, unknown>;
          break;
        case "heading":
          attrs = {};
          break;
        case "image":
          attrs = defaultImageProps as unknown as Record<string, unknown>;
          break;
        case "button":
          attrs = defaultButtonProps as unknown as Record<string, unknown>;
          break;
        case "divider":
          attrs = defaultDividerProps as unknown as Record<string, unknown>;
          break;
        case "spacer":
          attrs = defaultSpacerProps as unknown as Record<string, unknown>;
          break;
        case "customCode":
          attrs = defaultCustomCodeProps as unknown as Record<string, unknown>;
          break;
        case "column":
          attrs = defaultColumnProps as unknown as Record<string, unknown>;
          break;
        case "blockquote":
          attrs = defaultBlockquoteProps as unknown as Record<string, unknown>;
          break;
        case "list":
          attrs = defaultListProps as unknown as Record<string, unknown>;
          break;
      }

      // Apply block defaults if configured
      const defaults = blockDefaults[baseBlockType as BlockElementType];
      if (defaults) {
        attrs = { ...attrs, ...defaults };
      }

      // Apply preset attributes if this is a preset
      if (isPresetReference && presetKey) {
        const preset = blockPresets.find((p) => p.type === baseBlockType && p.key === presetKey);
        if (preset?.attributes) {
          attrs = { ...attrs, ...preset.attributes };
        }
      }

      // Map drag type to TipTap node type
      const nodeType =
        baseBlockType === "text"
          ? "paragraph"
          : baseBlockType === "image"
            ? "imageBlock"
            : baseBlockType === "spacer"
              ? "divider"
              : baseBlockType;

      const result: NodeCreationData = {
        type: nodeType,
        attrs: { ...attrs, id: uuidv4() },
      };

      // Add default content for button
      if (baseBlockType === "button") {
        let buttonText = defaultButtonProps.label;
        if (isPresetReference && presetKey) {
          const preset = blockPresets.find((p) => p.type === baseBlockType && p.key === presetKey);
          if (preset?.label) {
            buttonText = preset.label;
          }
        }
        result.content = [{ type: "text", text: buttonText }];
      }

      // Add default content for list (must have at least one list item with a paragraph)
      if (baseBlockType === "list") {
        result.content = [
          {
            type: "listItem",
            attrs: { id: uuidv4() },
            content: [
              {
                type: "paragraph",
                attrs: { id: uuidv4() },
                content: [],
              },
            ],
          },
        ];
      }

      return result;
    },
    [blockDefaults, blockPresets]
  );

  const handleColumnDrop = useCallback(
    (sourceData: DragData, targetData: ColumnDropData) => {
      if (!activeEditor) return;

      const { columnId, index: cellIndex, isEmpty } = targetData;
      let contentToInsert: ContentToInsert | null = null;
      let sourceNodeSize = 0;
      let sourcePos = -1;

      // Handle Source
      if (sourceData.type === "sidebar") {
        if (!sourceData.dragType) return;
        contentToInsert = createNodeFromDragType(sourceData.dragType);
      } else if (sourceData.type === "editor") {
        // Find the node in the editor (recursive search)
        activeEditor.state.doc.descendants((node, pos) => {
          if (node.attrs.id === sourceData.id) {
            sourcePos = pos;
            contentToInsert = node.toJSON();
            sourceNodeSize = node.nodeSize;
            return false;
          }
          return true;
        });

        // Fallback to items lookup if not found via descendants (e.g. if top level)
        if (sourcePos === -1) {
          const oldIndex = items.Editor.findIndex((id) => id === sourceData.id);
          if (oldIndex !== -1) {
            sourcePos = getDocumentPosition(oldIndex);
            const node = activeEditor.state.doc.nodeAt(sourcePos);
            if (node) {
              contentToInsert = node.toJSON();
              sourceNodeSize = node.nodeSize;
            }
          }
        }

        // Clean up items array if we found the item
        if (sourcePos !== -1) {
          const newEditorItems = items.Editor.filter((id) => id !== sourceData.id);
          if (newEditorItems.length !== items.Editor.length) {
            setItems({ ...items, Editor: newEditorItems });
          }
        }
      }

      if (!contentToInsert) return;

      // Find target column
      let columnPos: number = -1;
      let columnNode: Node | null = null;

      activeEditor.state.doc.descendants((node, pos) => {
        if (node.type.name === "column" && node.attrs.id === columnId) {
          columnPos = pos;
          columnNode = node;
          return false;
        }
        return true;
      });

      if (columnPos === -1 || !columnNode) return;

      // Type guard: ensure columnNode is not null
      const columnNodeTyped = columnNode as Node;

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
        const cells = Array.from({ length: columnNodeTyped.attrs.columnsCount }, (_, idx) => {
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
        tr.replaceWith(columnPos + 1, columnPos + columnNodeTyped.nodeSize - 1, columnRow);
      } else {
        // Insert into existing cell
        // We need to map the position relative to the potentially shifted columnPos
        let currentPos = columnPos + 1;

        columnNodeTyped.content.forEach((rowNode: Node) => {
          if (rowNode.type.name === "columnRow") {
            let cellPosInRow = currentPos + 1;
            rowNode.content.forEach((cellNode: Node, _offset: number, index: number) => {
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

  // Helper to adjust position if it's inside a list - move it after the list
  const adjustPositionIfInsideList = useCallback(
    (position: number): number => {
      if (!activeEditor) return position;

      const $pos = activeEditor.state.doc.resolve(position);

      // Check if we're inside a list node
      for (let d = $pos.depth; d >= 0; d--) {
        const node = $pos.node(d);
        if (node.type.name === "list") {
          // Found a list ancestor - return position after the list
          const listStart = $pos.before(d);
          return listStart + node.nodeSize;
        }
      }

      return position;
    },
    [activeEditor]
  );

  const handleDrop = useCallback(
    (sourceData: DragData, targetData: DropData) => {
      try {
        // Handle sidebar to editor drop
        if (
          sourceData.type === "sidebar" &&
          (targetData.type === "editor" ||
            targetData.type === "column-cell-item" ||
            targetData.type === "nested-drag")
        ) {
          const dragType = sourceData.dragType;
          if (!dragType || !activeEditor) return;

          // Use insertPos if available (calculated from pos + edge), otherwise legacy index logic
          let position = targetData.insertPos;

          if (position === undefined) {
            // Fallback to index logic (ONLY valid for top-level editor)
            if (targetData.type === "editor") {
              const insertIndex = targetData.index + 1;
              position = getDocumentPosition(insertIndex);
            } else {
              // Nested drop but no position calculated? Should not happen with updated SortableItemWrapper
              console.warn("Nested drop without position data");
              return;
            }
          }

          // Prevent dropping inside lists - adjust position to after the list
          position = adjustPositionIfInsideList(position);

          const nodeData = createNodeFromDragType(dragType);

          activeEditor.commands.insertContentAt(position, nodeData);

          // Update items list if inserted at top level
          const insertedAtTopLevel = activeEditor.state.doc.resolve(position).depth === 0;
          if (insertedAtTopLevel) {
            // We rely on useSyncEditorItems to pick this up or we can fetch id and insert
            // But nodeData.attrs.id is available
            // We can update items state optimistically
            // Find new index in doc
            const newIndex = activeEditor.state.doc.resolve(position).index(0);
            const newEditorItems = [...items.Editor];
            // Should strictly be at newIndex, but we might have sync issues.
            // Safe way: trigger sync or wait.
            // For now, let's trust syncing or just append if index is out of bounds
            if (newIndex <= newEditorItems.length) {
              newEditorItems.splice(newIndex, 0, nodeData.attrs.id);
              setItems({ ...items, Editor: newEditorItems });
            }
          }

          triggerAutoSave();
          return;
        }

        if (
          (sourceData.type === "editor" ||
            sourceData.type === "column-cell-item" ||
            sourceData.type === "nested-drag") &&
          (targetData.type === "editor" ||
            targetData.type === "column-cell-item" ||
            targetData.type === "nested-drag")
        ) {
          if (!activeEditor) {
            return;
          }

          // Find source node (recursive)
          let sourcePos = -1;
          let sourceNode: Node | null = null;

          if (sourceData.pos !== undefined) {
            sourcePos = sourceData.pos;
            sourceNode = activeEditor.state.doc.nodeAt(sourcePos);
          }

          if (sourcePos === -1 || !sourceNode) {
            activeEditor.state.doc.descendants((node, pos) => {
              if (node.attrs.id === sourceData.id) {
                sourcePos = pos;
                sourceNode = node;
                return false;
              }
              return true;
            });
          }

          if (sourcePos === -1 || !sourceNode) {
            // Try fallback to items index
            const oldIndex = items.Editor.findIndex((id) => id === sourceData.id);
            if (oldIndex !== -1) {
              sourcePos = getDocumentPosition(oldIndex);
              sourceNode = activeEditor.state.doc.nodeAt(sourcePos);
            }
          }

          if (!sourceNode || sourcePos === -1) return;

          // Determine Target Position
          let targetPos = targetData.insertPos;

          if (targetPos === undefined) {
            // Fallback to legacy index logic (only works for top level)
            // Calculate new index
            let newIndex: number;
            if (targetData.index === undefined) {
              newIndex = activeEditor.state.doc.childCount;
            } else if (targetData.index === -1) {
              newIndex = 0;
            } else {
              newIndex = targetData.index + 1;
            }
            targetPos = getDocumentPosition(newIndex);
          }

          if (targetPos === undefined) return;

          // Prevent dropping inside lists - adjust position to after the list
          targetPos = adjustPositionIfInsideList(targetPos);

          // Prevent dropping into itself
          if (targetPos > sourcePos && targetPos < sourcePos + sourceNode.nodeSize) {
            return;
          }

          // Check if we are moving within the same parent (reordering)
          // This helps to keep clean transaction
          // const $source = activeEditor.state.doc.resolve(sourcePos);
          // const $target = activeEditor.state.doc.resolve(targetPos);
          // const isSameParent = $source.parent === $target.parent;

          // Execute Move
          if (targetPos > sourcePos) {
            // Moving down: delete first, then insert (targetPos shifts left)
            // targetPos is currently "after" the target node.
            // If we delete source, everything after source shifts by -sourceNodeSize.
            const adjustedTargetPos = targetPos - sourceNode.nodeSize;

            activeEditor
              .chain()
              .deleteRange({ from: sourcePos, to: sourcePos + sourceNode.nodeSize })
              .insertContentAt(adjustedTargetPos, sourceNode.toJSON())
              .run();
          } else {
            // Moving up: insert first, then delete (sourcePos shifts right)
            // targetPos is "before" target node (or wherever we want to insert).
            // sourcePos will shift by +sourceNodeSize after insertion.

            activeEditor
              .chain()
              .insertContentAt(targetPos, sourceNode.toJSON())
              .deleteRange({
                from: sourcePos + sourceNode.nodeSize,
                to: sourcePos + sourceNode.nodeSize * 2,
              })
              .run();
          }

          // Update Items State (Only if at top level, because items.Editor tracks only top level)
          // 1. Check if source was at top level
          const sourceWasTopLevel = items.Editor.includes(sourceData.id as string);

          if (sourceWasTopLevel) {
            const newEditorItems = items.Editor.filter((id) => id !== sourceData.id);
            setItems({ ...items, Editor: newEditorItems });
          }

          // 2. Check if target is top level
          // We use a heuristic here: if we insert at root, we update items
          // Note: We might need to wait for sync, but optimistic update is better
          const isTargetTopLevel = activeEditor.state.doc.resolve(targetPos).depth === 0;

          if (isTargetTopLevel) {
            // We need to re-fetch items or calculate index
            // Let's rely on the useSyncEditorItems hook to eventually sync
            // But for immediate feedback, we could try to insert
            // However, if we moved from nested to top, we need to add
            // If we moved from top to nested, we need to remove (handled above)

            if (!sourceWasTopLevel) {
              // Moved from nested to top level - add to items
              // Position is tricky to map to index without document inspection
              // Let's just let sync hook handle it to avoid index errors
            } else {
              // Moved from top to top - we removed above, now need to add back at new index
              // This logic is complex to get right with indices.
              // Recommendation: Let useSyncEditorItems handle the state update for top level items
              // We triggered the transaction, so the DOM and Doc will update, then hook will fire.
            }
          }

          triggerAutoSave();
        }
      } catch (error) {
        console.error("[Pragmatic DnD] Error in handleDrop:", error);
      }
    },
    [
      items,
      activeEditor,
      setItems,
      getDocumentPosition,
      triggerAutoSave,
      createNodeFromDragType,
      adjustPositionIfInsideList,
    ]
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

        // Calculate insertPos based on pos and closestEdge if available
        if (targetData.pos !== undefined && closestEdge && activeEditor) {
          const targetNode = activeEditor.state.doc.nodeAt(targetData.pos);
          if (targetNode) {
            if (closestEdge === "top") {
              targetData.insertPos = targetData.pos;
            } else if (closestEdge === "bottom") {
              targetData.insertPos = targetData.pos + targetNode.nodeSize;
            }
          }
        }

        // Check if we are dropping into a nested context (inside a column cell)
        // If so, we shouldn't rely on index-based logic that assumes top-level structure
        // We should rely on insertPos which is more accurate for nested structures
        // Note: targetData.type === "nested-drag" indicates nested context

        // If we have edge information but no insertPos yet (fallback to index), use it to determine insert position
        if (targetData.insertPos === undefined && closestEdge && targetData.index !== undefined) {
          // Skip index adjustment for nested drops if we rely on position
          // But if we do have index, standard logic applies

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
        else if (targetData.index === undefined && targetData.insertPos === undefined) {
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
