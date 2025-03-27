import { Button, Input } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import { closestCenter, CollisionDetection, DndContext, DragOverlay, getFirstCollision, KeyboardSensor, MeasuringStrategy, MouseSensor, pointerWithin, rectIntersection, TouchSensor, UniqueIdentifier, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { EditorContent } from "@tiptap/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import { templateDataAtom } from "../../../../CourierTemplateProvider/store";
import { subjectAtom } from "../../../store";
import { ButtonBlock } from "../../Blocks/ButtonBlock";
import { DividerBlock } from "../../Blocks/DividerBlock";
import { HeadingBlock } from "../../Blocks/HeadingBlock";
import { ImageBlock } from "../../Blocks/ImageBlock";
import { SpacerBlock } from "../../Blocks/SpacerBlock";
import { TextBlock } from "../../Blocks/TextBlock";
import { PreviewPanel } from "../../PreviewPanel";
import { TextMenu } from "../../TextMenu";
import { selectedNodeAtom } from "../../TextMenu/store";
import { EditorProps } from "../Editor";
import { Header } from "../Header";
import { createOrDuplicateNode } from '../utils';
import { coordinateGetter as multipleContainersCoordinateGetter } from '../utils/multipleContainersKeyboardCoordinates';
import { SideBar } from "./SideBar";
import { SideBarItemDetails } from "./SideBar/SideBarItemDetails";
import { Status } from "./Status";
import { useCourierTemplate } from "@/components/CourierTemplateProvider";

type Items = {
  Editor: UniqueIdentifier[];
  Sidebar: UniqueIdentifier[];
};

export const TemplateEditor = forwardRef<HTMLDivElement, EditorProps>(({ editor, handleEditorClick, isLoading, isVisible, isAutoSave }, ref) => {
  const selectedNode = useAtomValue(selectedNodeAtom);
  const setSelectedNode = useSetAtom(selectedNodeAtom);
  const [subject, setSubject] = useAtom(subjectAtom);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeDragType, setActiveDragType] = useState<string | null>(null);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedToNewContainer = useRef(false);
  const timeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const [lastPlaceholderIndex, setLastPlaceholderIndex] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | undefined>(undefined);
  const templateData = useAtomValue(templateDataAtom);
  const { publishTemplate, isTemplatePublishing } = useCourierTemplate();

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

  // Ensure editor is editable when component unmounts or editor changes
  useEffect(() => {
    return () => {
      // Reset editor to editable state when component unmounts
      if (editor && !editor.isDestroyed) {
        editor.setEditable(true);
      }
    };
  }, [editor]);

  useEffect(() => {
    const updateItems = () => {
      try {
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

        // Ensure we don't have duplicate IDs
        const uniqueIds = [...new Set(allIds)];

        setItems({
          Editor: uniqueIds,
          Sidebar: ['heading', 'text', 'image', 'spacer', 'divider', 'button'],
        });
      } catch (error) {
        console.error("Error in updateItems:", error);
        // If there's an error, at least ensure the sidebar items are set
        setItems(prev => ({
          Editor: prev.Editor,
          Sidebar: ['heading', 'text', 'image', 'spacer', 'divider', 'button'],
        }));
      }
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

  const togglePreviewMode = (mode: 'desktop' | 'mobile' | undefined) => {
    const defaultMode = previewMode === undefined ? 'desktop' : undefined;
    const newPreviewMode = mode || defaultMode;

    setPreviewMode(newPreviewMode);

    setSelectedNode(null);

    // Set editor to readonly when in preview mode
    if (newPreviewMode) {
      editor.setEditable(false);
    } else {
      editor.setEditable(true);
    }
  }

  const handlePublish = useCallback(() => {
    publishTemplate();
  }, []);

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
        pos += doc.child(i)?.nodeSize;
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

  const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubject(e.target.value);
  };

  return (
    <>
      {!isLoading && isVisible &&
        <Header>
          <div className="courier-flex courier-items-center courier-gap-2 courier-grow">
            <h4 className="courier-text-sm">Subject: </h4>
            <Input
              value={subject}
              onChange={handleSubjectChange}
              onFocus={() => setSelectedNode(null)}
              className="!courier-bg-background read-only:courier-cursor-default read-only:courier-border-transparent md:courier-text-md courier-py-1 courier-border-transparent !courier-border-none courier-font-medium"
              placeholder="Write subject..."
              readOnly={previewMode !== undefined}
            />
          </div>
          <div className="courier-w-64 courier-pl-4 courier-flex courier-justify-end courier-items-center courier-gap-2">
            <Status />
            {isAutoSave && (
              <Button variant="primary" buttonSize="small" disabled={!templateData?.data?.tenant?.notification || isTemplatePublishing === true} onClick={handlePublish}>
                {isTemplatePublishing ? 'Publishing...' : 'Publish changes'}
              </Button>
            )}
          </div>
        </Header>
      }

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
        <div className={cn(
          "courier-flex courier-flex-1 courier-overflow-hidden",
          previewMode && "courier-editor-preview-mode",
          previewMode === 'mobile' && "courier-editor-preview-mode-mobile",
          !isVisible && "courier-hidden"
        )}>
          <div className="courier-flex courier-flex-col courier-flex-1">
            {!isLoading && isVisible && <TextMenu editor={editor} />}
            <div className="courier-editor-container courier-relative" ref={ref}>
              <div className={cn(
                "courier-editor-main courier-transition-all courier-duration-300 courier-ease-in-out",
                previewMode && "courier-max-w-4xl courier-mx-auto"
              )}>
                <SortableContext items={items["Editor"]} strategy={strategy}>
                  <EditorContent
                    editor={editor}
                    onClick={handleEditorClick}
                  />
                </SortableContext>
              </div>
              <PreviewPanel previewMode={previewMode} togglePreviewMode={togglePreviewMode} />
            </div>
          </div>
          <div
            className={cn(
              "courier-editor-sidebar",
              previewMode
                ? "courier-opacity-0 courier-pointer-events-none courier-translate-x-full courier-w-0 courier-flex-shrink-0"
                : "courier-opacity-100 courier-translate-x-0 courier-w-64 courier-flex-shrink-0"
            )}
          >
            <div className="courier-p-4 courier-h-full">
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
              "courier-bg-white courier-border courier-border-border courier-rounded-lg courier-p-4 courier-shadow-lg",
              "courier-opacity-90 courier-scale-105 courier-transition-transform"
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
    </>
  )
});
