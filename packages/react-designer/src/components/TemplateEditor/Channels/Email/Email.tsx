import { BrandEditorContentAtom, BrandEditorFormAtom } from "@/components/BrandEditor/store";
import { MainLayout } from "@/components/ui/MainLayout";
import { selectedNodeAtom, setNodeConfigAtom } from "@/components/ui/TextMenu/store";
import type { TiptapDoc } from "@/lib/utils";
import { convertElementalToTiptap, getTitleForChannel } from "@/lib/utils";
import type { ChannelType } from "@/store";
import type { ElementalNode } from "@/types/elemental.types";
import type { Node } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import type { HTMLAttributes } from "react";
import { forwardRef, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MessageRouting, TenantData } from "../../../Providers/store";
import { brandApplyAtom, isTemplateLoadingAtom, templateDataAtom } from "../../../Providers/store";
import { getTextMenuConfigForNode } from "../../../ui/TextMenu/config";
import {
  templateEditorAtom,
  isTemplateTransitioningAtom,
  subjectAtom,
  templateEditorContentAtom,
  visibleBlocksAtom,
  type VisibleBlockItem,
} from "../../store";
import type { TemplateEditorProps } from "../../TemplateEditor";
import { Channels } from "../Channels";
import { usePragmaticDnd } from "../../hooks/usePragmaticDnd";
import { useSyncEditorItems } from "../../hooks/useSyncEditorItems";

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
      | "hidePublish"
      | "brandEditor"
      | "channels"
      | "variables"
      | "disableVariablesAutocomplete"
      | "theme"
      | "routing"
      | "value"
      | "colorScheme"
    >,
    Omit<HTMLAttributes<HTMLDivElement>, "value" | "onChange"> {
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
  hidePreviewPanelExitButton?: boolean;
  render?: ({
    subject,
    handleSubjectChange,
    selectedNode,
    setSelectedNode,
    previewMode,
    templateEditor,
    ref,
    isBrandApply,
    brandSettings,
    items,
    content,
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
    templateEditor: Editor | null;
    ref: React.RefObject<HTMLDivElement> | null;
    isBrandApply: boolean;
    brandSettings: BrandSettingsData | null;
    items: Items;
    content: TiptapDoc | null;
    syncEditorItems: (editor: Editor) => void;
    brandEditorContent: string | null;
    templateData: TenantData | null;
    togglePreviewMode: (mode: "desktop" | "mobile" | undefined) => void;
    hidePreviewPanelExitButton?: boolean;
  }) => React.ReactNode;
}

type UniqueIdentifier = string | number;

interface Items {
  Editor: UniqueIdentifier[];
  Sidebar: VisibleBlockItem[];
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
  (
    {
      hidePublish,
      theme,
      channels,
      routing,
      render,
      headerRenderer,
      value,
      colorScheme,
      hidePreviewPanelExitButton,
      ...rest
    },
    ref
  ) => {
    const templateEditor = useAtomValue(templateEditorAtom);
    const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom);
    const [subject, setSubject] = useAtom(subjectAtom);
    const timeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
    const [previewMode, setPreviewMode] = useState<"desktop" | "mobile" | undefined>(
      hidePreviewPanelExitButton ? "desktop" : undefined
    );
    const templateData = useAtomValue(templateDataAtom);
    const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
    const brandApply = useAtomValue(brandApplyAtom);
    const BrandEditorForm = useAtomValue(BrandEditorFormAtom);
    const currentTabIndexRef = useRef<number>(-1);
    const setNodeConfig = useSetAtom(setNodeConfigAtom);
    const mountedRef = useRef(false);
    // Add a ref to track if content has been loaded from server
    const contentLoadedRef = useRef(false);
    const [templateEditorContent] = useAtom(templateEditorContentAtom);
    const brandEditorContent = useAtomValue(BrandEditorContentAtom);
    const isTemplateTransitioning = useAtomValue(isTemplateTransitioningAtom);
    const visibleBlocks = useAtomValue(visibleBlocksAtom);

    const [items, setItems] = useState<{ Sidebar: VisibleBlockItem[]; Editor: UniqueIdentifier[] }>(
      {
        Editor: [] as UniqueIdentifier[],
        Sidebar: visibleBlocks,
      }
    );

    // Sync sidebar items with visibleBlocks atom when it changes
    useEffect(() => {
      setItems((prev) => ({
        ...prev,
        Sidebar: visibleBlocks,
      }));
    }, [visibleBlocks]);

    // Store the request ID for requestAnimationFrame
    const rafId = useRef<number | null>(null);

    usePragmaticDnd({
      items,
      setItems,
      editor: templateEditor,
    });
    const { syncEditorItems } = useSyncEditorItems({ setItems, rafId, editor: templateEditor });

    // Reset contentLoadedRef when template is transitioning (switching templates)
    useEffect(() => {
      if (isTemplateTransitioning) {
        contentLoadedRef.current = false;
      }
    }, [isTemplateTransitioning]);

    // Track when loading completes to handle the race condition
    // Give content a moment to propagate after loading completes
    const [showContent, setShowContent] = useState(false);
    useEffect(() => {
      // Allow content when loading is complete (false) or not managed (null for standalone usage)
      if (isTemplateLoading === false || isTemplateLoading === null) {
        // Small delay to allow value to propagate before showing default content
        const timer = setTimeout(() => {
          setShowContent(true);
        }, 100);
        return () => clearTimeout(timer);
      } else {
        setShowContent(false);
      }
    }, [isTemplateLoading, showContent]);

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

