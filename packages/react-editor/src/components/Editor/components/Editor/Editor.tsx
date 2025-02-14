import { closestCenter, CollisionDetection, DndContext, DragOverlay, getFirstCollision, KeyboardSensor, MeasuringStrategy, MouseSensor, pointerWithin, rectIntersection, TouchSensor, UniqueIdentifier, useSensor, useSensors } from "@dnd-kit/core";
import { EditorContent, Editor as TiptapEditor } from "@tiptap/react";
import { useAtomValue } from "jotai";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";

// import { SideBar } from "../SideBar";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { coordinateGetter as multipleContainersCoordinateGetter } from '../../dnd/multipleContainersKeyboardCoordinates';
import { SideBarItemDetails } from "../SideBar/SideBarItemDetails";
import { SideBarSortableItemWrapper } from "../SideBar/SideBarSortableItemWrapper";
import { selectedNodeAtom } from "../TextMenu/store";
import { defaultDividerProps } from "../../extensions/Divider/Divider";
import { defaultButtonProps } from "../../extensions/Button/Button";
import { defaultImageProps } from "../../extensions/ImageBlock/ImageBlock";

export interface EditorProps {
  editor: TiptapEditor;
  handleEditorClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  imageBlockPlaceholder?: string;
}

type Items = Record<UniqueIdentifier, UniqueIdentifier[]>;

