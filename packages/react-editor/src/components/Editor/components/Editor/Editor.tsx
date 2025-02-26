import { cn } from "@/lib/utils";
import { closestCenter, CollisionDetection, DndContext, DragOverlay, getFirstCollision, KeyboardSensor, MeasuringStrategy, MouseSensor, pointerWithin, rectIntersection, TouchSensor, UniqueIdentifier, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { EditorContent, Editor as TiptapEditor } from "@tiptap/react";
import { useAtomValue, useSetAtom } from "jotai";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import { defaultButtonProps } from "../../extensions/Button/Button";
import { defaultDividerProps, defaultSpacerProps } from "../../extensions/Divider/Divider";
import { defaultImageProps } from "../../extensions/ImageBlock/ImageBlock";
import { defaultTextBlockProps } from "../../extensions/TextBlock";
import { ButtonBlock } from "../Blocks/ButtonBlock";
import { DividerBlock } from "../Blocks/DividerBlock";
import { HeadingBlock } from "../Blocks/HeadingBlock";
import { ImageBlock } from "../Blocks/ImageBlock";
import { SpacerBlock } from "../Blocks/SpacerBlock";
import { TextBlock } from "../Blocks/TextBlock";
import { SideBar } from "../SideBar";
import { SideBarItemDetails } from "../SideBar/SideBarItemDetails";
import { selectedNodeAtom } from "../TextMenu/store";
import { coordinateGetter as multipleContainersCoordinateGetter } from './utils/multipleContainersKeyboardCoordinates';

// Helper function to find a node position by its ID
const findNodePositionById = (editor: TiptapEditor, id: string): number | null => {
  let foundPos: number | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (node.attrs.id === id) {
      foundPos = pos;
      return false; // Stop traversal
    }
    return true; // Continue traversal
  });

  return foundPos;
};

// Helper function to create a new node or duplicate an existing one
export const createOrDuplicateNode = (
  editor: TiptapEditor,
  nodeType: string,
  insertPos: number,
  sourceNodeAttrs?: Record<string, any>,
  setSelectedNode?: (node: any) => void,
  sourceNodeContent?: any
): string => {
  // Generate a new unique ID
  const id = `node-${uuidv4()}`;

  // Define node creation functions with default props
  const nodeTypes: Record<string, () => any> = {
    heading: () => {
      const node = editor.schema.nodes.heading.create({
        ...defaultTextBlockProps,
        ...sourceNodeAttrs,
        id
      }, sourceNodeContent);
      return node;
    },
    paragraph: () => {
      const node = editor.schema.nodes.paragraph.create({
        ...defaultTextBlockProps,
        ...sourceNodeAttrs,
        id
      }, sourceNodeContent);
      return node;
    },
    text: () => {
      const node = editor.schema.nodes.paragraph.create({
        ...defaultTextBlockProps,
        ...sourceNodeAttrs,
        id
      }, sourceNodeContent);
      return node;
    },
    spacer: () => {
      const node = editor.schema.nodes.divider.create({
        ...defaultSpacerProps,
        ...sourceNodeAttrs,
        id
      });
      return node;
    },
    divider: () => {
      const node = editor.schema.nodes.divider.create({
        ...defaultDividerProps,
        ...sourceNodeAttrs,
        id
      });
      return node;
    },
    button: () => {
      const node = editor.schema.nodes.button.create({
        ...defaultButtonProps,
        ...sourceNodeAttrs,
        id
      }, sourceNodeContent);
      return node;
    },
    imageBlock: () => {
      const node = editor.schema.nodes.imageBlock.create({
        ...defaultImageProps,
        ...sourceNodeAttrs,
        id
      });
      return node;
    },
    image: () => {
      // Fallback for image nodes (in case the type is 'image' instead of 'imageBlock')
      const node = editor.schema.nodes.imageBlock.create({
        ...defaultImageProps,
        ...sourceNodeAttrs,
        id
      });
      return node;
    }
  };

  // Create the node
  const createNode = nodeTypes[nodeType];
  if (createNode) {
    // Create and insert the node
    const tr = editor.state.tr;
    const newNode = createNode();
    tr.insert(insertPos, newNode);
    editor.view.dispatch(tr);

    // Set selected node if callback provided
    if (setSelectedNode) {
      setSelectedNode(newNode);
    }

    // Focus on the newly created node if it's a text or heading
    if (nodeType === 'text' || nodeType === 'paragraph' || nodeType === 'heading') {
      setTimeout(() => {
        // Find the node in the document by its ID
        const nodePos = findNodePositionById(editor, id);
        if (nodePos !== null) {
          // For text nodes, place cursor at the beginning of the node content
          editor.commands.setTextSelection(nodePos + 1);
        }
        editor.view.focus();
      }, 50);
    }

    // Dispatch a custom event to notify about the new node
    const customEvent = new CustomEvent('node-duplicated', {
      detail: { newNodeId: id }
    });
    document.dispatchEvent(customEvent);
  } else {
    // Fallback for node types not explicitly defined

    // Check if the node type exists in the schema
    if (editor.schema.nodes[nodeType]) {
      const tr = editor.state.tr;
      const newNode = editor.schema.nodes[nodeType].create({
        ...sourceNodeAttrs,
        id
      }, sourceNodeContent);

      tr.insert(insertPos, newNode);
      editor.view.dispatch(tr);

      // Set selected node if callback provided
      if (setSelectedNode) {
        setSelectedNode(newNode);
      }

      // Dispatch a custom event to notify about the new node
      const customEvent = new CustomEvent('node-duplicated', {
        detail: { newNodeId: id }
      });
      document.dispatchEvent(customEvent);
    } else {
      console.error(`Cannot duplicate node: type "${nodeType}" not found in schema`);
    }
  }

  return id;
};

