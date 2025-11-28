import { ExtensionKit } from "@/components/extensions/extension-kit";
import type { MessageRouting } from "@/components/Providers/store";
import { isTemplateLoadingAtom } from "@/components/Providers/store";
import {
  templateEditorAtom,
  templateEditorContentAtom,
  isTemplateTransitioningAtom,
} from "@/components/TemplateEditor/store";
import type { TextMenuConfig } from "@/components/ui/TextMenu/config";
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import type { TiptapDoc } from "@/lib/utils";
import {
  convertElementalToTiptap,
  convertTiptapToElemental,
  updateElemental,
  createTitleUpdate,
} from "@/lib/utils";
import { setTestEditor } from "@/lib/testHelpers";
import type { ChannelType } from "@/store";
import type { ElementalNode } from "@/types/elemental.types";
import type { AnyExtension, Editor } from "@tiptap/react";
import { useCurrentEditor } from "@tiptap/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import type { HTMLAttributes } from "react";
import { forwardRef, memo, useCallback, useEffect, useMemo, useRef } from "react";
import { MainLayout } from "../../../ui/MainLayout";
import type { TemplateEditorProps } from "../../TemplateEditor";
import { Channels } from "../Channels";

export const defaultInboxContent: ElementalNode[] = [
  { type: "text", content: "\n", text_style: "h2" },
  { type: "text", content: "\n" },
  {
    type: "action",
    content: "Register",
    align: "left",
    href: "",
  },
];

// Helper function to get or create default inbox element
// Inbox structure: 1 Header (h2), 1 Body paragraph, optional action buttons
const getOrCreateInboxElement = (
  templateEditorContent: { elements: ElementalNode[] } | null | undefined
): ElementalNode => {
  let element: ElementalNode | undefined = templateEditorContent?.elements.find(
    (el: ElementalNode): el is ElementalNode & { type: "channel"; channel: "inbox" } =>
      el.type === "channel" && el.channel === "inbox"
  );

  if (!element) {
    element = {
      type: "channel",
      channel: "inbox",
      elements: defaultInboxContent,
    };
  } else if (element.type === "channel" && "elements" in element) {
    // Convert stored format to editor format
    // Inbox always has: 1 Header (h2), 1 Body paragraph, optional action buttons
    const elements = element.elements || [];
    const metaElement = elements.find((el: ElementalNode) => el.type === "meta");
    const otherElements = elements.filter((el: ElementalNode) => el.type !== "meta");

    // Separate text elements from action elements
    const textElements = otherElements.filter((el: ElementalNode) => el.type === "text");
    const actionElements = otherElements.filter((el: ElementalNode) => el.type === "action");

    // Build the fixed structure: 1 header + 1 body + actions
    const titleContent = metaElement && "title" in metaElement ? metaElement.title || "" : "";

    // Header element (h2)
    const headerElement = {
      type: "text" as const,
      content: titleContent + "\n",
      text_style: "h2" as const,
    };

    // Body element - use first text element or create empty one
    // Only keep ONE body paragraph
    const firstBodyText = textElements[0];
    const bodyElement = {
      type: "text" as const,
      content:
        firstBodyText && "content" in firstBodyText ? (firstBodyText.content as string) : "\n",
    };

    const updatedElement: ElementalNode = {
      ...element,
      elements: [headerElement, bodyElement, ...actionElements],
    };
    element = updatedElement;
  }

  return element!;
};

export const InboxConfig: TextMenuConfig = {
  contentType: { state: "hidden" },
  bold: { state: "hidden" },
  italic: { state: "hidden" },
  underline: { state: "hidden" },
  strike: { state: "hidden" },
  alignLeft: { state: "hidden" },
  alignCenter: { state: "hidden" },
  alignRight: { state: "hidden" },
  alignJustify: { state: "hidden" },
  quote: { state: "hidden" },
  link: { state: "hidden" },
  variable: { state: "enabled" },
};

interface InboxEditorContentProps {
  value?: TiptapDoc;
}

