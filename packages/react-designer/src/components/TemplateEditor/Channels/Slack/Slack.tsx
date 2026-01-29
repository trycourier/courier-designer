import type { MessageRouting } from "@/components/Providers/store";
import { isTemplateLoadingAtom } from "@/components/Providers/store";
import {
  templateEditorAtom,
  isTemplateTransitioningAtom,
  templateEditorContentAtom,
  isDraggingAtom,
  pendingAutoSaveAtom,
  visibleBlocksAtom,
  isPresetReference,
  type VisibleBlockItem,
  type BlockElementType,
} from "@/components/TemplateEditor/store";
import { ExtensionKit } from "@/components/extensions/extension-kit";
import type { TextMenuConfig } from "@/components/ui/TextMenu/config";
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import type { TiptapDoc } from "@/lib/utils";
import { convertElementalToTiptap, convertTiptapToElemental, updateElemental } from "@/lib/utils";
import { setTestEditor } from "@/lib/testHelpers";
import type { ChannelType } from "@/store";
import type { ElementalNode } from "@/types/elemental.types";
import type { Node } from "@tiptap/pm/model";
import type { AnyExtension, Editor } from "@tiptap/react";
import { useCurrentEditor } from "@tiptap/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import React, {
  forwardRef,
  type HTMLAttributes,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MainLayout } from "../../../ui/MainLayout";
import type { TemplateEditorProps } from "../../TemplateEditor";
import { usePragmaticDnd } from "../../hooks/usePragmaticDnd";
import { useSyncEditorItems } from "../../hooks/useSyncEditorItems";
import { Channels } from "../Channels";

type UniqueIdentifier = string | number;

export const defaultSlackContent: ElementalNode[] = [{ type: "text", content: "\n" }];

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
  const setTemplateEditor = useSetAtom(templateEditorAtom);
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
      setTemplateEditor(editor);
      setTestEditor("slack", editor);
      setTimeout(() => {
        editor.commands.blur();
      }, 1);
    }
  }, [editor, setTemplateEditor]);

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
  items: { Sidebar: VisibleBlockItem[]; Editor: UniqueIdentifier[] };
  selectedNode: Node | null;
  slackEditor: Editor | null;
  textMenuConfig: TextMenuConfig;
}