export interface EditorProps {
  editor: TiptapEditor;
  handleEditorClick: (event: React.MouseEvent<HTMLDivElement>) => void;
}

type Items = {
  Editor: UniqueIdentifier[];
  Sidebar: UniqueIdentifier[];
};

export const Editor = forwardRef<HTMLDivElement, EditorProps>(({ editor, handleEditorClick }, ref) => {
  const selectedNode = useAtomValue(selectedNodeAtom);
  const setSelectedNode = useSetAtom(selectedNodeAtom);
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
      // First, get IDs from DOM elements (this is the original approach)
      const elements = editor.view.dom.querySelectorAll('.react-renderer div[data-node-view-wrapper][data-id]');
      const domIds = Array.from(elements).map(el => (el as HTMLElement).getAttribute('data-id')).filter((id): id is string => id !== null);

      // Second, get IDs directly from the document model
      const docIds: string[] = [];
      editor.state.doc.descendants((node) => {
        if (node.attrs && node.attrs.id) {
          docIds.push(node.attrs.id);
        }
        return true;
      });

      // Combine both approaches to ensure we don't miss any IDs
      const allIds = [...new Set([...domIds, ...docIds])];

      // Check if we have an empty document with just one paragraph node
      const docContent = editor.state.doc.content;
      if (docContent.childCount === 1 && docContent.child(0).type.name === 'paragraph' && docContent.child(0).content.size === 0) {
        const paragraphNode = docContent.child(0);

        // If the paragraph doesn't have an ID, assign one
        if (!paragraphNode.attrs.id) {
          const newId = `node-${uuidv4()}`;

          // Set the ID using a transaction
          const tr = editor.state.tr;
          tr.setNodeMarkup(0, undefined, { ...paragraphNode.attrs, id: newId });
          editor.view.dispatch(tr);

          // Add the new ID to our items list
          if (!allIds.includes(newId)) {
            allIds.push(newId);
          }
        } else if (!allIds.includes(paragraphNode.attrs.id)) {
          // If the paragraph has an ID but it's not in our list, add it
          allIds.push(paragraphNode.attrs.id);
        }
      }

      setItems({
        Editor: allIds,
        Sidebar: ['heading', 'text', 'image', 'spacer', 'divider', 'button'],
      });
    };

    // Wait a short moment for the DOM to be ready
    timeoutRef.current.updateItems = setTimeout(() => {
      updateItems();
    }, 0);

    editor.on('update', () => {
      updateItems();
    });

    // Listen for node duplication events
    const handleNodeDuplicated = (event: CustomEvent) => {
      const { newNodeId } = event.detail;
      setItems(prevItems => ({
        ...prevItems,
        Editor: [...prevItems.Editor, newNodeId]
      }));
    };

    document.addEventListener('node-duplicated', handleNodeDuplicated as EventListener);

    return () => {
      editor.off('update', updateItems);
      document.removeEventListener('node-duplicated', handleNodeDuplicated as EventListener);
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
        if (active.id === 'text' || active.id === 'divider' || active.id === 'spacer' || active.id === 'button' || active.id === 'image' || active.id === 'heading') {
          setActiveDragType(active.id as string);
        }
      }}
      onDragMove={({ active, over }) => {
        if (!over) return;

        const overContainer = findContainer(over.id);
        const activeContainer = findContainer(active.id);

        // Skip if not dragging from sidebar to editor
        // console.log({ activeContainer, overContainer })
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
          createOrDuplicateNode(editor, activeDragType as string, insertPos, undefined, setSelectedNode);
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

        if (activeContainer === "Sidebar" && overContainer === "Sidebar") {
          setTimeout(() => {
            cleanupPlaceholder();
          }, 100);
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
        <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-[radial-gradient(#0A0A0A32_1px,transparent_1px)] bg-[length:15px_15px] overflow-y-auto relative" ref={ref}>
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
      <DragOverlay dropAnimation={null}>
        {activeId && (activeId === 'text' || activeId === 'divider' || activeId === 'spacer' || activeId === 'button' || activeId === 'image' || activeId === 'heading') ? (
          <div className={cn(
            "bg-white border border-border rounded-lg p-4 shadow-lg",
            "opacity-90 scale-105 transition-transform"
          )}>
            {activeDragType === 'heading' && <HeadingBlock draggable />}
            {activeDragType === 'text' && <TextBlock draggable />}
            {activeDragType === 'spacer' && <SpacerBlock draggable />}
            {activeDragType === 'divider' && <DividerBlock draggable />}
            {activeDragType === 'button' && <ButtonBlock draggable />}
            {activeDragType === 'image' && <ImageBlock draggable />}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
});
