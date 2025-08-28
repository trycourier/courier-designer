import { BrandEditorContentAtom, BrandEditorFormAtom } from "@/components/BrandEditor/store";
import { ButtonBlock } from "@/components/ui/Blocks/ButtonBlock";
import { DividerBlock } from "@/components/ui/Blocks/DividerBlock";
import { HeadingBlock } from "@/components/ui/Blocks/HeadingBlock";
import { ImageBlock } from "@/components/ui/Blocks/ImageBlock";
import { SpacerBlock } from "@/components/ui/Blocks/SpacerBlock";
import { TextBlock } from "@/components/ui/Blocks/TextBlock";
import { MainLayout } from "@/components/ui/MainLayout";
import { selectedNodeAtom, setNodeConfigAtom } from "@/components/ui/TextMenu/store";
import type { TiptapDoc } from "@/lib/utils";
import {
  cn,
  convertElementalToTiptap,
  convertTiptapToElemental,
  updateElemental,
} from "@/lib/utils";
import type { ChannelType } from "@/store";
import type { ElementalContent, ElementalNode } from "@/types/elemental.types";
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
import type { SortingStrategy } from "@dnd-kit/sortable";
import { arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Node } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { forwardRef, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MessageRouting, TenantData } from "../../../Providers/store";
import { brandApplyAtom, isTemplateLoadingAtom, templateDataAtom } from "../../../Providers/store";
import { getTextMenuConfigForNode } from "../../../ui/TextMenu/config";
import { createOrDuplicateNode } from "../../../utils";
import { coordinateGetter as multipleContainersCoordinateGetter } from "../../../utils/multipleContainersKeyboardCoordinates";
import { emailEditorAtom, subjectAtom, templateEditorContentAtom } from "../../store";
import type { TemplateEditorProps } from "../../TemplateEditor";
import { Channels } from "../Channels";

interface BrandSettingsData {
  brandColor?: string;
  textColor?: string;
  subtleColor?: string;
  headerStyle: "border" | "plain";
  logo?: string;
  link?: string;
  facebookLink?: string;
  linkedinLink?: string;
  instagramLink?: string;
  mediumLink?: string;
  xLink?: string;
}

export interface EmailProps
  extends Pick<
    TemplateEditorProps,
    "hidePublish" | "brandEditor" | "channels" | "variables" | "theme" | "routing" | "value"
  > {
  isLoading?: boolean;
  headerRenderer?: ({
    hidePublish,
    channels,
    routing,
  }: {
    hidePublish?: boolean;
    channels?: ChannelType[];
    routing?: MessageRouting;
  }) => React.ReactNode;
  render?: ({
    subject,
    handleSubjectChange,
    selectedNode,
    setSelectedNode,
    previewMode,
    emailEditor,
    ref,
    isBrandApply,
    brandSettings,
    items,
    content,
    strategy,
    syncEditorItems,
    brandEditorContent,
    templateData,
    togglePreviewMode,
  }: {
    subject: string | null;
    handleSubjectChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    selectedNode: Node | null;
    setSelectedNode: (node: Node | null) => void;
    previewMode: "desktop" | "mobile" | undefined;
    emailEditor: Editor | null;
    ref: React.RefObject<HTMLDivElement> | null;
    isBrandApply: boolean;
    brandSettings: BrandSettingsData | null;
    items: Items;
    content: TiptapDoc | null;
    strategy: SortingStrategy;
    syncEditorItems: (editor: Editor) => void;
    brandEditorContent: string | null;
    templateData: TenantData | null;
    togglePreviewMode: (mode: "desktop" | "mobile" | undefined) => void;
  }) => React.ReactNode;
}

interface Items {
  Editor: UniqueIdentifier[];
  Sidebar: UniqueIdentifier[];
}

export const defaultEmailContent: ElementalNode[] = [
  {
    type: "text",
    align: "left",
    content: "\n",
    text_style: "h1",
  },
  {
    type: "text",
    align: "left",
    content: "",
  },
  {
    type: "image",
    src: "",
  },
];