export interface SlackProps
  extends Pick<
      TemplateEditorProps,
      | "hidePublish"
      | "theme"
      | "variables"
      | "disableVariablesAutocomplete"
      | "channels"
      | "routing"
      | "value"
      | "colorScheme"
    >,
    Omit<HTMLAttributes<HTMLDivElement>, "value" | "onChange"> {
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

// Slack doesn't support alignment controls
const hiddenAlignmentConfigs = {
  alignLeft: { state: "hidden" } as const,
  alignCenter: { state: "hidden" } as const,
  alignRight: { state: "hidden" } as const,
  alignJustify: { state: "hidden" } as const,
};

// Conditional rules for Slack
const slackConditionalRules = [
  {
    id: "slack-blockquote-bold-italic-mutex-1",
    trigger: { type: "node" as const, name: "blockquote", active: true },
    conditions: { activeItems: ["italic"] as Array<keyof TextMenuConfig> },
    action: { type: "toggle_off" as const, targets: ["italic"] as Array<keyof TextMenuConfig> },
  },
  {
    id: "slack-blockquote-bold-italic-mutex-2",
    trigger: { type: "node" as const, name: "blockquote", active: true },
    conditions: { activeItems: ["bold"] as Array<keyof TextMenuConfig> },
    action: { type: "toggle_off" as const, targets: ["bold"] as Array<keyof TextMenuConfig> },
  },
];

// Common Slack configs to spread into all menu configurations
const slackCommonConfigs = {
  conditionalRules: slackConditionalRules,
  ...hiddenAlignmentConfigs,
};

// Default config when no node is selected
const slackDefaultConfig: TextMenuConfig = {
  contentType: { state: "hidden" },
  bold: { state: "hidden" },
  italic: { state: "hidden" },
  underline: { state: "hidden" },
  strike: { state: "hidden" },
  quote: { state: "hidden" },
  orderedList: { state: "hidden" },
  unorderedList: { state: "hidden" },
  link: { state: "hidden" },
  variable: { state: "hidden" },
  ...slackCommonConfigs,
};

/**
 * Get text menu configuration for a Slack node based on selection state
 * This function applies Slack-specific constraints while respecting text selection
 */
export const getTextMenuConfigForSlackNode = (
  nodeName: string,
  hasTextSelection: boolean = false
): TextMenuConfig => {
  const isTextNode = ["paragraph", "heading", "blockquote"].includes(nodeName);

  if (isTextNode && hasTextSelection) {
    // When there's a text selection in a text node
    return {
      contentType: { state: "enabled" },
      bold: { state: "enabled" },
      italic: { state: "enabled" },
      underline: { state: "enabled" },
      strike: { state: "enabled" },
      quote: { state: "hidden" },
      orderedList: { state: "hidden" },
      unorderedList: { state: "hidden" },
      link: { state: "enabled" },
      variable: { state: "enabled" },
      ...slackCommonConfigs,
    };
  }

  if (isTextNode && !hasTextSelection) {
    // When a text node is selected but no text selection
    return {
      contentType: { state: "enabled" },
      bold: { state: "hidden" },
      italic: { state: "hidden" },
      underline: { state: "hidden" },
      strike: { state: "hidden" },
      quote: { state: "enabled" },
      orderedList: { state: "enabled" },
      unorderedList: { state: "enabled" },
      link: { state: "hidden" },
      variable: { state: "enabled" },
      ...slackCommonConfigs,
    };
  }

  switch (nodeName) {
    case "list":
      return {
        contentType: { state: "hidden" },
        bold: { state: hasTextSelection ? "enabled" : "hidden" },
        italic: { state: hasTextSelection ? "enabled" : "hidden" },
        underline: { state: hasTextSelection ? "enabled" : "hidden" },
        strike: { state: hasTextSelection ? "enabled" : "hidden" },
        quote: { state: "hidden" },
        orderedList: { state: "enabled" },
        unorderedList: { state: "enabled" },
        link: { state: hasTextSelection ? "enabled" : "hidden" },
        variable: { state: "enabled" },
        ...slackCommonConfigs,
      };
    case "button":
      return {
        bold: { state: "enabled" },
        italic: { state: "enabled" },
        underline: { state: "enabled" },
        strike: { state: "enabled" },
        ...slackCommonConfigs,
      };
    default:
      return {
        contentType: { state: "hidden" },
        bold: { state: "hidden" },
        italic: { state: "hidden" },
        underline: { state: "hidden" },
        strike: { state: "hidden" },
        quote: { state: "hidden" },
        orderedList: { state: "hidden" },
        unorderedList: { state: "hidden" },
        link: { state: "hidden" },
        variable: { state: "hidden" },
        ...slackCommonConfigs,
      };
  }
};

const SlackComponent = forwardRef<HTMLDivElement, SlackProps>(
  (
    {
      theme,
      hidePublish,
      readOnly,
      channels,
      routing,
      headerRenderer,
      render,
      value,
      colorScheme,
      variables,
      disableVariablesAutocomplete = false,
      ...rest
    },
    ref
  ) => {
    const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
    const isTemplateTransitioning = useAtomValue(isTemplateTransitioningAtom);
    const templateEditor = useAtomValue(templateEditorAtom);
    const isDragging = useAtomValue(isDraggingAtom);

    const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom);
    const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
    const setPendingAutoSave = useSetAtom(pendingAutoSaveAtom);

    const isInitialLoadRef = useRef(true);
    const isMountedRef = useRef(false);
    const isDraggingRef = useRef(isDragging);
    const rafId = useRef<number | null>(null);
    const visibleBlocks = useAtomValue(visibleBlocksAtom);

    // Track text selection state for dynamic config
    const [hasTextSelection, setHasTextSelection] = useState(false);

    // Update text selection state when editor selection changes
    useEffect(() => {
      if (!templateEditor) return;

      const updateSelection = () => {
        try {
          const selection = templateEditor.state?.selection;
          if (selection) {
            const { from, to } = selection;
            setHasTextSelection(from !== to);
          }
        } catch (error) {
          // Ignore errors in test environments
        }
      };

      templateEditor.on("selectionUpdate", updateSelection);
      templateEditor.on("transaction", updateSelection);

      // Initial update
      updateSelection();

      return () => {
        templateEditor.off("selectionUpdate", updateSelection);
        templateEditor.off("transaction", updateSelection);
      };
    }, [templateEditor]);

    // Generate dynamic text menu config based on selected node and text selection
    const textMenuConfig = useMemo(() => {
      if (!selectedNode) {
        return slackDefaultConfig;
      }
      return getTextMenuConfigForSlackNode(selectedNode.type.name, hasTextSelection);
    }, [selectedNode, hasTextSelection]);

    // Filter visible blocks to only include supported types for Slack
    const filteredVisibleBlocks = useMemo(() => {
      // Slack supports a subset of block types
      const supportedBlocks: BlockElementType[] = ["text", "divider", "button", "list"];
      return visibleBlocks.filter((block) => {
        const blockType = isPresetReference(block) ? block.type : block;
        return supportedBlocks.includes(blockType as BlockElementType);
      });
    }, [visibleBlocks]);

    const [items, setItems] = useState<{ Sidebar: VisibleBlockItem[]; Editor: UniqueIdentifier[] }>(
      {
        Sidebar: filteredVisibleBlocks,
        Editor: [],
      }
    );

    // Sync sidebar items with visibleBlocks atom when it changes
    useEffect(() => {
      setItems((prev) => ({
        ...prev,
        Sidebar: filteredVisibleBlocks,
      }));
    }, [filteredVisibleBlocks]);

    usePragmaticDnd({
      items,
      setItems,
    });
    const { syncEditorItems } = useSyncEditorItems({ setItems, rafId });

    // Track component mount status
    useEffect(() => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
      };
    }, []);

    // Update isDraggingRef when isDragging changes
    useEffect(() => {
      isDraggingRef.current = isDragging;
    }, [isDragging]);

    // Watch for template loading state changes to re-sync items when content is loaded
    useEffect(() => {
      if (isTemplateLoading === false && templateEditorContent) {
        // Use a slight delay to ensure DOM is fully updated after content loading
        setTimeout(() => {
          if (templateEditor && !templateEditor.isDestroyed) {
            syncEditorItems(templateEditor);
          }
        }, 300);
      }
    }, [isTemplateLoading, templateEditorContent, templateEditor, syncEditorItems]);

    const shouldHandleClick = useCallback(() => {
      return !isDraggingRef.current;
    }, []);

    const extensions = useMemo(
      () =>
        [
          ...ExtensionKit({
            setSelectedNode,
            shouldHandleClick,
            variables,
            disableVariablesAutocomplete,
          }),
        ].filter((e): e is AnyExtension => e !== undefined),
      [setSelectedNode, shouldHandleClick, variables, disableVariablesAutocomplete]
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
          setPendingAutoSave(newContent);
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
          setTemplateEditorContent(newContent);
          setPendingAutoSave(newContent);
        }
      },
      [templateEditorContent, setTemplateEditorContent, setPendingAutoSave, isTemplateTransitioning]
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

    return (
      <MainLayout
        theme={theme}
        colorScheme={colorScheme}
        isLoading={Boolean(isTemplateLoading && isInitialLoadRef.current)}
        Header={
          headerRenderer ? (
            headerRenderer({ hidePublish, channels, routing })
          ) : (
            <Channels hidePublish={hidePublish} channels={channels} routing={routing} />
          )
        }
        ref={ref}
        {...rest}
      >
        <>
          {render?.({
            content,
            extensions,
            editable: !readOnly,
            autofocus: !readOnly,
            onUpdate: onUpdateHandler,
            items,
            selectedNode,
            slackEditor: templateEditor,
            textMenuConfig,
          })}
        </>
      </MainLayout>
    );
  }
);

export const Slack = memo(SlackComponent);