export const Editor = forwardRef<HTMLDivElement, EditorProps>(({ editor, handleEditorClick, imageBlockPlaceholder }, ref) => {
  const selectedNode = useAtomValue(selectedNodeAtom);
  const [clonedItems, setClonedItems] = useState<Items | null>(null);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeDragType, setActiveDragType] = useState<string | null>(null);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedToNewContainer = useRef(false);

  const coordinateGetter = multipleContainersCoordinateGetter;
  const strategy = verticalListSortingStrategy

  const [items, setItems] = useState({
    Editor: [] as UniqueIdentifier[],
    Sidebar: [] as UniqueIdentifier[],
  });

  useEffect(() => {
    const updateItems = () => {
      // Original query
      const elements = editor.view.dom.querySelectorAll('.react-renderer div[data-node-view-wrapper][data-id]');
      console.log('🔍 Found elements:', elements);

      const ids = Array.from(elements).map(el => (el as HTMLElement).getAttribute('data-id')).filter((id): id is string => id !== null);
      console.log('🔍 Extracted IDs:', ids);

      setItems({
        Editor: ids,
        Sidebar: ['text', 'divider', 'button', 'image'],
      });
    };

    // Wait a short moment for the DOM to be ready
    setTimeout(() => {
      updateItems();
    }, 0);

    editor.on('update', () => {
      console.log('🔄 Editor updated, refreshing items');
      updateItems();
    });

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

  const findContainer = (id: UniqueIdentifier) => {
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

  // Add this helper function to get the actual document position
  const getDocumentPosition = useCallback((index: number) => {
    console.log('📍 Getting document position for index:', index);
    try {
      const doc = editor.state.doc;
      console.log('📄 Document structure:', doc.toJSON());

      // If index is 0, return 0
      if (index === 0) {
        console.log('📍 Inserting at start of document');
        return 0;
      }

      // If inserting at the end
      if (index >= doc.childCount) {
        console.log('📍 Inserting at end of document');
        return doc.content.size;
      }

      // Get the position before the target node
      let pos = 0;
      for (let i = 0; i < index; i++) {
        pos += doc.child(i).nodeSize;
      }
      console.log('📍 Found position:', pos, 'for node at index:', index);
      return pos;
    } catch (error) {
      console.error('❌ Error getting document position:', error);
      return 0;
    }
  }, [editor]);

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
        console.log('🎯 Drag started:', { active });
        setActiveId(active.id);
        setClonedItems(items);
        // Store the type of item being dragged if it's from sidebar
        if (active.id === 'text' || active.id === 'divider' || active.id === 'button' || active.id === 'image') {
          console.log('📦 Setting drag type:', active.id);
          setActiveDragType(active.id as string);
        }
      }}
      onDragOver={({ active, over }) => {
        const overId = over?.id;
        console.log('↕️ Drag over:', { active, over, overId });

        if (overId == null || active.id in items) {
          return;
        }

        const overContainer = findContainer(overId);
        const activeContainer = findContainer(active.id);
        console.log('🎯 Containers:', { overContainer, activeContainer });

        if (!overContainer || !activeContainer) {
          console.log('❌ Invalid containers');
          return;
        }

        // Prevent dragging from Editor to Sidebar
        if ((activeContainer === "Editor" && overContainer === "Sidebar") || (activeContainer === "Sidebar" && overContainer === "Sidebar")) {
          console.log('🚫 Prevented invalid drag operation');
          return;
        }

        if (activeContainer !== overContainer) {
          console.log('↔️ Moving between containers');
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
              [activeContainer]: (items[activeContainer as keyof typeof items] as UniqueIdentifier[]).filter(
                (item) => item !== active.id
              ),
              [overContainer]: [
                ...(items[overContainer as keyof typeof items] as UniqueIdentifier[]).slice(0, newIndex),
                items[activeContainer as keyof typeof items][activeIndex],
                ...(items[overContainer as keyof typeof items] as UniqueIdentifier[]).slice(
                  newIndex,
                  (items[overContainer as keyof typeof items] as UniqueIdentifier[]).length
                ),
              ],
            };
          });
        }
      }}
      onDragEnd={({ active, over }) => {
        const overId = over?.id;
        console.log('🎯 Drag ended:', { active, over, overId });
        console.log('📦 Current state:', { items, activeDragType });

        if (!overId) {
          console.log('❌ No overId, dropping outside');
          setItems((items) => ({
            ...items,
            Editor: items.Editor.filter(id => !id.toString().includes('_temp'))
          }));
          setActiveId(null);
          setActiveDragType(null);
          return;
        }

        const overContainer = findContainer(overId);
        const activeContainer = findContainer(active.id);
        console.log('🎯 Drop containers:', { overContainer, activeContainer });

        if (overContainer === "Sidebar" && activeContainer === "Sidebar") {
          console.log('↩️ Sidebar to Sidebar drop, ignoring');
          setActiveId(null);
          setActiveDragType(null);
          return;
        }

        // Handle dropping from Sidebar to Editor
        if (activeContainer === "Sidebar" && overContainer === "Editor") {
          console.log('📥 Dropping from Sidebar to Editor');
          const overIndex = items[overContainer].indexOf(overId as string);
          console.log('📍 Raw drop index:', overIndex);

          try {
            // Get the actual document position
            const insertPos = getDocumentPosition(overIndex);
            console.log('📍 Calculated insert position:', insertPos);

            // Create the appropriate element based on the dragged type
            if (activeDragType === 'text') {
              console.log('📝 Creating text element at position:', insertPos);

              // First create a transaction
              const tr = editor.state.tr;

              // Insert the content
              const node = editor.schema.nodes.paragraph.create(null);

              console.log('📄 Node to insert:', node.toJSON());

              // Insert at the calculated position
              tr.insert(insertPos, node);

              // Apply the transaction
              editor.view.dispatch(tr);

              console.log('✅ Text element inserted');
              console.log('📄 New editor content:', editor.getJSON());
            } else if (activeDragType === 'divider') {
              console.log('➖ Creating divider element at position:', insertPos);

              // Create and insert divider
              const node = editor.schema.nodes.divider.create({
                ...defaultDividerProps
              });

              const tr = editor.state.tr;
              tr.insert(insertPos, node);
              editor.view.dispatch(tr);

              console.log('✅ Divider element inserted');
              console.log('📄 New editor content:', editor.getJSON());
            } else if (activeDragType === 'button') {
              console.log('➖ Creating button element at position:', insertPos);

              // Create and insert button
              const node = editor.schema.nodes.button.create({
                ...defaultButtonProps
              });

              const tr = editor.state.tr;
              tr.insert(insertPos, node);
              editor.view.dispatch(tr);

              console.log('✅ Button element inserted');
            } else if (activeDragType === 'image') {
              console.log('➖ Creating image element at position:', insertPos);

              // Create and insert image block with placeholder
              const node = editor.schema.nodes.imageBlock.create({
                ...defaultImageProps,
                sourcePath: imageBlockPlaceholder
              });

              const tr = editor.state.tr;
              tr.insert(insertPos, node);
              editor.view.dispatch(tr);

              console.log('✅ Image element inserted');
              console.log('📄 New editor content:', editor.getJSON());
            }

            // Ensure the editor updates its state
            editor.commands.focus();
          } catch (error) {
            console.error('❌ Error creating element:', error);
          }

          // Clean up temporary items
          console.log('🧹 Cleaning up temporary items');
          setItems((items) => {
            const newItems = {
              ...items,
              Editor: items.Editor.filter(id => !id.toString().includes('_temp'))
            };
            console.log('📦 New items state:', newItems);
            return newItems;
          });

          setActiveId(null);
          setActiveDragType(null);
          return;
        }

        // Handle reordering within Editor
        if (activeContainer === overContainer) {
          const activeIndex = items[activeContainer as keyof typeof items].indexOf(active.id as string);
          const overIndex = items[activeContainer as keyof typeof items].indexOf(overId as string);
          console.log('Indices:', { activeIndex, overIndex });

          // Only proceed if both indices are valid
          if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
            // Update the items state
            setItems((items) => {
              const newItems = {
                ...items,
                [overContainer as keyof typeof items]: arrayMove(
                  items[overContainer as keyof typeof items],
                  activeIndex,
                  overIndex
                )
              };
              console.log('New items order:', newItems[overContainer as keyof typeof items]);
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
        setActiveDragType(null);
      }}
      onDragCancel={onDragCancel}
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
              // <SideBar editor={editor} />
              <SortableContext items={items["Sidebar"]} strategy={strategy}>
                <SideBarNew editor={editor} items={items["Sidebar"]} />
              </SortableContext>
            )}
          </div>
        </div>
      </div>
      <DragOverlay>
        {activeId && (activeId === 'text' || activeId === 'divider' || activeId === 'button' || activeId === 'image') ? (
          <div className="bg-white border border-border rounded-lg p-4 shadow-lg">
            {activeDragType === 'text' ? 'Text Block' :
              activeDragType === 'divider' ? 'Divider' :
                activeDragType === 'button' ? 'Button' :
                  activeDragType === 'image' ? 'Image' :
                    activeId}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
});

interface SideBarNewProps {
  editor: TiptapEditor;
  items: UniqueIdentifier[];
}

function SideBarNew({ items }: SideBarNewProps) {
  return (
    <div className="px-10">
      {items.map((item) => (
        <SideBarSortableItemWrapper key={item} id={item.toString()}>
          {item}
        </SideBarSortableItemWrapper>
      ))}
    </div>
  )
}