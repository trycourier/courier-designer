import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import { coordinateGetter, createOrDuplicateNode } from "@/components/utils";
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

  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedToNewContainer = useRef(false);

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

  const onDragStartHandler = useCallback(({ active }: DragStartEvent) => {
    setActiveId(active.id);
    // Set active drag type for all draggable sidebar items
    if (
      active.id === "text" ||
      active.id === "divider" ||
      active.id === "button" ||
      active.id === "heading" ||
      active.id === "image" ||
      active.id === "spacer" ||
      active.id === "customCode"
    ) {
      setActiveDragType(active.id as string);
    }
  }, []);

  const onDragMoveHandler = useCallback(
    ({ active, over }: DragMoveEvent) => {
      if (!over) return;

      const overContainer = findContainer(over.id);
      const activeContainer = findContainer(active.id);

      // Skip if not dragging from sidebar to editor
      if (!(activeContainer === "Sidebar" && overContainer === "Editor")) return;

      const activeRect = active.rect.current;
      if (!activeRect?.translated) return;

      const elements = activeEditor?.view.dom.querySelectorAll("[data-node-view-wrapper]");
      if (!elements) {
        return;
      }

      let targetIndex = elements.length;

      for (let i = 0; i < elements.length; i++) {
        const element = elements[i] as HTMLElement;
        const rect = element.getBoundingClientRect();
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
    [activeEditor, findContainer, getDocumentPosition, lastPlaceholderIndex, setItems]
  );

  const onDragEndHandler = useCallback(
    ({ active, over }: DragEndEvent) => {
      cleanupPlaceholder();
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

      if (
        activeContainer === "Sidebar" &&
        overContainer === "Editor" &&
        lastPlaceholderIndex !== null
      ) {
        // Handle new element insertion from sidebar
        const pos = getDocumentPosition(lastPlaceholderIndex);
        createOrDuplicateNode(activeEditor, active.id as string, pos, undefined, (node) => {
          setSelectedNode(node as Node);
        });
      } else if (activeContainer === overContainer) {
        // Handle reordering within Editor
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
