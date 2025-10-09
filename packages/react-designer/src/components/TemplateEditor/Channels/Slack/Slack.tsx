import { ExtensionKit } from "@/components/extensions/extension-kit";
import type { MessageRouting } from "@/components/Providers/store";
import { isTemplateLoadingAtom } from "@/components/Providers/store";
import {
  brandEditorAtom,
  templateEditorContentAtom,
  isTemplateTransitioningAtom,
} from "@/components/TemplateEditor/store";
import type { TextMenuConfig } from "@/components/ui/TextMenu/config";
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import type { TiptapDoc } from "@/lib/utils";
import { cn, convertElementalToTiptap, convertTiptapToElemental, updateElemental } from "@/lib/utils";
import type { ChannelType } from "@/store";
import type { ElementalNode } from "@/types/elemental.types";
import type { AnyExtension, Editor } from "@tiptap/react";
import { useCurrentEditor } from "@tiptap/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import React, { forwardRef, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MainLayout } from "../../../ui/MainLayout";
import type { TemplateEditorProps } from "../../TemplateEditor";
import { Channels } from "../Channels";
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
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { ButtonBlock } from "@/components/ui/Blocks/ButtonBlock";
import { DividerBlock } from "@/components/ui/Blocks/DividerBlock";
import { TextBlock } from "@/components/ui/Blocks/TextBlock";
import { createOrDuplicateNode } from "@/components/utils";
import { arrayMove } from "@dnd-kit/sortable";
import type { Node } from "@tiptap/pm/model";

export const defaultSlackContent: ElementalNode[] = [
  { type: "text", content: "\n" },
];

// Helper function to get or create default Slack element
const getOrCreateSlackElement = (
  templateEditorContent: { elements: ElementalNode[] } | null | undefined
): ElementalNode => {
  let element: ElementalNode | undefined = templateEditorContent?.elements.find(
    (el: ElementalNode): el is ElementalNode & { type: "channel"; channel: "slack" } =>
      el.type === "channel" && el.channel === "slack"
  );

  if (!element) {
    element = {
      type: "channel",
      channel: "slack",
      elements: defaultSlackContent,
    };
  }

  return element!;
};

export const SlackEditorContent = ({ value }: { value?: TiptapDoc }) => {
  const { editor } = useCurrentEditor();
  const setBrandEditor = useSetAtom(brandEditorAtom);
  const templateEditorContent = useAtomValue(templateEditorContentAtom);
  const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
  const selectedNode = useAtomValue(selectedNodeAtom);
  const isValueUpdated = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (isTemplateLoading) {
      isValueUpdated.current = false;
    }
  }, [isTemplateLoading]);

  useEffect(() => {
    if (!editor || isTemplateLoading !== false || isValueUpdated.current || !value) {
      return;
    }

    isValueUpdated.current = true;

    editor.commands.setContent(value);
  }, [editor, value, isTemplateLoading]);

  useEffect(() => {
    if (editor) {
      setBrandEditor(editor);
      setTimeout(() => {
        editor.commands.blur();
      }, 1);
    }
  }, [editor, setBrandEditor]);

  useEffect(() => {
    if (editor && mountedRef.current) {
      editor.commands.updateSelectionState(selectedNode);
    }
  }, [editor, selectedNode]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Update editor content when templateEditorContent changes
  useEffect(() => {
    if (!editor || !templateEditorContent) return;

    // Don't update content if user is actively typing
    if (editor.isFocused) return;

    const element = getOrCreateSlackElement(templateEditorContent);

    const newContent = convertElementalToTiptap(
      {
        version: "2022-01-01",
        elements: [element],
      },
      { channel: "slack" }
    );

    const incomingContent = convertTiptapToElemental(newContent);
    const currentContent = convertTiptapToElemental(editor.getJSON() as TiptapDoc);

    // Only update if content has actually changed to avoid infinite loops
    if (JSON.stringify(incomingContent) !== JSON.stringify(currentContent)) {
      setTimeout(() => {
        if (!editor.isFocused) {
          editor.commands.setContent(newContent);
        }
      }, 1);
    }
  }, [editor, templateEditorContent]);

  return null;
};

export interface SlackRenderProps {
  content: TiptapDoc;
  extensions: AnyExtension[];
  editable: boolean;
  autofocus: boolean;
  onUpdate: ({ editor }: { editor: Editor }) => void;
  items: { Sidebar: string[]; Editor: UniqueIdentifier[] };
  selectedNode: import("@tiptap/pm/model").Node | null;
  slackEditor: Editor | null;
}

export interface SlackProps
  extends Pick<
    TemplateEditorProps,
    "hidePublish" | "theme" | "variables" | "channels" | "routing" | "value"
  > {
  readOnly?: boolean;
  headerRenderer?: ({
    hidePublish,
    channels,
    routing,
  }: {
    hidePublish?: boolean;
    channels?: ChannelType[];
    routing?: MessageRouting;
  }) => React.ReactNode;
  render?: (props: SlackRenderProps) => React.ReactNode;
}

