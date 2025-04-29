import { BrandFooter } from "@/components/BrandEditor/Editor/BrandFooter/BrandFooter";
import { useTemplateActions } from "@/components/Providers";
import { Button, Input } from "@/components/ui-kit";
import { ButtonBlock } from "@/components/ui/Blocks/ButtonBlock";
import { DividerBlock } from "@/components/ui/Blocks/DividerBlock";
import { HeadingBlock } from "@/components/ui/Blocks/HeadingBlock";
import { ImageBlock } from "@/components/ui/Blocks/ImageBlock";
import { SpacerBlock } from "@/components/ui/Blocks/SpacerBlock";
import { TextBlock } from "@/components/ui/Blocks/TextBlock";
import { Header } from "@/components/ui/Header";
import { PreviewPanel } from "@/components/ui/PreviewPanel";
import { Status } from "@/components/ui/Status";
import { TextMenu } from "@/components/ui/TextMenu";
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import { cn } from "@/lib/utils";
import type {
  CollisionDetection,
  DragEndEvent,
  DragMoveEvent,
  DragStartEvent,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  getFirstCollision,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Node } from "@tiptap/pm/model";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { EditorContent } from "@tiptap/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { forwardRef, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  brandApplyAtom,
  isTenantLoadingAtom,
  isTenantSavingAtom,
  tenantDataAtom,
  tenantErrorAtom,
} from "../../Providers/store";
import { createOrDuplicateNode } from "../../utils";
import { coordinateGetter as multipleContainersCoordinateGetter } from "../../utils/multipleContainersKeyboardCoordinates";
import { subjectAtom } from "../store";
import { BrandEditorFormAtom } from "@/components/BrandEditor/store";
import { SideBar } from "./SideBar";
import { SideBarItemDetails } from "./SideBar/SideBarItemDetails";

export interface EditorProps {
  editor: TiptapEditor;
  handleEditorClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  isLoading?: boolean;
  isVisible?: boolean;
  hidePublish?: boolean;
  brandEditor?: boolean;
  variables?: Record<string, unknown>;
}

interface Items {
  Editor: UniqueIdentifier[];
  Sidebar: UniqueIdentifier[];
}