    useEffect(() => {
      const handleKeyPress = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setSelectedNode(null);
          templateEditor?.commands.blur();
          currentTabIndexRef.current = -1;
        }

        // Handle Tab navigation between blocks
        if (event.key === "Tab" && templateEditor) {
          // Exception: If cursor is inside a list, let the List extension handle Tab for nesting
          // Check both isActive and the actual selection state
          const { $from } = templateEditor.state.selection;
          let inList = templateEditor.isActive("list") || templateEditor.isActive("listItem");
          
          // Also check by traversing the node hierarchy at cursor position
          if (!inList) {
            for (let d = $from.depth; d >= 0; d--) {
              const nodeName = $from.node(d).type.name;
              if (nodeName === "list" || nodeName === "listItem") {
                inList = true;
                break;
              }
            }
          }
          
          if (inList) {
            // Don't prevent default - let the List extension's Tab handler run
            return;
          }

          event.preventDefault();

          let currentIndex = -1;
          if (selectedNode) {
            // Use your logic to find the index by ID
            templateEditor.state.doc.content.forEach((node, _offset, index) => {
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

          const doc = templateEditor.state.doc;

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
            templateEditor.commands.blur();
          }
        }
      };

      document.addEventListener("keydown", handleKeyPress);
      return () => {
        document.removeEventListener("keydown", handleKeyPress);
      };
    }, [templateEditor, selectedNode, setSelectedNode]);

    useEffect(() => {
      if (isTemplateLoading !== false || isTemplateTransitioning) {
        return;
      }
      const content = templateEditorContent ?? "";
      if (content) {
        const newSubject = getTitleForChannel(content, "email");
        setSubject(newSubject || "");
      }

      setTimeout(() => {
        if (!templateEditor || templateEditor.isDestroyed) return;

        // Set initial selection if document has only one node
        if (templateEditor.state.doc.childCount === 1) {
          const firstNode = templateEditor.state.doc.child(0);
          setSelectedNode(firstNode);
        }
      }, 0);
    }, [
      templateData,
      isTemplateLoading,
      isTemplateTransitioning,
      templateEditor,
      setSubject,
      setSelectedNode,
      templateEditorContent,
    ]);

    // Watch for tenant data loading state changes to re-sync items when content is loaded
    useEffect(() => {
      if (isTemplateLoading === false && templateData && !contentLoadedRef.current) {
        contentLoadedRef.current = true;
        // Use a slight delay to ensure DOM is fully updated after content loading
        setTimeout(() => {
          if (templateEditor && !templateEditor.isDestroyed) {
            syncEditorItems(templateEditor); // Call our sync function
          }
        }, 300); // Delay to ensure rendering completes
      }
    }, [isTemplateLoading, templateData, templateEditor, syncEditorItems]); // Added syncEditorItems dependency

    useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
      };
    }, []);

    const togglePreviewMode = useCallback(
      (mode: "desktop" | "mobile" | undefined) => {
        const defaultMode = previewMode === undefined ? "desktop" : undefined;
        const newPreviewMode = mode || defaultMode;

        setPreviewMode(newPreviewMode);

        setSelectedNode(null);

        // Set editor to readonly when in preview mode
        if (newPreviewMode) {
          templateEditor?.setEditable(false);
        } else {
          templateEditor?.setEditable(true);
        }
      },
      [templateEditor, previewMode, setPreviewMode, setSelectedNode]
    );

    const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSubject(e.target.value);
    };

    const content = useMemo(() => {
      if (isTemplateLoading !== false || !showContent) {
        return null;
      }

      const hasValidValue = value && value.elements && value.elements.length > 0;
      if (hasValidValue) {
        contentLoadedRef.current = true;
      }

      let element: ElementalNode | undefined = undefined;

      if (hasValidValue) {
        // We have content from the API - try to find email channel
        element = value.elements.find(
          (el): el is ElementalNode & { type: "channel"; channel: "email" } =>
            el.type === "channel" && el.channel === "email"
        );
      }

      if (!element) {
        element = {
          type: "channel",
          channel: "email",
          elements: defaultEmailContent,
        };
      }

      const tipTapContent = convertElementalToTiptap(
        {
          version: "2022-01-01",
          elements: [element],
        },
        { channel: "email" }
      );

      return tipTapContent;
    }, [value, isTemplateLoading, showContent]);

    // Prevent rendering during problematic transitions to avoid DOM conflicts
    // Only return null if we're transitioning AND content is null (dangerous state)
    if (isTemplateTransitioning && (templateEditorContent === null || content === null)) {
      return null;
    }

    return (
      <MainLayout
        theme={theme}
        colorScheme={colorScheme}
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
        {...rest}
      >
        <>
          {render?.({
            subject,
            handleSubjectChange,
            selectedNode,
            setSelectedNode,
            previewMode,
            templateEditor,
            ref: ref as React.RefObject<HTMLDivElement>,
            isBrandApply,
            brandSettings,
            items,
            content,
            syncEditorItems,
            brandEditorContent,
            templateData,
            togglePreviewMode,
            hidePreviewPanelExitButton,
          })}
        </>
      </MainLayout>
    );
  }
);

export const Email = memo(EmailComponent);