export const SlackConfig: TextMenuConfig = {
  contentType: { state: "hidden" },
  bold: { state: "enabled" },
  italic: { state: "enabled" },
  underline: { state: "enabled" },
  strike: { state: "enabled" },
  alignLeft: { state: "hidden" },
  alignCenter: { state: "hidden" },
  alignRight: { state: "hidden" },
  alignJustify: { state: "hidden" },
  quote: { state: "enabled" },
  link: { state: "enabled" },
  variable: { state: "enabled" },
};

const SlackComponent = forwardRef<HTMLDivElement, SlackProps>(
  (
    { theme, hidePublish, variables, readOnly, channels, routing, headerRenderer, render, value },
    ref
  ) => {
    const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
    const isInitialLoadRef = useRef(true);
    const isMountedRef = useRef(false);
    const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom);
    const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
    const isTemplateTransitioning = useAtomValue(isTemplateTransitioningAtom);
    const brandEditor = useAtomValue(brandEditorAtom);
    const [activeDragType, setActiveDragType] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [items, setItems] = useState<{ Sidebar: string[]; Editor: UniqueIdentifier[] }>({
      Sidebar: ["text", "divider", "button"],
      Editor: [],
    });
    const [lastPlaceholderIndex, setLastPlaceholderIndex] = useState<number | null>(null);
    const lastOverId = useRef<UniqueIdentifier | null>(null);
    const recentlyMovedToNewContainer = useRef(false);
    const rafId = useRef<number | null>(null);

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
      useSensor(KeyboardSensor, {})
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

    // Function to sync editor items - extracted for reuse
    const syncEditorItems = useCallback((editor: Editor) => {
      // Cancel any pending frame request
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }

      // Use setTimeout to ensure DOM has time to fully update
      setTimeout(() => {
        rafId.current = requestAnimationFrame(() => {
          try {
            // Get the editor DOM element
            const editorDOM = editor?.view.dom;
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
    }, []);

    const getDocumentPosition = useCallback(
      (index: number) => {
        try {
          const doc = brandEditor?.state.doc;
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
          return brandEditor?.state.doc.content.size ?? 0;
        }
      },
      [brandEditor]
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

    const measuringProps = useMemo(
      () => ({
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }),
      []
    );

    const extendedVariables = useMemo(() => {
      return {
        urls: {
          unsubscribe: true,
          preferences: true,
        },
        ...variables,
      };
    }, [variables]);

    // Track component mount status
    useEffect(() => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
      };
    }, []);

    // Sync items when editor updates
    useEffect(() => {
      const updateItems = () => {
        if (brandEditor) {
          syncEditorItems(brandEditor);
        }
      };

      // Listen to multiple editor events to catch all update scenarios
      brandEditor?.on("update", updateItems);
      brandEditor?.on("selectionUpdate", updateItems);
      brandEditor?.on("create", updateItems);
      brandEditor?.on("transaction", updateItems);

      // Initial call to populate items immediately if editor is ready
      if (brandEditor && !brandEditor.isDestroyed) {
        updateItems();
      }

      // Listen for node duplication events
      const handleNodeDuplicated = (_event: CustomEvent) => {
        updateItems();
      };
      document.addEventListener("node-duplicated", handleNodeDuplicated as EventListener);

      // Cleanup
      return () => {
        brandEditor?.off("update", updateItems);
        brandEditor?.off("selectionUpdate", updateItems);
        brandEditor?.off("create", updateItems);
        brandEditor?.off("transaction", updateItems);
        document.removeEventListener("node-duplicated", handleNodeDuplicated as EventListener);
        // Cancel any pending frame request on unmount
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
        }
      };
    }, [brandEditor, syncEditorItems]);

    // Watch for template loading state changes to re-sync items when content is loaded
    useEffect(() => {
      if (isTemplateLoading === false && templateEditorContent) {
        // Use a slight delay to ensure DOM is fully updated after content loading
        setTimeout(() => {
          if (brandEditor && !brandEditor.isDestroyed) {
            syncEditorItems(brandEditor);
          }
        }, 300);
      }
    }, [isTemplateLoading, templateEditorContent, brandEditor, syncEditorItems]);

    const extensions = useMemo(
      () =>
        [...ExtensionKit({ variables: extendedVariables, setSelectedNode })].filter(
          (e): e is AnyExtension => e !== undefined
        ),
      [extendedVariables, setSelectedNode]
    );

    const onUpdateHandler = useCallback(
      ({ editor }: { editor: Editor }) => {
        if (!editor || isTemplateTransitioning) {
          return;
        }

        // Handle new templates by creating initial structure
        if (!templateEditorContent) {
          const elemental = convertTiptapToElemental(editor.getJSON() as TiptapDoc);

          const newContent = {
            version: "2022-01-01" as const,
            elements: [
              {
                type: "channel" as const,
                channel: "slack" as const,
                elements: elemental,
              },
            ],
          };
          setTemplateEditorContent(newContent);
          return;
        }

        // Prevent updates during rapid typing by debouncing
        const currentJson = editor.getJSON() as TiptapDoc;
        const elemental = convertTiptapToElemental(currentJson);

        const newContent = updateElemental(templateEditorContent, {
          elements: elemental,
          channel: "slack",
        });

        // Only update if there's a meaningful difference in structure, not just content
        const currentElementalStr = JSON.stringify(templateEditorContent.elements);
        const newElementalStr = JSON.stringify(newContent.elements);

        if (currentElementalStr !== newElementalStr) {
          // Use setTimeout to prevent cursor jumping during rapid typing
          setTimeout(() => {
            if (isMountedRef.current) {
              setTemplateEditorContent(newContent);
            }
          }, 100);
        }
      },
      [templateEditorContent, setTemplateEditorContent, isTemplateTransitioning]
    );

    const content = useMemo(() => {
      const element = getOrCreateSlackElement(value);

      // At this point, element is guaranteed to be ElementalNode
      const tipTapContent = convertElementalToTiptap(
        {
          version: "2022-01-01",
          elements: [element],
        },
        { channel: "slack" }
      );

      return tipTapContent;
    }, [value]);

    const onDragStartHandler = useCallback(({ active }: DragStartEvent) => {
      setActiveId(active.id);
      if (
        active.id === "text" ||
        active.id === "divider" ||
        active.id === "button"
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

        const elements = brandEditor?.view.dom.querySelectorAll("[data-node-view-wrapper]");
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
            brandEditor?.commands.removeDragPlaceholder();
            brandEditor?.commands.setDragPlaceholder({
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
      [
        brandEditor?.commands,
        brandEditor?.view.dom,
        findContainer,
        getDocumentPosition,
        lastPlaceholderIndex,
      ]
    );

    const cleanupPlaceholder = useCallback(() => {
      brandEditor?.commands.removeDragPlaceholder();
      setItems((prev) => ({
        ...prev,
        Editor: prev.Editor.filter((id) => !id.toString().includes("_temp")),
      }));
    }, [brandEditor?.commands, setItems]);

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

        if (!brandEditor) {
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
          createOrDuplicateNode(brandEditor, active.id as string, pos, undefined, (node) => setSelectedNode(node as Node));
        } else if (activeContainer === overContainer) {
          // Handle reordering within Editor
          const activeIndex = items[activeContainer as keyof typeof items].indexOf(active.id as string);
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

            const content = brandEditor.getJSON()?.content;

            if (Array.isArray(content)) {
              const newContent = [...content];
              const [movedItem] = newContent.splice(activeIndex, 1);
              newContent.splice(overIndex, 0, movedItem);

              brandEditor.view.dispatch(
                brandEditor.view.state.tr.replaceWith(
                  0,
                  brandEditor.view.state.doc.content.size,
                  brandEditor.state.schema.nodeFromJSON({ type: "doc", content: newContent })
                )
              );
            }
          }
        }

        setActiveId(null);
        setActiveDragType(null);
        setLastPlaceholderIndex(null);
      },
      [brandEditor, cleanupPlaceholder, findContainer, getDocumentPosition, lastPlaceholderIndex, items]
    );

    const onDragCancelHandler = useCallback(() => {
      cleanupPlaceholder();
      setActiveId(null);
      setActiveDragType(null);
    }, [cleanupPlaceholder]);


    return (
      <MainLayout
        theme={theme}
        isLoading={Boolean(isTemplateLoading && isInitialLoadRef.current)}
        Header={
          headerRenderer ? (
            headerRenderer({ hidePublish, channels, routing })
          ) : (
            <Channels hidePublish={hidePublish} channels={channels} routing={routing} />
          )
        }
        ref={ref}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          measuring={measuringProps}
          onDragStart={onDragStartHandler}
          onDragMove={onDragMoveHandler}
          onDragEnd={onDragEndHandler}
          onDragCancel={onDragCancelHandler}
        >
          {render?.({
            content,
            extensions,
            editable: !readOnly,
            autofocus: !readOnly,
            onUpdate: onUpdateHandler,
            items,
            selectedNode,
            slackEditor: brandEditor,
          })}
          <DragOverlay dropAnimation={null}>
            {activeId &&
            (activeId === "text" || activeId === "divider" || activeId === "button") ? (
              <div
                className={cn(
                  "courier-bg-white courier-border courier-border-border courier-rounded-lg courier-p-4 courier-shadow-lg",
                  "courier-opacity-90 courier-scale-105 courier-transition-transform"
                )}
              >
                {activeDragType === "text" && <TextBlock draggable />}
                {activeDragType === "divider" && <DividerBlock draggable />}
                {activeDragType === "button" && <ButtonBlock draggable />}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </MainLayout>
    );
  }
);

export const Slack = memo(SlackComponent);