const EmailComponent = forwardRef<HTMLDivElement, EmailProps>(
  ({ hidePublish, theme, channels, routing, render, headerRenderer, value }, ref) => {
    const emailEditor = useAtomValue(emailEditorAtom);
    const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom);
    const [subject, setSubject] = useAtom(subjectAtom);
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [activeDragType, setActiveDragType] = useState<string | null>(null);
    const lastOverId = useRef<UniqueIdentifier | null>(null);
    const recentlyMovedToNewContainer = useRef(false);
    const timeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
    const [lastPlaceholderIndex, setLastPlaceholderIndex] = useState<number | null>(null);
    const [previewMode, setPreviewMode] = useState<"desktop" | "mobile" | undefined>(undefined);
    const templateData = useAtomValue(templateDataAtom);
    const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
    const brandApply = useAtomValue(brandApplyAtom);
    const BrandEditorForm = useAtomValue(BrandEditorFormAtom);
    const currentTabIndexRef = useRef<number>(-1);
    const setNodeConfig = useSetAtom(setNodeConfigAtom);
    const mountedRef = useRef(false);
    // Add a ref to track if content has been loaded from server
    const contentLoadedRef = useRef(false);
    const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
    const brandEditorContent = useAtomValue(BrandEditorContentAtom);

    // Store the request ID for requestAnimationFrame
    const rafId = useRef<number | null>(null);

    // Update TextMenu configuration when selected node changes
    useEffect(() => {
      if (selectedNode) {
        const nodeName = selectedNode.type.name;
        const config = getTextMenuConfigForNode(nodeName);
        setNodeConfig({ nodeName, config });
      }
    }, [selectedNode, setNodeConfig]);

    // const brandSettings = BrandEditorForm ?? tenantData?.data?.tenant?.brand?.settings;
    const brandSettings: BrandSettingsData = useMemo(() => {
      if (BrandEditorForm) {
        return BrandEditorForm;
      }
      const brandSettings = templateData?.data?.tenant?.brand?.settings;
      return {
        brandColor: brandSettings?.colors?.primary || "#000000",
        textColor: brandSettings?.colors?.secondary || "#000000",
        subtleColor: brandSettings?.colors?.tertiary || "#666666",
        headerStyle: brandSettings?.email?.header?.barColor ? "border" : "plain",
        logo: brandSettings?.email?.header?.logo?.image,
        link: brandSettings?.email?.header?.logo?.href,
        facebookLink: brandSettings?.email?.footer?.social?.facebook?.url,
        linkedinLink: brandSettings?.email?.footer?.social?.linkedin?.url,
        instagramLink: brandSettings?.email?.footer?.social?.instagram?.url,
        mediumLink: brandSettings?.email?.footer?.social?.medium?.url,
        xLink: brandSettings?.email?.footer?.social?.twitter?.url,
      };
    }, [BrandEditorForm, templateData]);

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

    useEffect(() => {
      const handleKeyPress = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setSelectedNode(null);
          emailEditor?.commands.blur();
          currentTabIndexRef.current = -1;
        }

        // Handle Tab navigation between blocks
        if (event.key === "Tab" && emailEditor) {
          event.preventDefault();

          let currentIndex = -1;
          if (selectedNode) {
            // Use your logic to find the index by ID
            emailEditor.state.doc.content.forEach((node, _offset, index) => {
              if (selectedNode.attrs.id === node.attrs.id) {
                currentIndex = index;
              }
            });
          }

          // If no node was selected or the selected node couldn't be found by ID,
          // default to the first node (or perhaps use cursor position as a fallback?)
          if (currentIndex === -1) {
            currentIndex = 0;
          }

          const doc = emailEditor.state.doc;

          // Determine target index based on Tab or Shift+Tab
          let targetIndex;
          if (!event.shiftKey) {
            // Tab: move to next node
            targetIndex = (currentIndex + 1) % doc.childCount;
          } else {
            // Shift+Tab: move to previous node
            targetIndex = (currentIndex - 1 + doc.childCount) % doc.childCount;
          }

          // Select the new node
          if (targetIndex !== currentIndex || selectedNode === null) {
            const targetNode = doc.child(targetIndex);

            // Update the selected node state
            setSelectedNode(targetNode);

            // Blur the editor to remove the text cursor
            emailEditor.commands.blur();
          }
        }
      };

      document.addEventListener("keydown", handleKeyPress);
      return () => {
        document.removeEventListener("keydown", handleKeyPress);
      };
    }, [emailEditor, selectedNode, setSelectedNode]);

    const getSubject = (content: ElementalContent) => {
      const channelNode = content.elements.find(
        (el) => el.type === "channel" && el.channel === "email"
      );

      if (channelNode && "elements" in channelNode && channelNode.elements) {
        const subjectNode = channelNode.elements.find((el) => el.type === "meta");

        if (subjectNode && "title" in subjectNode && typeof subjectNode.title === "string") {
          return subjectNode.title;
        }
      }
      return null;
    };

    useEffect(() => {
      const content = templateEditorContent ?? "";

      if (!content) {
        return;
      }

      const subject = getSubject(content);
      setSubject(subject ?? "");

      setTimeout(() => {
        if (!emailEditor || emailEditor.isDestroyed) return;

        // Set initial selection if document has only one node
        if (emailEditor.state.doc.childCount === 1) {
          const firstNode = emailEditor.state.doc.child(0);
          setSelectedNode(firstNode);
        }
      }, 0);
    }, [
      templateData,
      isTemplateLoading,
      emailEditor,
      templateEditorContent,
      setSubject,
      setSelectedNode,
    ]);

    // Watch for tenant data loading state changes to re-sync items when content is loaded
    useEffect(() => {
      if (isTemplateLoading === false && templateData && !contentLoadedRef.current) {
        contentLoadedRef.current = true;
        // Use a slight delay to ensure DOM is fully updated after content loading
        setTimeout(() => {
          if (emailEditor && !emailEditor.isDestroyed) {
            syncEditorItems(emailEditor); // Call our sync function
          }
        }, 300); // Delay to ensure rendering completes
      }
    }, [isTemplateLoading, templateData, emailEditor, syncEditorItems]); // Added syncEditorItems dependency

    useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
      };
    }, []);

    useEffect(() => {
      const updateItems = () => {
        // Check if editor contains just a single empty paragraph (happens after removing last element)
        if (emailEditor) {
          syncEditorItems(emailEditor);
        }
      };

      // Listen to multiple editor events to catch all update scenarios
      emailEditor?.on("update", updateItems);
      emailEditor?.on("selectionUpdate", updateItems);
      emailEditor?.on("create", updateItems);
      // Add transaction listener to catch content changes like auto-added paragraphs
      emailEditor?.on("transaction", updateItems);

      // Initial call to populate items immediately if editor is ready
      if (emailEditor && !emailEditor.isDestroyed) {
        updateItems();
      }

      // Listen for node duplication events
      const handleNodeDuplicated = (_event: CustomEvent) => {
        updateItems(); // Schedule update
      };
      document.addEventListener("node-duplicated", handleNodeDuplicated as EventListener);

      // Cleanup
      return () => {
        emailEditor?.off("update", updateItems);
        emailEditor?.off("selectionUpdate", updateItems);
        emailEditor?.off("create", updateItems);
        emailEditor?.off("transaction", updateItems);
        document.removeEventListener("node-duplicated", handleNodeDuplicated as EventListener);
        // Cancel any pending frame request on unmount
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
        }
      };
    }, [emailEditor, syncEditorItems]); // Added syncEditorItems dependency

    const togglePreviewMode = useCallback(
      (mode: "desktop" | "mobile" | undefined) => {
        const defaultMode = previewMode === undefined ? "desktop" : undefined;
        const newPreviewMode = mode || defaultMode;

        setPreviewMode(newPreviewMode);

        setSelectedNode(null);

        // Set editor to readonly when in preview mode
        if (newPreviewMode) {
          emailEditor?.setEditable(false);
        } else {
          emailEditor?.setEditable(true);
        }
      },
      [emailEditor, previewMode, setPreviewMode, setSelectedNode]
    );

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
          const doc = emailEditor?.state.doc;
          if (!doc) {
            return 0;
          }

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
          // If there's an error, return a safe fallback position (0 or doc end)
          console.warn("Error calculating document position:", error);
          return emailEditor?.state.doc.content.size ?? 0;
        }
      },
      [emailEditor]
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

        const elements = emailEditor?.view.dom.querySelectorAll("[data-node-view-wrapper]");
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
            emailEditor?.commands.removeDragPlaceholder();
            emailEditor?.commands.setDragPlaceholder({
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
        emailEditor?.commands,
        emailEditor?.view.dom,
        findContainer,
        getDocumentPosition,
        lastPlaceholderIndex,
      ]
    );

    const cleanupPlaceholder = useCallback(() => {
      emailEditor?.commands.removeDragPlaceholder();
      setItems((prev) => ({
        ...prev,
        Editor: prev.Editor.filter((id) => !id.toString().includes("_temp")),
      }));
    }, [emailEditor?.commands, setItems]);

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

        if (!emailEditor) {
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
          const insertPos = getDocumentPosition(lastPlaceholderIndex ?? 0);
          createOrDuplicateNode(
            emailEditor,
            activeDragType as string,
            insertPos,
            undefined,
            (node) => setSelectedNode(node as Node)
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

            const content = emailEditor.getJSON()?.content;

            if (Array.isArray(content)) {
              const newContent = [...content];
              const [movedItem] = newContent.splice(activeIndex, 1);
              newContent.splice(overIndex, 0, movedItem);

              emailEditor.view.dispatch(
                emailEditor.view.state.tr.replaceWith(
                  0,
                  emailEditor.view.state.doc.content.size,
                  emailEditor.state.schema.nodeFromJSON({ type: "doc", content: newContent })
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
        emailEditor,
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
      emailEditor?.commands.removeDragPlaceholder();
      onDragCancel();
    }, [cleanupPlaceholder, emailEditor?.commands, onDragCancel]);

    const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSubject(e.target.value);
    };

    const content = useMemo(() => {
      if (isTemplateLoading !== false) {
        return null;
      }

      const elementDefaultValue: ElementalNode = {
        type: "channel",
        channel: "email",
        elements: defaultEmailContent,
      };

      const element: ElementalNode | undefined = value?.elements.find(
        (el): el is ElementalNode & { type: "channel"; channel: "email" } =>
          el.type === "channel" && el.channel === "email"
      );

      const tipTapContent = convertElementalToTiptap(
        {
          version: "2022-01-01",
          elements: [element ?? elementDefaultValue],
        },
        { channel: "email" }
      );

      if (!element) {
        const newEmailContent = {
          elements: convertTiptapToElemental(tipTapContent),
          channel: "email",
        };

        const newContent = updateElemental(value, newEmailContent);

        setTemplateEditorContent(newContent);
      }

      return tipTapContent;
    }, [value, setTemplateEditorContent, isTemplateLoading]);

    return (
      <MainLayout
        theme={theme}
        isLoading={Boolean(isTemplateLoading)}
        Header={
          headerRenderer ? (
            headerRenderer({
              hidePublish,
              channels,
              routing,
            })
          ) : (
            <Channels hidePublish={hidePublish} channels={channels} routing={routing} />
          )
        }
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
            subject,
            handleSubjectChange,
            selectedNode,
            setSelectedNode,
            previewMode,
            emailEditor,
            ref: ref as React.RefObject<HTMLDivElement>,
            isBrandApply,
            brandSettings,
            items,
            content,
            strategy,
            syncEditorItems,
            brandEditorContent,
            templateData,
            togglePreviewMode,
          })}
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
      </MainLayout>
    );
  }
);

export const Email = memo(EmailComponent);