export const InboxEditorContent = ({ value }: InboxEditorContentProps) => {
  const { editor } = useCurrentEditor();
  const setTemplateEditor = useSetAtom(templateEditorAtom);
  const templateEditorContent = useAtomValue(templateEditorContentAtom);
  const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
  const isValueUpdated = useRef(false);

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
      setTestEditor("inbox", editor);
      setTimeout(() => {
        editor.commands.blur();
      }, 1);
    }
  }, [editor, setTemplateEditor]);

  // Update editor content when templateEditorContent changes
  useEffect(() => {
    if (!editor || !templateEditorContent) return;

    // Don't update content if user is actively typing
    if (editor.isFocused) return;

    const element = getOrCreateInboxElement(templateEditorContent);

    const newContent = convertElementalToTiptap(
      {
        version: "2022-01-01",
        elements: [element],
      },
      { channel: "inbox" }
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

export interface InboxRenderProps {
  content: TiptapDoc;
  extensions: AnyExtension[];
  editable: boolean;
  autofocus: boolean;
  onUpdate: ({ editor }: { editor: Editor }) => void;
}

export interface InboxProps
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
  render?: (props: InboxRenderProps) => React.ReactNode;
}

const InboxComponent = forwardRef<HTMLDivElement, InboxProps>(
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
    const disableVariableAutocomplete = true;
    const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
    const isInitialLoadRef = useRef(true);
    const isMountedRef = useRef(false);
    const setSelectedNode = useSetAtom(selectedNodeAtom);
    const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
    const isTemplateTransitioning = useAtomValue(isTemplateTransitioningAtom);
    // Add a contentKey state to force EditorProvider remount when content changes

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

    const extensions = useMemo(
      () =>
        [
          ...ExtensionKit({
            variables: extendedVariables,
            setSelectedNode,
            disableVariableAutocomplete,
          }),
        ].filter((e): e is AnyExtension => e !== undefined),
      [extendedVariables, setSelectedNode, disableVariableAutocomplete]
    );

    const onUpdateHandler = useCallback(
      ({ editor }: { editor: Editor }) => {
        if (!editor || isTemplateTransitioning) {
          return;
        }

        // Handle new templates by creating initial structure
        if (!templateEditorContent) {
          const elemental = convertTiptapToElemental(editor.getJSON() as TiptapDoc);

          const titleUpdate = createTitleUpdate(
            null, // No existing content for new template
            "inbox",
            "", // Empty fallback - let function extract from first element
            elemental
          );

          const newContent = {
            version: "2022-01-01" as const,
            elements: [
              {
                type: "channel" as const,
                channel: "inbox" as const,
                elements: titleUpdate.elements,
                ...(titleUpdate.raw && { raw: titleUpdate.raw }),
              },
            ],
          };
          setTemplateEditorContent(newContent);
          return;
        }

        // Prevent updates during rapid typing by debouncing
        const currentJson = editor.getJSON() as TiptapDoc;
        const elemental = convertTiptapToElemental(currentJson);

        // For Inbox, let createTitleUpdate extract title from first element
        // Don't pass the old title - let it extract from the new editor content
        const titleUpdate = createTitleUpdate(
          templateEditorContent,
          "inbox",
          "", // Empty fallback - let function extract from first element
          elemental
        );

        const newContent = updateElemental(templateEditorContent, {
          elements: titleUpdate.elements,
          channel: "inbox",
          ...(titleUpdate.raw && { raw: titleUpdate.raw }),
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
      const element = getOrCreateInboxElement(value);

      // At this point, element is guaranteed to be ElementalNode
      const tipTapContent = convertElementalToTiptap(
        {
          version: "2022-01-01",
          elements: [element], // element is now definitely ElementalNode
        },
        { channel: "inbox" }
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
        {...rest}
        ref={ref}
      >
        {render?.({
          content,
          extensions,
          editable: !readOnly,
          autofocus: !readOnly,
          onUpdate: onUpdateHandler,
        })}
        {/* <div className="courier-flex courier-flex-1 courier-flex-row courier-overflow-hidden">
          <div className="courier-flex courier-flex-col courier-flex-1 courier-py-8 courier-items-center">
            <div
              className="courier-py-2 courier-border courier-w-[360px] courier-h-[500px] courier-rounded-3xl courier-bg-background"
              style={{
                maskImage: "linear-gradient(180deg, #000 80%, transparent)",
                WebkitMaskImage: "linear-gradient(180deg, #000 80%, transparent)",
              }}
            >
              <div className="courier-my-3 courier-mx-4 courier-flex courier-items-center courier-gap-2 courier-justify-between">
                <div className="courier-flex courier-items-center courier-gap-3">
                  <InboxIcon />
                  <span className="courier-text-xl courier-font-medium">Inbox</span>
                </div>

                <div className="courier-flex courier-items-center courier-gap-4">
                  <HamburgerMenuIcon />
                  <ExpandIcon />
                  <MoreMenuIcon />
                </div>
              </div>
              <EditorProvider
                content={content}
                extensions={extensions}
                editable={!readOnly}
                autofocus={!readOnly}
                onUpdate={onUpdateHandler}
                editorContainerProps={{
                  className: cn(
                    "courier-inbox-editor"
                    // readOnly && "courier-brand-editor-readonly"
                  ),
                }}
                immediatelyRender={false}
              >
                <InboxEditorContent />
                <BubbleTextMenu config={InboxConfig} />
              </EditorProvider>
            </div>
          </div>
          <div className="courier-editor-sidebar courier-opacity-100 courier-translate-x-0 courier-w-64 courier-flex-shrink-0">
            <div className="courier-p-4 courier-h-full">
              <SideBar />
            </div>
          </div>
        </div> */}
      </MainLayout>
    );
  }
);

export const Inbox = memo(InboxComponent);
