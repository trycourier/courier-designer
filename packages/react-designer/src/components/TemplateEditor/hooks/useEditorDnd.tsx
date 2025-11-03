import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import { coordinateGetter, createOrDuplicateNode } from "@/components/utils";
import { setActiveCellDrag } from "@/components/extensions/Column/ColumnComponent";
import { defaultButtonProps } from "@/components/extensions/Button/Button";
import { defaultColumnProps } from "@/components/extensions/Column/Column";
import { defaultCustomCodeProps } from "@/components/extensions/CustomCode/CustomCode";
import { defaultDividerProps, defaultSpacerProps } from "@/components/extensions/Divider/Divider";
import { defaultImageProps } from "@/components/extensions/ImageBlock/ImageBlock";
import { defaultTextBlockProps } from "@/components/extensions/TextBlock";
import { convertTiptapToElemental, updateElemental } from "@/lib/utils";
import type { TiptapDoc } from "@/types/tiptap.types";
import { v4 as uuidv4 } from "uuid";
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
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useMemo, useRef, useState } from "react";
import { templateEditorAtom, isDraggingAtom, templateEditorContentAtom } from "../store";
import { channelAtom } from "@/store";

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
  const setIsDragging = useSetAtom(isDraggingAtom);
  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
  const channel = useAtomValue(channelAtom);

  // Use passed editor or fallback to brandEditor for backward compatibility
  const activeEditor = editor || templateEditor;

  // Helper function to trigger autosave by updating the templateEditorContent atom
  const triggerAutoSave = useCallback(() => {
    if (!activeEditor) return;

    // Convert current editor state to Elemental format
    const tiptapDoc = activeEditor.getJSON() as TiptapDoc;
    const elementalElements = convertTiptapToElemental(tiptapDoc);

    // Update the templateEditorContent atom which will trigger autosave
    const newContent = updateElemental(templateEditorContent, {
      channel: channel,
      elements: elementalElements,
    });

    setTemplateEditorContent(newContent);
  }, [activeEditor, channel, templateEditorContent, setTemplateEditorContent]);

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
      setIsDragging(true);
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
      const allElements = activeEditor?.view.dom.querySelectorAll("[data-node-view-wrapper]");
      if (allElements) {
        // Filter out the placeholder and deduplicate by midpoint
        const seenMidpoints = new Set<number>();
        const elements = Array.from(allElements).filter((el) => {
          const htmlEl = el as HTMLElement;
          // Skip placeholders
          if (htmlEl.getAttribute("data-placeholder") === "true") {
            return false;
          }
          // Deduplicate by midpoint (duplicate wrappers have same midpoint but different top)
          const rect = htmlEl.getBoundingClientRect();
          const midpoint = rect.top + rect.height / 2;
          // Round to 2 decimal places to handle floating point variations
          const roundedMidpoint = Math.round(midpoint * 100) / 100;
          if (seenMidpoints.has(roundedMidpoint)) {
            return false;
          }
          seenMidpoints.add(roundedMidpoint);
          return true;
        });

        cachedElementBounds.current = elements.map((el) =>
          (el as HTMLElement).getBoundingClientRect()
        );
      }
    },
    [activeEditor, setIsDragging]
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

      // Check if we're dropping into a cell (either placeholder or existing empty cell)
      const activeRect = active.rect.current;
      let targetCell: { columnId: string; cellIndex: number; isPlaceholder: boolean } | null = null;

      if (activeRect?.translated) {
        const cellElements = activeEditor?.view.dom.querySelectorAll('[data-column-cell="true"]');

        if (cellElements) {
          for (let i = 0; i < cellElements.length; i++) {
            const cellEl = cellElements[i] as HTMLElement;
            const cellRect = cellEl.getBoundingClientRect();

            // Check if drop position is within cell boundaries
            if (
              activeRect.translated.left >= cellRect.left &&
              activeRect.translated.left <= cellRect.right &&
              activeRect.translated.top >= cellRect.top &&
              activeRect.translated.top <= cellRect.bottom
            ) {
              const columnId = cellEl.getAttribute("data-column-id");
              const cellIndexStr = cellEl.getAttribute("data-cell-index");
              const isPlaceholder = cellEl.getAttribute("data-placeholder-cell") === "true";

              if (columnId && cellIndexStr !== null) {
                targetCell = {
                  columnId,
                  cellIndex: parseInt(cellIndexStr, 10),
                  isPlaceholder: isPlaceholder,
                };
                break;
              }
            }
          }
        }
      }

      if (activeContainer === "Sidebar" && targetCell) {
        // Common variables for both placeholder and existing cells
        const columnId = targetCell.columnId;
        const cellIndex = targetCell.cellIndex;
        const newElementType = active.id as string;
        const schema = activeEditor.schema;
        const id = `node-${uuidv4()}`;

        // Create the node directly without inserting it into the document
        let newElementNode: Node | null = null;

        // Define node creation logic based on type
        switch (newElementType) {
          case "heading":
            newElementNode = schema.nodes.heading.create({
              ...defaultTextBlockProps,
              id,
            });
            break;
          case "paragraph":
          case "text":
            newElementNode = schema.nodes.paragraph.create({
              ...defaultTextBlockProps,
              id,
            });
            break;
          case "spacer":
            newElementNode = schema.nodes.divider.create({
              ...defaultSpacerProps,
              id,
            });
            break;
          case "divider":
            newElementNode = schema.nodes.divider.create({
              ...defaultDividerProps,
              id,
            });
            break;
          case "button":
            newElementNode = schema.nodes.button.create({
              ...defaultButtonProps,
              id,
            });
            break;
          case "imageBlock":
          case "image":
            newElementNode = schema.nodes.imageBlock.create({
              ...defaultImageProps,
              id,
            });
            break;
          case "customCode":
            newElementNode = schema.nodes.customCode.create({
              ...defaultCustomCodeProps,
              id,
            });
            break;
          case "column":
            newElementNode = schema.nodes.column.create({
              ...defaultColumnProps,
              id,
            });
            break;
          default:
            // Fallback for node types not explicitly defined
            if (schema.nodes[newElementType]) {
              newElementNode = schema.nodes[newElementType].create({ id });
            }
            break;
        }

        if (newElementNode) {
          if (targetCell.isPlaceholder) {
            // Handle dropping from sidebar into placeholder cell - need to create cell structure
            // Find the column node
            let columnPos: number | null = null;
            let foundColumnNode: Node | null = null;

            activeEditor.state.doc.descendants((node, pos) => {
              if (node.type.name === "column" && node.attrs.id === columnId) {
                columnPos = pos;
                foundColumnNode = node;
                return false;
              }
              return true;
            });

            if (columnPos !== null && foundColumnNode) {
              // Create cell structure if column is empty
              const columnNode = foundColumnNode as Node;
              const columnsCount = (columnNode.attrs.columnsCount as number) || 2;

              // Create all cells for the row
              const cells = Array.from({ length: columnsCount }, (_, idx) => {
                if (idx === cellIndex) {
                  // This is the target cell - add the dropped element
                  return schema.nodes.columnCell.create(
                    {
                      index: idx,
                      columnId: columnId,
                    },
                    newElementNode!
                  );
                } else {
                  // Other cells start empty - no content
                  return schema.nodes.columnCell.create({
                    index: idx,
                    columnId: columnId,
                  });
                }
              });

              // Create the columnRow with all cells
              const columnRow = schema.nodes.columnRow.create({}, cells);

              // Replace the empty column with one that has the row
              const newColumn = schema.nodes.column.create(columnNode.attrs, columnRow);

              const tr = activeEditor.state.tr;
              tr.replaceWith(columnPos, columnPos + columnNode.nodeSize, newColumn);
              activeEditor.view.dispatch(tr);

              // Trigger autosave after state update completes
              // Use requestAnimationFrame to ensure DOM and editor state are fully updated
              requestAnimationFrame(() => {
                triggerAutoSave();
              });

              // Select the newly inserted node
              setSelectedNode(newElementNode);
            }
          } else {
            // Handle dropping into existing empty cell
            // Find the cell node
            let cellPos: number | null = null;
            activeEditor.state.doc.descendants((node, pos) => {
              if (
                node.type.name === "columnCell" &&
                node.attrs.columnId === columnId &&
                node.attrs.index === cellIndex
              ) {
                cellPos = pos;
                return false;
              }
              return true;
            });

            if (cellPos !== null) {
              const tr = activeEditor.state.tr;
              // Insert the new element at the beginning of the cell (+1 to get inside the cell node)
              tr.insert(cellPos + 1, newElementNode);
              activeEditor.view.dispatch(tr);

              // Trigger autosave after state update completes
              // Use requestAnimationFrame to ensure DOM and editor state are fully updated
              requestAnimationFrame(() => {
                triggerAutoSave();
              });

              // Select the newly inserted node
              setSelectedNode(newElementNode);
            }
          }
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
      setIsDragging(false);
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
      setIsDragging,
      triggerAutoSave,
    ]
  );

  const onDragCancelHandler = useCallback(() => {
    cleanupPlaceholder();
    setActiveId(null);
    setActiveDragType(null);
    setDndMode("outer");
    setActiveCellDrag(null);
    setIsDragging(false);
    cachedColumnBounds.current = [];
    cachedElementBounds.current = [];
  }, [cleanupPlaceholder, setIsDragging]);

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
