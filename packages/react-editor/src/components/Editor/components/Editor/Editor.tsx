import { cn } from "@/lib/utils";
import { closestCenter, CollisionDetection, DndContext, DragOverlay, getFirstCollision, KeyboardSensor, MeasuringStrategy, MouseSensor, pointerWithin, rectIntersection, TouchSensor, UniqueIdentifier, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { EditorContent, Editor as TiptapEditor } from "@tiptap/react";
import { useAtomValue } from "jotai";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import { defaultButtonProps } from "../../extensions/Button/Button";
import { defaultDividerProps } from "../../extensions/Divider/Divider";
import { defaultImageProps } from "../../extensions/ImageBlock/ImageBlock";
import { defaultTextBlockProps } from "../../extensions/TextBlock";
import { ButtonBlock } from "../Blocks/ButtonBlock";
import { DividerBlock } from "../Blocks/DividerBlock";
import { ImageBlock } from "../Blocks/ImageBlock";
import { TextBlock } from "../Blocks/TextBlock";
import { SideBar } from "../SideBar";
import { SideBarItemDetails } from "../SideBar/SideBarItemDetails";
import { selectedNodeAtom } from "../TextMenu/store";
import { coordinateGetter as multipleContainersCoordinateGetter } from './utils/multipleContainersKeyboardCoordinates';
export interface EditorProps {
  editor: TiptapEditor;
  handleEditorClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  imageBlockPlaceholder?: string;
}

type Items = {
  Editor: UniqueIdentifier[];
  Sidebar: UniqueIdentifier[];
};

export const Editor = forwardRef<HTMLDivElement, EditorProps>(({ editor, handleEditorClick, imageBlockPlaceholder }, ref) => {
  const selectedNode = useAtomValue(selectedNodeAtom);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeDragType, setActiveDragType] = useState<string | null>(null);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedToNewContainer = useRef(false);
  const timeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const [lastPlaceholderIndex, setLastPlaceholderIndex] = useState<number | null>(null);

  const coordinateGetter = multipleContainersCoordinateGetter;
  const strategy = verticalListSortingStrategy

  const [items, setItems] = useState<Items>({
    Editor: [] as UniqueIdentifier[],
    Sidebar: [] as UniqueIdentifier[],
  });

  // Cleanup function for timeouts
  const cleanupTimeouts = useCallback(() => {
    Object.values(timeoutRef.current).forEach(timeout => clearTimeout(timeout));
    timeoutRef.current = {};
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      cleanupTimeouts();
    };
  }, [cleanupTimeouts]);

  useEffect(() => {
    const updateItems = () => {
      const elements = editor.view.dom.querySelectorAll('.react-renderer div[data-node-view-wrapper][data-id]');
      const ids = Array.from(elements).map(el => (el as HTMLElement).getAttribute('data-id')).filter((id): id is string => id !== null);
      setItems({
        Editor: ids,
        Sidebar: ['text', 'image', 'divider', 'button'],
      });
    };

    // Wait a short moment for the DOM to be ready
    timeoutRef.current.updateItems = setTimeout(() => {
      updateItems();
    }, 0);

    editor.on('update', () => {
      updateItems();
    });

    return () => {
      editor.off('update', updateItems);
      if (timeoutRef.current.updateItems) {
        clearTimeout(timeoutRef.current.updateItems);
      }
    };
  }, [editor]);


  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter,
    })
  );

  const onDragCancel = () => {
    setActiveId(null);
  };

  const findContainer = (id: UniqueIdentifier) => {
    // If the id is a temp id, it belongs to the Editor container
    if (typeof id === 'string' && id.includes('_temp_')) {
      return 'Editor';
    }

    if (id in items) {
      return id;
    }

    return Object.keys(items).find((key) => items[key as keyof typeof items].includes(id as string));
  };

  /**
   * Custom collision detection strategy optimized for multiple containers
   *
   * - First, find any droppable containers intersecting with the pointer.
   * - If there are none, find intersecting containers with the active draggable.
   * - If there are no intersecting containers, return the last matched intersection
   *
   */
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

      // Start by finding any intersecting droppable
      const pointerIntersections = pointerWithin(args);
      const intersections =
        pointerIntersections.length > 0
          ? pointerIntersections
          : rectIntersection(args);
      let overId = getFirstCollision(intersections, 'id');

      if (overId != null) {
        if (overId in items) {
          const containerItems = items[overId as keyof typeof items];

          // If a container is matched and it contains items (columns 'A', 'B', 'C')
          if (containerItems.length > 0) {
            // Return the closest droppable within that container
            const closestId = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (container) =>
                  container.id !== overId &&
                  containerItems.includes(container.id as keyof typeof items)
              ),
            })[0]?.id;

            if (closestId) {
              overId = closestId;
            } else if (overId === 'Editor') {
              // If we're over the editor container but there's no closest item,
              // we're probably at the end of the list
              overId = 'Editor';
            }
          }
        }

        lastOverId.current = overId;

        return [{ id: overId }];
      }

      // When a draggable item moves to a new container, the layout may shift
      // and the `overId` may become `null`. We manually set the cached `lastOverId`
      // to the id of the draggable item that was moved to the new container, otherwise
      // the previous `overId` will be returned which can cause items to incorrectly shift positions
      if (recentlyMovedToNewContainer.current) {
        lastOverId.current = activeId;
      }

      // If no droppable is matched, return the last match
      return lastOverId.current ? [{ id: lastOverId.current }] : [];
    },
    [activeId, items]
  );

  // Add this helper function to get the actual document position
  const getDocumentPosition = useCallback((index: number) => {
    try {
      const doc = editor.state.doc;
      // If index is 0, return 0
      if (index === 0) {
        return 0;
      }

      // If inserting at the end
      if (index >= doc.childCount) {
        return doc.content.size;
      }

      // Get the position before the target node
      let pos = 0;
      for (let i = 0; i < Math.min(index, doc.childCount); i++) {
        pos += doc.child(i).nodeSize;
      }
      return pos;
    } catch (error) {
      // If there's an error, return the end of the document as a fallback
      return editor.state.doc.content.size;
    }
  }, [editor]);

  const cleanupPlaceholder = () => {
    editor.commands.removeDragPlaceholder();
    setItems(prev => ({
      ...prev,
      Editor: prev.Editor.filter(id => !id.toString().includes('_temp'))
    }));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
      onDragStart={({ active }) => {
        setActiveId(active.id);
        // Store the type of item being dragged if it's from sidebar
        if (active.id === 'text' || active.id === 'divider' || active.id === 'button' || active.id === 'image') {
          setActiveDragType(active.id as string);
        }
      }}
      onDragMove={({ active, over }) => {
        if (!over) return;

        const overContainer = findContainer(over.id);
        const activeContainer = findContainer(active.id);

        // Skip if not dragging from sidebar to editor
        if (!(activeContainer === "Sidebar" && overContainer === "Editor")) return;

        const activeRect = active.rect.current;
        if (!activeRect?.translated) return;

        const elements = editor.view.dom.querySelectorAll('[data-node-view-wrapper]');
        let targetIndex = elements.length;

        for (let i = 0; i < elements.length; i++) {
          const element = elements[i] as HTMLElement;
          const rect = element.getBoundingClientRect();
          if (activeRect.translated.top < rect.top + (rect.height / 2)) {
            targetIndex = i;
            break;
          }
        }

        if (targetIndex !== lastPlaceholderIndex) {
          const tempId = `${active.id}_temp_${Date.now()}`;
          setLastPlaceholderIndex(targetIndex);

          requestAnimationFrame(() => {
            editor.commands.removeDragPlaceholder();
            editor.commands.setDragPlaceholder({
              id: tempId,
              type: active.id as string,
              pos: getDocumentPosition(targetIndex)
            });

            setItems(prev => ({
              ...prev,
              Editor: [...prev.Editor.filter(id => !id.toString().includes('_temp')), tempId]
            }));
          });
        }
      }}

      onDragEnd={({ active, over }) => {
        cleanupPlaceholder();
        const overId = over?.id;

        if (!overId) {
          setItems(items => ({
            ...items,
            Editor: items.Editor.filter(id => !id.toString().includes('_temp'))
          }));
          setActiveId(null);
          setActiveDragType(null);
          return;
        }

        const overContainer = findContainer(overId);
        const activeContainer = findContainer(active.id);

        if (activeContainer === "Sidebar" && overContainer === "Editor" && lastPlaceholderIndex !== null) {
          // Handle new element insertion
          const insertPos = getDocumentPosition(lastPlaceholderIndex);
          const id = `node-${uuidv4()}`;

          const nodeTypes = {
            text: () => editor.schema.nodes.paragraph.create({ ...defaultTextBlockProps, id }),
            divider: () => editor.schema.nodes.divider.create({ ...defaultDividerProps, id }),
            button: () => editor.schema.nodes.button.create({ ...defaultButtonProps, id }),
            image: () => editor.schema.nodes.imageBlock.create({ ...defaultImageProps, sourcePath: imageBlockPlaceholder, id })
          };

          const createNode = nodeTypes[activeDragType as keyof typeof nodeTypes];
          if (createNode) {
            const tr = editor.state.tr;
            tr.insert(insertPos, createNode());
            editor.view.dispatch(tr);
          }
        } else if (activeContainer === overContainer) {
          // Handle reordering within Editor
          const activeIndex = items[activeContainer as keyof Items].indexOf(active.id as string);
          const overIndex = items[overContainer as keyof Items].indexOf(overId as string);

          if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
            setItems(items => ({
              ...items,
              [overContainer as keyof Items]: arrayMove(
                items[overContainer as keyof Items],
                activeIndex,
                overIndex
              )
            }));

            const content = editor.getJSON()?.content;
            if (Array.isArray(content)) {
              const newContent = [...content];
              const [movedItem] = newContent.splice(activeIndex, 1);
              newContent.splice(overIndex, 0, movedItem);

              editor.view.dispatch(
                editor.view.state.tr.replaceWith(
                  0,
                  editor.view.state.doc.content.size,
                  editor.state.schema.nodeFromJSON({ type: 'doc', content: newContent })
                )
              );
            }
          }
        }

        setLastPlaceholderIndex(null);
        setActiveId(null);
        setActiveDragType(null);
      }}
      onDragCancel={() => {
        cleanupPlaceholder();
        // Remove any placeholder nodes
        editor.commands.removeDragPlaceholder();
        onDragCancel();
      }}
    >
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-[radial-gradient(#0A0A0A32_1px,transparent_1px)] bg-[length:15px_15px]" ref={ref}>
          <div className="editor-container">
            <SortableContext items={items["Editor"]} strategy={strategy}>
              <EditorContent
                editor={editor}
                onClick={handleEditorClick}
              />
            </SortableContext>
          </div>
        </div>
        <div className="rounded-br-sm border-border w-64 bg-white border-l overflow-y-auto h-full">
          <div className="p-4">
            {selectedNode ? (
              <SideBarItemDetails
                element={selectedNode}
                editor={editor}
              />
            ) : (
              <SortableContext items={items["Sidebar"]} strategy={strategy}>
                <SideBar items={items["Sidebar"]} />
              </SortableContext>
            )}
          </div>
        </div>
      </div>
      <DragOverlay>
        {activeId && (activeId === 'text' || activeId === 'divider' || activeId === 'button' || activeId === 'image') ? (
          <div className={cn(
            "bg-white border border-border rounded-lg p-4 shadow-lg",
            "opacity-90 scale-105 transition-transform"
          )}>
            {activeDragType === 'text' && <TextBlock />}
            {activeDragType === 'divider' && <DividerBlock />}
            {activeDragType === 'button' && <ButtonBlock />}
            {activeDragType === 'image' && <ImageBlock />}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
});
