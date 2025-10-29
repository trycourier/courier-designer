import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import { coordinateGetter, createOrDuplicateNode } from "@/components/utils";
import { setActiveCellDrag } from "@/components/extensions/Column/ColumnComponent";
import {
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { Node } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useAtom, useAtomValue } from "jotai";
import { useCallback, useMemo, useRef, useState } from "react";
import { templateEditorAtom } from "../store";

interface UseEditorDndProps {
  items: { Sidebar: string[]; Editor: UniqueIdentifier[] };
  setItems: React.Dispatch<React.SetStateAction<{ Sidebar: string[]; Editor: UniqueIdentifier[] }>>;
  editor?: Editor | null;
}
export const useEditorDnd = ({ items, setItems, editor }: UseEditorDndProps) => {
  const [lastPlaceholderIndex, setLastPlaceholderIndex] = useState<number | null>(null);
  const [activeDragType, setActiveDragType] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [dndMode, setDndMode] = useState<"outer" | "inner">("outer");

  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedToNewContainer = useRef(false);
  const cachedColumnBounds = useRef<DOMRect[]>([]);
  const cachedElementBounds = useRef<DOMRect[]>([]);

  const templateEditor = useAtomValue(templateEditorAtom);
  const [, setSelectedNode] = useAtom(selectedNodeAtom);

  // Use passed editor or fallback to brandEditor for backward compatibility
  const activeEditor = editor || templateEditor;

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter,
    })
  );

  const measuringProps = useMemo(
    () => ({
      droppable: {
        strategy: MeasuringStrategy.Always,
      },
    }),
    []
  );

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
          pos += doc.child(i)?.nodeSize;
        }
        return pos;
      } catch (error) {
        console.warn("Error calculating document position:", error);
        return activeEditor?.state.doc.content.size ?? 0;
      }
    },
    [activeEditor]
  );

  const findContainer = useCallback(
    (id: UniqueIdentifier) => {
      if (id in items) {
        return id as keyof typeof items;
      }
      return Object.keys(items).find((key) =>
        items[key as keyof typeof items].includes(id as string)
      ) as keyof typeof items | undefined;
    },
    [items]
  );

  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      if (activeId && activeId in items) {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container) => container.id in items
          ),
        });
      }

      const pointerIntersections = pointerWithin(args);
      const potentialIntersections =
        pointerIntersections.length > 0 ? pointerIntersections : rectIntersection(args);

      const validIntersections = potentialIntersections.filter(
        (intersection) => intersection.id !== undefined
      );

      let overId = getFirstCollision(validIntersections, "id");

      if (overId != null) {
        if (overId === "Editor") {
          lastOverId.current = overId;
          return [{ id: overId }];
        }

        if (overId in items) {
          const containerItems = items[overId as keyof typeof items];

          if (containerItems.length > 0) {
            const closestId = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (container) =>
                  container.id !== overId && containerItems.includes(container.id as string)
              ),
            })[0]?.id;

            if (closestId) {
              overId = closestId;
            }
          }
        }

        lastOverId.current = overId;
        return [{ id: overId }];
      }

      if (recentlyMovedToNewContainer.current) {
        lastOverId.current = activeId;
      }

      return lastOverId.current ? [{ id: lastOverId.current }] : [];
    },
    [activeId, items]
  );

  const onDragStartHandler = useCallback(
    ({ active }: DragStartEvent) => {
      setActiveId(active.id);
      // Set active drag type for all draggable sidebar items
      if (
        active.id === "text" ||
        active.id === "divider" ||
        active.id === "button" ||
        active.id === "heading" ||
        active.id === "image" ||
        active.id === "spacer" ||
        active.id === "customCode" ||
        active.id === "column"
      ) {
        setActiveDragType(active.id as string);
      }

      // Cache Column element bounds at drag start to avoid reflow issues
      const columnElements = activeEditor?.view.dom.querySelectorAll('[data-node-type="column"]');
      if (columnElements) {
        cachedColumnBounds.current = Array.from(columnElements).map((el) =>
          (el as HTMLElement).getBoundingClientRect()
        );
      }

      // Cache all element bounds at drag start to avoid reflow issues in outer mode
      const elements = activeEditor?.view.dom.querySelectorAll("[data-node-view-wrapper]");
      if (elements) {
        cachedElementBounds.current = Array.from(elements).map((el) =>
          (el as HTMLElement).getBoundingClientRect()
        );
      }
    },
    [activeEditor]
  );

  const onDragMoveHandler = useCallback(
    ({ active, over }: DragMoveEvent) => {
      if (!over) return;

      const overContainer = findContainer(over.id);
      const activeContainer = findContainer(active.id);

      // Skip if not dragging from sidebar to editor
      if (!(activeContainer === "Sidebar" && overContainer === "Editor")) return;

      const activeRect = active.rect.current;
      if (!activeRect?.translated) return;

      // Check if mouse is directly over a Column element using cached bounds
      // with a margin/dead zone at the edges to allow inserting elements between Columns
      let isOverColumn = false;
      const EDGE_MARGIN = 20; // pixels from top/bottom edge to create a "dead zone"

      // Use cached bounds to avoid DOM reflow issues
      for (let i = 0; i < cachedColumnBounds.current.length; i++) {
        const columnRect = cachedColumnBounds.current[i];

        // Create a dead zone at the top and bottom edges of each Column
        // to allow inserting elements between Columns
        const effectiveTop = columnRect.top + EDGE_MARGIN;
        const effectiveBottom = columnRect.bottom - EDGE_MARGIN;

        // Check if drag position is within column boundaries (with margins)
        if (
          activeRect.translated.left >= columnRect.left &&
          activeRect.translated.left <= columnRect.right &&
          activeRect.translated.top >= effectiveTop &&
          activeRect.translated.top <= effectiveBottom
        ) {
          isOverColumn = true;
          break;
        }
      }

      // Update mode based on whether we're over a column
      if (isOverColumn) {
        if (dndMode === "outer") {
          setDndMode("inner");
        }
        // Always cleanup when over column, regardless of mode state
        cleanupPlaceholder();
        setLastPlaceholderIndex(null);

        // Detect which cell we're over
        const cellElements = activeEditor?.view.dom.querySelectorAll('[data-column-cell="true"]');
        let activeCell: { columnId: string; cellIndex: number } | null = null;

        if (cellElements) {
          for (let i = 0; i < cellElements.length; i++) {
            const cellEl = cellElements[i] as HTMLElement;
            const cellRect = cellEl.getBoundingClientRect();

            // Check if drag position is within cell boundaries
            if (
              activeRect.translated.left >= cellRect.left &&
              activeRect.translated.left <= cellRect.right &&
              activeRect.translated.top >= cellRect.top &&
              activeRect.translated.top <= cellRect.bottom
            ) {
              const columnId = cellEl.getAttribute("data-column-id");
              const cellIndex = cellEl.getAttribute("data-cell-index");
              if (columnId && cellIndex !== null) {
                activeCell = { columnId, cellIndex: parseInt(cellIndex, 10) };
                break;
              }
            }
          }
        }

        setActiveCellDrag(activeCell);
        return;
      } else if (!isOverColumn && dndMode === "inner") {
        setDndMode("outer");
        setActiveCellDrag(null);
        // Don't return here - we want to show placeholder immediately when leaving column
      }

      // Use cached element bounds to avoid DOM reflow issues
      if (cachedElementBounds.current.length === 0) {
        return;
      }

      let targetIndex = cachedElementBounds.current.length;

      for (let i = 0; i < cachedElementBounds.current.length; i++) {
        const rect = cachedElementBounds.current[i];
        if (activeRect.translated.top < rect.top + rect.height / 2) {
          targetIndex = i;
          break;
        }
      }

      if (targetIndex !== lastPlaceholderIndex) {
        const tempId = `${active.id}_temp_${Date.now()}`;
        setLastPlaceholderIndex(targetIndex);

        requestAnimationFrame(() => {
          activeEditor?.commands.removeDragPlaceholder();
          const pos = getDocumentPosition(targetIndex);
          activeEditor?.commands.setDragPlaceholder({
            id: tempId,
            type: active.id as string,
            pos,
          });

          setItems((prev) => ({
            ...prev,
            Editor: [...prev.Editor.filter((id) => !id.toString().includes("_temp")), tempId],
          }));
        });
      }
    },
    [
      activeEditor,
      findContainer,
      getDocumentPosition,
      lastPlaceholderIndex,
      setItems,
      dndMode,
      cleanupPlaceholder,
    ]
  );

  const onDragEndHandler = useCallback(
    ({ active, over }: DragEndEvent) => {
      cleanupPlaceholder();
      setDndMode("outer");
      setActiveCellDrag(null);
      const overId = over?.id;

      if (!overId) {
        setItems((items) => ({
          ...items,
          Editor: items.Editor.filter((id) => !id.toString().includes("_temp")),
        }));
        setActiveId(null);
        setActiveDragType(null);
        return;
      }

      if (!activeEditor) {
        return;
      }

      const overContainer = findContainer(overId);
      const activeContainer = findContainer(active.id);

      // Check if we're dropping into a placeholder cell
      const draggedElement = activeEditor?.view.dom.querySelector(
        '[data-dnd-kit-draggable-id="' + active.id + '"]'
      );
      let targetPlaceholderCell: Element | null = null;

      console.log("[DragEnd] Checking for placeholder cell...");
      console.log("[DragEnd] draggedElement:", !!draggedElement);
      console.log("[DragEnd] activeContainer:", activeContainer);

      if (draggedElement) {
        const rect = draggedElement.getBoundingClientRect();
        console.log("[DragEnd] draggedElement rect:", rect);

        const elementsAtPoint = document.elementsFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2
        );
        console.log("[DragEnd] elementsAtPoint count:", elementsAtPoint.length);

        targetPlaceholderCell =
          elementsAtPoint.find((el) => el.getAttribute("data-placeholder-cell") === "true") || null;

        console.log("[DragEnd] targetPlaceholderCell found:", !!targetPlaceholderCell);
        if (targetPlaceholderCell) {
          console.log("[DragEnd] targetPlaceholderCell attributes:", {
            columnId: targetPlaceholderCell.getAttribute("data-column-id"),
            cellIndex: targetPlaceholderCell.getAttribute("data-cell-index"),
          });
        }
      }

      if (activeContainer === "Sidebar" && targetPlaceholderCell) {
        console.log("[DragEnd] ✅ Entering placeholder cell drop handler");
        // Handle dropping from sidebar into placeholder cell - need to create cell structure
        const columnId = targetPlaceholderCell.getAttribute("data-column-id");
        const cellIndexStr = targetPlaceholderCell.getAttribute("data-cell-index");

        if (columnId && cellIndexStr !== null) {
          const cellIndex = parseInt(cellIndexStr, 10);
          console.log("[DragEnd] Parsed columnId:", columnId, "cellIndex:", cellIndex);

          // Find the column node
          let columnPos: number | null = null;
          let foundColumnNode: Node | null = null;

          activeEditor.state.doc.descendants((node, pos) => {
            if (node.type.name === "column" && node.attrs.id === columnId) {
              columnPos = pos;
              foundColumnNode = node;
              console.log("[DragEnd] Found column node at pos:", pos);
              return false;
            }
            return true;
          });

          console.log(
            "[DragEnd] Column search complete. columnPos:",
            columnPos,
            "foundColumnNode:",
            !!foundColumnNode
          );

          if (columnPos !== null && foundColumnNode) {
            console.log("[DragEnd] Creating element node...");
            // Create the element that will go into the cell
            const newElementType = active.id as string;
            let newElementNode: Node | null = null;

            createOrDuplicateNode(activeEditor, newElementType, 0, undefined, (node) => {
              newElementNode = node as Node;
              console.log("[DragEnd] Element node created:", (node as Node).type.name);
            });

            console.log("[DragEnd] newElementNode:", !!newElementNode);

            if (newElementNode) {
              console.log("[DragEnd] Building cell structure...");
              // Create cell structure if column is empty
              const schema = activeEditor.schema;
              const columnNode = foundColumnNode as Node; // Type assertion for safety
              const columnsCount = (columnNode.attrs.columnsCount as number) || 2;

              console.log("[DragEnd] columnsCount:", columnsCount);

              // Create all cells for the row
              const cells = Array.from({ length: columnsCount }, (_, idx) => {
                if (idx === cellIndex) {
                  // This is the target cell - add the dropped element
                  return schema.nodes.columnCell.create(
                    {
                      index: idx,
                      columnId: columnId,
                    },
                    newElementNode
                  );
                } else {
                  // Other cells start empty with a paragraph
                  return schema.nodes.columnCell.create(
                    {
                      index: idx,
                      columnId: columnId,
                    },
                    schema.nodes.paragraph.create()
                  );
                }
              });

              // Create the columnRow with all cells
              const columnRow = schema.nodes.columnRow.create({}, cells);
              console.log("[DragEnd] Created columnRow with", cells.length, "cells");

              // Replace the empty column with one that has the row
              const newColumn = schema.nodes.column.create(columnNode.attrs, columnRow);
              console.log("[DragEnd] Created new column node");

              const tr = activeEditor.state.tr;
              tr.replaceWith(columnPos, columnPos + columnNode.nodeSize, newColumn);
              console.log("[DragEnd] Dispatching transaction...");
              activeEditor.view.dispatch(tr);

              console.log("[DragEnd] ✅ Drop complete! Setting selected node.");
              // Select the newly inserted node
              setSelectedNode(newElementNode);
            } else {
              console.log("[DragEnd] ❌ newElementNode is null, cannot create cells");
            }
          } else {
            console.log("[DragEnd] ❌ Column node not found");
          }
        } else {
          console.log("[DragEnd] ❌ Missing columnId or cellIndexStr");
        }
      } else if (
        activeContainer === "Sidebar" &&
        overContainer === "Editor" &&
        lastPlaceholderIndex !== null
      ) {
        // Handle new element insertion from sidebar into main editor
        const pos = getDocumentPosition(lastPlaceholderIndex);
        createOrDuplicateNode(activeEditor, active.id as string, pos, undefined, (node) => {
          setSelectedNode(node as Node);
        });
      } else if (activeContainer === overContainer && overContainer === "Editor") {
        // Handle reordering within Editor only (not Sidebar)
        const activeIndex = items[activeContainer as keyof typeof items].indexOf(
          active.id as string
        );
        const overIndex = items[overContainer as keyof typeof items].indexOf(overId as string);

        if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
          setItems((items) => ({
            ...items,
            [overContainer as keyof typeof items]: arrayMove(
              items[overContainer as keyof typeof items],
              activeIndex,
              overIndex
            ),
          }));

          const content = activeEditor.getJSON()?.content;

          if (Array.isArray(content)) {
            const newContent = [...content];
            const [movedItem] = newContent.splice(activeIndex, 1);
            newContent.splice(overIndex, 0, movedItem);

            activeEditor.view.dispatch(
              activeEditor.view.state.tr.replaceWith(
                0,
                activeEditor.view.state.doc.content.size,
                activeEditor.state.schema.nodeFromJSON({ type: "doc", content: newContent })
              )
            );
          }
        }
      }

      setActiveId(null);
      setActiveDragType(null);
      setLastPlaceholderIndex(null);
      cachedColumnBounds.current = [];
      cachedElementBounds.current = [];
    },
    [
      setItems,
      setSelectedNode,
      activeEditor,
      cleanupPlaceholder,
      findContainer,
      getDocumentPosition,
      lastPlaceholderIndex,
      items,
    ]
  );

  const onDragCancelHandler = useCallback(() => {
    cleanupPlaceholder();
    setActiveId(null);
    setActiveDragType(null);
    setDndMode("outer");
    setActiveCellDrag(null);
    cachedColumnBounds.current = [];
    cachedElementBounds.current = [];
  }, [cleanupPlaceholder]);

  return {
    dndProps: {
      sensors,
      collisionDetection: collisionDetectionStrategy,
      measuring: measuringProps,
      onDragStart: onDragStartHandler,
      onDragMove: onDragMoveHandler,
      onDragEnd: onDragEndHandler,
      onDragCancel: onDragCancelHandler,
    },
    activeDragType,
    activeId,
  };
};
