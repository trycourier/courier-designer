import type { MessageRouting } from "@/components/Providers/store";
import { isTemplateLoadingAtom } from "@/components/Providers/store";
import {
  templateEditorAtom,
  isTemplateTransitioningAtom,
  templateEditorContentAtom,
} from "@/components/TemplateEditor/store";
import { ExtensionKit } from "@/components/extensions/extension-kit";
import { ButtonBlock } from "@/components/ui/Blocks/ButtonBlock";
import { DividerBlock } from "@/components/ui/Blocks/DividerBlock";
import { TextBlock } from "@/components/ui/Blocks/TextBlock";
import type { TextMenuConfig } from "@/components/ui/TextMenu/config";
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import type { TiptapDoc } from "@/lib/utils";
import {
  cn,
  convertElementalToTiptap,
  convertTiptapToElemental,
  updateElemental,
} from "@/lib/utils";
import { setTestEditor } from "@/lib/testHelpers";
import type { ChannelType } from "@/store";
import type { ElementalNode } from "@/types/elemental.types";
import { DndContext, DragOverlay, type UniqueIdentifier } from "@dnd-kit/core";
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
import { useEditorDnd } from "../../hooks/useEditorDnd";
import { useSyncEditorItems } from "../../hooks/useSyncEditorItems";
import { Channels } from "../Channels";

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
  items: { Sidebar: string[]; Editor: UniqueIdentifier[] };
  selectedNode: Node | null;
  slackEditor: Editor | null;
}

export interface SlackProps
  extends Pick<
      TemplateEditorProps,
      "hidePublish" | "theme" | "variables" | "channels" | "routing" | "value"
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
  link: { state: "hidden" },
  quote: { state: "enabled" },
  variable: { state: "enabled" },
};

const SlackComponent = forwardRef<HTMLDivElement, SlackProps>(
  (
    {
      theme,
      hidePublish,
      variables,
      readOnly,
      channels,
      routing,
      headerRenderer,
      render,
      value,
      ...rest
    },
    ref
  ) => {
    const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
    const isTemplateTransitioning = useAtomValue(isTemplateTransitioningAtom);
    const templateEditor = useAtomValue(templateEditorAtom);

    const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom);
    const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);

    const isInitialLoadRef = useRef(true);
    const isMountedRef = useRef(false);
    const rafId = useRef<number | null>(null);

    const [items, setItems] = useState<{ Sidebar: string[]; Editor: UniqueIdentifier[] }>({
      Sidebar: ["text", "divider", "button"],
      Editor: [],
    });

    const { dndProps, activeDragType, activeId } = useEditorDnd({
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

    const extensions = useMemo(
      () =>
        [...ExtensionKit({ variables, setSelectedNode })].filter(
          (e): e is AnyExtension => e !== undefined
        ),
      [variables, setSelectedNode]
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
        {...rest}
      >
        <DndContext {...dndProps}>
          {render?.({
            content,
            extensions,
            editable: !readOnly,
            autofocus: !readOnly,
            onUpdate: onUpdateHandler,
            items,
            selectedNode,
            slackEditor: templateEditor,
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
