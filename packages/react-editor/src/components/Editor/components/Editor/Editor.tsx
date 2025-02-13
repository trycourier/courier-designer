import { EditorContent, Editor as TiptapEditor } from "@tiptap/react";
import { useAtomValue } from "jotai";
import { forwardRef, useEffect, useState, useCallback, useRef } from "react";
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, MeasuringStrategy, UniqueIdentifier, CollisionDetection, closestCenter, pointerWithin, rectIntersection, getFirstCollision } from "@dnd-kit/core";

import { SideBar } from "../SideBar";
import { SideBarItemDetails } from "../SideBar/SideBarItemDetails";
import { selectedNodeAtom } from "../TextMenu/store";
import { coordinateGetter as multipleContainersCoordinateGetter } from '../../dnd/multipleContainersKeyboardCoordinates';
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

export interface EditorProps {
  editor: TiptapEditor;
  handleEditorClick: (event: React.MouseEvent<HTMLDivElement>) => void;
}

type Items = Record<UniqueIdentifier, UniqueIdentifier[]>;

export const Editor = forwardRef<HTMLDivElement, EditorProps>(({ editor, handleEditorClick }, ref) => {
  const selectedNode = useAtomValue(selectedNodeAtom);
  const [clonedItems, setClonedItems] = useState<Items | null>(null);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedToNewContainer = useRef(false);

  const coordinateGetter = multipleContainersCoordinateGetter;
  const strategy = verticalListSortingStrategy

  const [items, setItems] = useState({
    Editor: [] as string[],
  });

  useEffect(() => {
    const updateItems = () => {
      // Original query
      const elements = editor.view.dom.querySelectorAll('.react-renderer div[data-node-view-wrapper][data-id]');

      const ids = Array.from(elements).map(el => (el as HTMLElement).getAttribute('data-id')).filter((id): id is string => id !== null);

      setItems({
        Editor: ids,
      });
    };

    // Wait a short moment for the DOM to be ready
    setTimeout(() => {
      updateItems();
    }, 0);

    editor.on('update', updateItems);

    return () => {
      editor.off('update', updateItems);
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
    console.log('onDragCancel');
    if (clonedItems) {
      // Reset items to their original state in case items have been
      // Dragged across containers
      // setItems(clonedItems);
      console.log('setItems clonedItems', clonedItems);
    }

    setActiveId(null);
    setClonedItems(null);
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
          ? // If there are droppables intersecting with the pointer, return those
          pointerIntersections
          : rectIntersection(args);
      let overId = getFirstCollision(intersections, 'id');

      if (overId != null) {
        if (overId in items) {
          const containerItems = items[overId as keyof typeof items];

          // If a container is matched and it contains items (columns 'A', 'B', 'C')
          if (containerItems.length > 0) {
            // Return the closest droppable within that container
            overId = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (container) =>
                  container.id !== overId &&
                  containerItems.includes(container.id as keyof typeof items)
              ),
            })[0]?.id;
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

  console.log(items['Editor'])

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
        // console.log('onDragStart', active);
        // setIsDroppingToEditor(false);
        setActiveId(active.id);
        setClonedItems(items);
      }}
      onDragOver={({ active, over }) => {
        const overId = over?.id;
        // console.log('onDragOver', overId, active);
        if (overId == null || active.id in items) {
          return;
        }

        //   const overContainer = findContainer(overId);
        //   const activeContainer = findContainer(active.id);
        const overContainer = "Editor";
        const activeContainer = "Editor";

        if (!overContainer || !activeContainer) {
          return;
        }

        //   // Prevent dragging from Editor to Sidebar
        //   if (activeContainer === "Editor" && overContainer === "Sidebar") {
        //     return;
        //   }

        if (activeContainer !== overContainer) {
          setItems((items) => {
            const activeItems = items[activeContainer as keyof typeof items];
            const overItems = items[overContainer as keyof typeof items];
            const overIndex = overItems.indexOf(overId as keyof typeof items);
            const activeIndex = activeItems.indexOf(active.id as keyof typeof items);

            let newIndex: number;

            if (overId in items) {
              newIndex = overItems.length + 1;
            } else {
              const isBelowOverItem =
                over &&
                active.rect.current.translated &&
                active.rect.current.translated.top >
                over.rect.top + over.rect.height;

              const modifier = isBelowOverItem ? 1 : 0;

              newIndex =
                overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
            }

            recentlyMovedToNewContainer.current = true;

            // Special handling for Sidebar to Editor drag
            if (activeContainer === "Sidebar" && overContainer === "Editor") {
              const tempId = `${active.id}_temp`;
              return {
                ...items,
                // Keep Sidebar items unchanged
                [activeContainer]: [...items[activeContainer]],
                // Show placeholder in Editor, removing any existing temp items
                [overContainer]: [
                  ...(items[overContainer] as UniqueIdentifier[]).filter(id => !id.toString().includes('_temp')),
                ].reduce((acc, item, index) => {
                  if (index === newIndex) {
                    acc.push(tempId);
                  }
                  acc.push(item);
                  return acc;
                }, [] as UniqueIdentifier[]),
              };
            }

            // Default behavior for other drag operations
            return {
              ...items,
              [activeContainer]: (items[activeContainer] as UniqueIdentifier[]).filter(
                (item) => item !== active.id
              ),
              [overContainer]: [
                ...(items[overContainer] as UniqueIdentifier[]).slice(0, newIndex),
                items[activeContainer][activeIndex],
                ...(items[overContainer] as UniqueIdentifier[]).slice(
                  newIndex,
                  (items[overContainer] as UniqueIdentifier[]).length
                ),
              ],
            };
          });
        }
      }}
      onDragEnd={({ active, over }) => {
        const overId = over?.id;
        console.log('DragEnd:', { active, over });

        if (!overId) {
          console.log('No overId, dropping outside');
          // Clean up any temporary items if dropped outside
          setItems((items) => ({
            ...items,
            Editor: items.Editor.filter(id => !id.toString().includes('_temp'))
          }));
          setActiveId(null);
          return;
        }

        const overContainer = "Editor";
        const activeContainer = "Editor";

        if (activeContainer === overContainer) {
          const activeIndex = items[activeContainer].indexOf(active.id as string);
          const overIndex = items[activeContainer].indexOf(overId as string);
          console.log('Indices:', { activeIndex, overIndex });

          // Only proceed if both indices are valid
          if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
            // Update the items state
            setItems((items) => {
              const newItems = {
                ...items,
                [overContainer]: arrayMove(
                  items[overContainer],
                  activeIndex,
                  overIndex
                )
              };
              console.log('New items order:', newItems[overContainer]);
              return newItems;
            });

            try {
              // Get the current document content
              const content = editor.getJSON();
              console.log('Current content:', content);

              // Ensure we have content and it's an array
              if (content && content.content && Array.isArray(content.content)) {
                const paragraphs = content.content;

                // Verify indices are within bounds
                if (activeIndex >= 0 && activeIndex < paragraphs.length &&
                  overIndex >= 0 && overIndex < paragraphs.length) {

                  // Create a new array with the moved paragraph
                  const newContent = [...paragraphs];
                  const [movedItem] = newContent.splice(activeIndex, 1);
                  newContent.splice(overIndex, 0, movedItem);

                  // Create the new document
                  const newDoc = {
                    type: 'doc',
                    content: newContent
                  };

                  console.log('New content:', newDoc);

                  // Use a transaction to update the content
                  editor.view.dispatch(
                    editor.view.state.tr.replaceWith(0, editor.view.state.doc.content.size, editor.state.schema.nodeFromJSON(newDoc))
                  );

                  console.log('Move completed');
                } else {
                  console.error('Invalid indices:', {
                    activeIndex,
                    overIndex,
                    contentLength: paragraphs.length,
                    content: paragraphs
                  });
                }
              } else {
                console.error('Invalid document structure:', content);
              }
            } catch (error) {
              console.error('Error during reordering:', error);
            }
          } else {
            console.log('Invalid move operation:', { activeIndex, overIndex });
          }
        }

        setActiveId(null);
      }}
      // cancelDrop={cancelDrop}
      onDragCancel={onDragCancel}
    // modifiers={modifiers}
    >
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col p-6 overflow-y-auto" ref={ref}>
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
          <div className="p-3">
            {selectedNode ? (
              <SideBarItemDetails
                element={selectedNode}
                editor={editor}
              />
            ) : (
              <SideBar editor={editor} />
            )}
          </div>
        </div>
      </div>
    </DndContext>
  )
});