const EditorComponent = forwardRef<HTMLDivElement, EditorProps>(
  (
    { editor, handleEditorClick, isLoading, isVisible, hidePublish, brandEditor, variables },
    ref
  ) => {
    const selectedNode = useAtomValue(selectedNodeAtom);
    const setSelectedNode = useSetAtom(selectedNodeAtom);
    const [subject, setSubject] = useAtom(subjectAtom);
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [activeDragType, setActiveDragType] = useState<string | null>(null);
    const lastOverId = useRef<UniqueIdentifier | null>(null);
    const recentlyMovedToNewContainer = useRef(false);
    const timeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
    const [lastPlaceholderIndex, setLastPlaceholderIndex] = useState<number | null>(null);
    const [previewMode, setPreviewMode] = useState<"desktop" | "mobile" | undefined>(undefined);
    const tenantData = useAtomValue(tenantDataAtom);
    const { publishTemplate, isTenantPublishing } = useTemplateActions();
    const isTenantSaving = useAtomValue(isTenantSavingAtom);
    const isTenantLoading = useAtomValue(isTenantLoadingAtom);
    const tenantError = useAtomValue(tenantErrorAtom);
    const brandApply = useAtomValue(brandApplyAtom);
    const BrandEditorForm = useAtomValue(BrandEditorFormAtom);

    // Add a ref to track if content has been loaded from server
    const contentLoadedRef = useRef(false);

    // Store the request ID for requestAnimationFrame
    const rafId = useRef<number | null>(null);

    // const brandSettings = BrandEditorForm ?? tenantData?.data?.tenant?.brand?.settings;
    const brandSettings = useMemo(() => {
      if (BrandEditorForm) {
        return BrandEditorForm;
      }
      const brandSettings = tenantData?.data?.tenant?.brand?.settings;
      return {
        brandColor: brandSettings?.colors?.primary,
        textColor: brandSettings?.colors?.secondary,
        subtleColor: brandSettings?.colors?.tertiary,
        headerStyle: brandSettings?.email?.header?.barColor ? "border" : "plain",
        logo: brandSettings?.email?.header?.logo?.image,
        link: brandSettings?.email?.header?.logo?.href,
        facebookLink: brandSettings?.email?.footer?.social?.facebook?.url,
        linkedinLink: brandSettings?.email?.footer?.social?.linkedin?.url,
        instagramLink: brandSettings?.email?.footer?.social?.instagram?.url,
        mediumLink: brandSettings?.email?.footer?.social?.medium?.url,
        xLink: brandSettings?.email?.footer?.social?.twitter?.url,
      };
    }, [BrandEditorForm, tenantData]);

    const isBrandApply = brandApply && Boolean(brandSettings);

    const coordinateGetter = multipleContainersCoordinateGetter;
    const strategy = verticalListSortingStrategy;

    const [items, setItems] = useState<Items>({
      Editor: [] as UniqueIdentifier[],
      Sidebar: ["heading", "text", "image", "spacer", "divider", "button"],
    });

    // Cleanup function for timeouts
    const cleanupTimeouts = useCallback(() => {
      Object.values(timeoutRef.current).forEach((timeout) => clearTimeout(timeout));
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

    // Function to sync editor items - extracted for reuse
    const syncEditorItems = useCallback(() => {
      // Cancel any pending frame request
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }

      // Use setTimeout to ensure DOM has time to fully update
      setTimeout(() => {
        rafId.current = requestAnimationFrame(() => {
          try {
            // Get the editor DOM element
            const editorDOM = editor.view.dom;
            if (!editorDOM) {
              console.warn("syncEditorItems: Editor DOM element not found");
              return;
            }

            // Find all rendered node view wrappers - direct children only
            const nodeWrappers = editorDOM.querySelectorAll(
              ".react-renderer > div[data-node-view-wrapper][data-id]"
            );

            // Extract IDs from DOM elements
            const domIds: string[] = [];
            nodeWrappers.forEach((wrapper) => {
              const id = (wrapper as HTMLElement).dataset.id;
              if (id) {
                domIds.push(id);
              }
            });

            // Update the state with the derived IDs from the DOM
            setItems((prevItems) => ({
              Editor: domIds,
              Sidebar: prevItems.Sidebar,
            }));
          } catch (error) {
            console.error("Error syncing editor items:", error);
            setItems((prev) => ({ ...prev })); // Avoid resetting state on error
          }
        });
      }, 50); // Small delay to let DOM updates settle
    }, [editor]);

    // Watch for tenant data loading state changes to re-sync items when content is loaded
    useEffect(() => {
      if (isTenantLoading === false && tenantData && !contentLoadedRef.current) {
        contentLoadedRef.current = true;
        // Use a slight delay to ensure DOM is fully updated after content loading
        setTimeout(() => {
          if (editor && !editor.isDestroyed) {
            syncEditorItems(); // Call our sync function
          }
        }, 300); // Delay to ensure rendering completes
      }
    }, [isTenantLoading, tenantData, editor, syncEditorItems]); // Added syncEditorItems dependency

    useEffect(() => {
      const updateItems = () => {
        // Check if editor contains just a single empty paragraph (happens after removing last element)
        syncEditorItems();
      };

      // Listen to multiple editor events to catch all update scenarios
      editor.on("update", updateItems);
      editor.on("selectionUpdate", updateItems);
      editor.on("create", updateItems);
      // Add transaction listener to catch content changes like auto-added paragraphs
      editor.on("transaction", updateItems);

      // Initial call to populate items immediately if editor is ready
      if (editor && !editor.isDestroyed) {
        updateItems();
      }

      // Listen for node duplication events
      const handleNodeDuplicated = (_event: CustomEvent) => {
        updateItems(); // Schedule update
      };
      document.addEventListener("node-duplicated", handleNodeDuplicated as EventListener);

      // Cleanup
      return () => {
        editor.off("update", updateItems);
        editor.off("selectionUpdate", updateItems);
        editor.off("create", updateItems);
        editor.off("transaction", updateItems);
        document.removeEventListener("node-duplicated", handleNodeDuplicated as EventListener);
        // Cancel any pending frame request on unmount
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
        }
      };
    }, [editor, syncEditorItems]); // Added syncEditorItems dependency

    const togglePreviewMode = (mode: "desktop" | "mobile" | undefined) => {
      const defaultMode = previewMode === undefined ? "desktop" : undefined;
      const newPreviewMode = mode || defaultMode;

      setPreviewMode(newPreviewMode);

      setSelectedNode(null);

      // Set editor to readonly when in preview mode
      if (newPreviewMode) {
        editor.setEditable(false);
      } else {
        editor.setEditable(true);
      }
    };

    const handlePublish = useCallback(() => {
      publishTemplate();
    }, [publishTemplate]);

    const sensors = useSensors(
      useSensor(MouseSensor),
      useSensor(TouchSensor),
      useSensor(KeyboardSensor, {
        coordinateGetter,
      })
    );

    const onDragCancel = useCallback(() => {
      setActiveId(null);
    }, []);

    const findContainer = useCallback(
      (id: UniqueIdentifier) => {
        // If the id is a temp id, it belongs to the Editor container
        if (typeof id === "string" && id.includes("_temp_")) {
          return "Editor";
        }

        if (id in items) {
          return id;
        }

        return Object.keys(items).find((key) =>
          items[key as keyof typeof items].includes(id as string)
        );
      },
      [items]
    );

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

        // Determine intersections, prioritizing pointer intersections
        const pointerIntersections = pointerWithin(args);
        const potentialIntersections =
          pointerIntersections.length > 0 ? pointerIntersections : rectIntersection(args);

        // Filter out undefined collisions before getting the first one
        const validIntersections = potentialIntersections.filter(
          (intersection) => intersection.id !== undefined
        );

        let overId = getFirstCollision(validIntersections, "id");

        if (overId != null) {
          // If the determined overId is the Editor container itself, treat it as such
          if (overId === "Editor") {
            lastOverId.current = overId;
            return [{ id: overId }];
          }

          // Check if the overId corresponds to a registered container in our state
          if (overId in items) {
            const containerItems = items[overId as keyof typeof items];

            // If a container is matched and it contains items
            if (containerItems.length > 0) {
              // Find the closest droppable item within that container
              const closestId = closestCenter({
                ...args,
                droppableContainers: args.droppableContainers.filter(
                  (container) =>
                    container.id !== overId && containerItems.includes(container.id as string) // Check string IDs
                ),
              })[0]?.id;

              // If a closest item is found, use its ID as the overId
              if (closestId) {
                overId = closestId;
              }
              // If no closest item found within the container,
              // it might mean we are hovering over the container itself (e.g., empty column)
              // Keep the container's ID as overId in this case.
            }
            // If containerItems is empty, we keep the container ID as overId
          }
          // If overId is not a container key, it must be an item ID within a container.
          // We already have the correct overId (the item itself).

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
    const getDocumentPosition = useCallback(
      (index: number) => {
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
      },
      [editor]
    );

    const measuringProps = useMemo(
      () => ({
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }),
      []
    );

    const onDragStartHandler = useCallback(({ active }: DragStartEvent) => {
      setActiveId(active.id);
      // Store the type of item being dragged if it's from sidebar
      if (
        active.id === "text" ||
        active.id === "divider" ||
        active.id === "spacer" ||
        active.id === "button" ||
        active.id === "image" ||
        active.id === "heading"
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

        const elements = editor.view.dom.querySelectorAll("[data-node-view-wrapper]");
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
            editor.commands.removeDragPlaceholder();
            editor.commands.setDragPlaceholder({
              id: tempId,
              type: active.id as string,
              pos: getDocumentPosition(targetIndex),
            });

            setItems((prev) => ({
              ...prev,
              Editor: [...prev.Editor.filter((id) => !id.toString().includes("_temp")), tempId],
            }));
          });
        }
      },
      [editor.commands, editor.view.dom, findContainer, getDocumentPosition, lastPlaceholderIndex]
    );

    const cleanupPlaceholder = useCallback(() => {
      editor.commands.removeDragPlaceholder();
      setItems((prev) => ({
        ...prev,
        Editor: prev.Editor.filter((id) => !id.toString().includes("_temp")),
      }));
    }, [editor.commands, setItems]);

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

        const overContainer = findContainer(overId);
        const activeContainer = findContainer(active.id);

        if (
          activeContainer === "Sidebar" &&
          overContainer === "Editor" &&
          lastPlaceholderIndex !== null
        ) {
          // Handle new element insertion
          const insertPos = getDocumentPosition(lastPlaceholderIndex);
          createOrDuplicateNode(editor, activeDragType as string, insertPos, undefined, (node) =>
            setSelectedNode(node as Node)
          );
        } else if (activeContainer === overContainer) {
          // Handle reordering within Editor
          const activeIndex = items[activeContainer as keyof Items].indexOf(active.id as string);
          const overIndex = items[overContainer as keyof Items].indexOf(overId as string);

          if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
            setItems((items) => ({
              ...items,
              [overContainer as keyof Items]: arrayMove(
                items[overContainer as keyof Items],
                activeIndex,
                overIndex
              ),
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
                  editor.state.schema.nodeFromJSON({ type: "doc", content: newContent })
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
      },
      [
        cleanupPlaceholder,
        editor,
        findContainer,
        getDocumentPosition,
        items,
        lastPlaceholderIndex,
        setSelectedNode,
        setActiveDragType,
        setActiveId,
        activeDragType,
      ]
    );

    const onDragCancelHandler = useCallback(() => {
      cleanupPlaceholder();
      // Remove any placeholder nodes
      editor.commands.removeDragPlaceholder();
      onDragCancel();
    }, [cleanupPlaceholder, editor.commands, onDragCancel]);

    const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSubject(e.target.value);
    };

    return (
      <>
        {!isLoading && isVisible && (
          <Header>
            <div className="courier-flex courier-items-center courier-gap-2 courier-grow">
              <h4 className="courier-text-sm">Subject: </h4>
              <Input
                value={subject ?? ""}
                onChange={handleSubjectChange}
                onFocus={() => setSelectedNode(null)}
                className="!courier-bg-background read-only:courier-cursor-default read-only:courier-border-transparent md:courier-text-md courier-py-1 courier-border-transparent !courier-border-none courier-font-medium"
                placeholder="Write subject..."
                readOnly={previewMode !== undefined}
              />
            </div>
            <div className="courier-w-64 courier-pl-4 courier-flex courier-justify-end courier-items-center courier-gap-2">
              {isTenantSaving !== null && (
                <Status
                  isLoading={Boolean(isTenantLoading)}
                  isSaving={Boolean(isTenantSaving)}
                  isError={Boolean(tenantError)}
                />
              )}
              {!hidePublish && isTenantLoading !== null && (
                <Button
                  variant="primary"
                  buttonSize="small"
                  disabled={
                    !tenantData?.data?.tenant?.notification ||
                    isTenantPublishing === true ||
                    isTenantSaving !== false
                  }
                  onClick={handlePublish}
                >
                  {isTenantPublishing ? "Publishing..." : "Publish changes"}
                </Button>
              )}
            </div>
          </Header>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          measuring={measuringProps}
          onDragStart={onDragStartHandler}
          onDragMove={onDragMoveHandler}
          onDragEnd={onDragEndHandler}
          onDragCancel={onDragCancelHandler}
        >
          <div
            className={cn(
              "courier-flex courier-flex-1 courier-overflow-hidden",
              previewMode && "courier-editor-preview-mode",
              previewMode === "mobile" && "courier-editor-preview-mode-mobile",
              !isVisible && "courier-hidden"
            )}
          >
            <div className="courier-flex courier-flex-col courier-flex-1">
              {!isLoading && isVisible && <TextMenu editor={editor} />}
              <div className="courier-editor-container courier-relative" ref={ref}>
                <div
                  className={cn(
                    "courier-editor-main courier-transition-all courier-duration-300 courier-ease-in-out",
                    previewMode && "courier-max-w-4xl courier-mx-auto"
                  )}
                >
                  {isBrandApply && (
                    <div
                      className={cn(
                        "courier-py-5 courier-px-9 courier-pb-0 courier-relative courier-overflow-hidden courier-flex courier-flex-col courier-items-start",
                        brandSettings?.headerStyle === "border" && "courier-pt-6"
                      )}
                    >
                      {brandSettings?.headerStyle === "border" && (
                        <div
                          className="courier-absolute courier-top-0 courier-left-0 courier-right-0 courier-h-2"
                          style={{ backgroundColor: brandSettings?.brandColor }}
                        />
                      )}
                      {brandSettings?.logo && (
                        <img
                          src={brandSettings.logo}
                          alt="Brand logo"
                          className="courier-w-auto courier-max-w-36 courier-object-contain courier-cursor-default"
                        />
                      )}
                    </div>
                  )}
                  <SortableContext items={items["Editor"]} strategy={strategy}>
                    <EditorContent editor={editor} onClick={handleEditorClick} />
                  </SortableContext>
                  {isBrandApply && (
                    <div className="courier-py-5 courier-px-9 courier-pt-0 courier-flex courier-flex-col">
                      <BrandFooter
                        readOnly
                        variables={variables}
                        facebookLink={brandSettings?.facebookLink}
                        linkedinLink={brandSettings?.linkedinLink}
                        instagramLink={brandSettings?.instagramLink}
                        mediumLink={brandSettings?.mediumLink}
                        xLink={brandSettings?.xLink}
                      />
                    </div>
                  )}
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
                  <SideBarItemDetails element={selectedNode} editor={editor} />
                ) : (
                  <SortableContext items={items["Sidebar"]} strategy={strategy}>
                    <SideBar items={items["Sidebar"]} brandEditor={brandEditor} />
                  </SortableContext>
                )}
              </div>
            </div>
          </div>
          <DragOverlay dropAnimation={null}>
            {activeId &&
            (activeId === "text" ||
              activeId === "divider" ||
              activeId === "spacer" ||
              activeId === "button" ||
              activeId === "image" ||
              activeId === "heading") ? (
              <div
                className={cn(
                  "courier-bg-white courier-border courier-border-border courier-rounded-lg courier-p-4 courier-shadow-lg",
                  "courier-opacity-90 courier-scale-105 courier-transition-transform"
                )}
              >
                {activeDragType === "heading" && <HeadingBlock draggable />}
                {activeDragType === "text" && <TextBlock draggable />}
                {activeDragType === "spacer" && <SpacerBlock draggable />}
                {activeDragType === "divider" && <DividerBlock draggable />}
                {activeDragType === "button" && <ButtonBlock draggable />}
                {activeDragType === "image" && <ImageBlock draggable />}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </>
    );
  }
);

export const Editor = memo(EditorComponent);
