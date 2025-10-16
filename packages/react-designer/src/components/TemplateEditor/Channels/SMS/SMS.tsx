import { ExtensionKit } from "@/components/extensions/extension-kit";
import { isTemplateLoadingAtom } from "@/components/Providers/store";
import {
  templateEditorAtom,
  templateEditorContentAtom,
  isTemplateTransitioningAtom,
} from "@/components/TemplateEditor/store";
// import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import type { TextMenuConfig } from "@/components/ui/TextMenu/config";
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import type { TiptapDoc } from "@/lib/utils";
import { convertElementalToTiptap, convertTiptapToElemental, updateElemental } from "@/lib/utils";
import { setTestEditor } from "@/lib/testHelpers";
import type { ElementalNode } from "@/types/elemental.types";
import type { AnyExtension, Editor } from "@tiptap/react";
// import { EditorProvider, useCurrentEditor } from "@tiptap/react";
import { useCurrentEditor } from "@tiptap/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import type { HTMLAttributes } from "react";
import { forwardRef, memo, useCallback, useEffect, useMemo, useRef } from "react";
import { SegmentedMessage } from "sms-segments-calculator";
import type { MessageRouting } from "../../../Providers/store";
import { MainLayout } from "../../../ui/MainLayout";
// import { IPhoneFrame } from "../../IPhoneFrame";
import type { ChannelType } from "@/store";
import type { TemplateEditorProps } from "../../TemplateEditor";
import { Channels } from "../Channels";

export const defaultSMSContent = {
  raw: {
    text: "",
  },
};

// Helper function to get or create default SMS element
const getOrCreateSMSElement = (
  templateEditorContent: { elements: ElementalNode[] } | null | undefined
): ElementalNode & { type: "channel"; channel: "sms" } => {
  let element: ElementalNode | undefined = templateEditorContent?.elements.find(
    (el: ElementalNode): el is ElementalNode & { type: "channel"; channel: "sms" } =>
      el.type === "channel" && el.channel === "sms"
  );

  if (!element) {
    element = {
      type: "channel",
      channel: "sms",
      raw: {
        text: "",
      },
    };
  }

  return element! as ElementalNode & { type: "channel"; channel: "sms" };
};

export const SMSEditorContent = ({ value }: { value?: TiptapDoc | null }) => {
  const { editor } = useCurrentEditor();
  const setTemplateEditor = useSetAtom(templateEditorAtom);
  const templateEditorContent = useAtomValue(templateEditorContentAtom);
  const message = editor?.getText() ?? "";
  const segmentedMessage = useMemo(() => new SegmentedMessage(message), [message]);
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
      setTestEditor("sms", editor);
      setTimeout(() => {
        editor.commands.blur();
      }, 1);
    }
  }, [editor, setTemplateEditor]);

  // Update editor content when templateEditorContent changes (fallback restoration mechanism)
  useEffect(() => {
    if (!editor || !templateEditorContent) return;

    // Don't update content if user is actively typing
    if (editor.isFocused) return;

    const element = getOrCreateSMSElement(templateEditorContent);

    // Extract text from raw properties
    const text = (element.type === "channel" && "raw" in element && element.raw?.text) || "";

    // Convert SMS raw data to elements for Tiptap editor
    const smsElements: ElementalNode[] = text
      ? [{ type: "text" as const, content: text }]
      : [{ type: "text" as const, content: "\n" }]; // Default empty content

    const elementalContent = {
      type: "channel" as const,
      channel: "sms" as const,
      elements: smsElements,
    };

    const newContent = convertElementalToTiptap({
      version: "2022-01-01",
      elements: [elementalContent],
    });

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

  return (
    <span className="courier-self-end courier-pr-2 courier-text-xs courier-color-gray-500">
      {Math.ceil((segmentedMessage?.messageSize || 0) / 8)}
    </span>
  );
};

export interface SMSRenderProps {
  content: TiptapDoc | null;
  extensions: AnyExtension[];
  editable: boolean;
  autofocus: boolean;
  onUpdate: ({ editor }: { editor: Editor }) => void;
}

export interface SMSProps
  extends Pick<
      TemplateEditorProps,
      "hidePublish" | "theme" | "variables" | "channels" | "routing" | "value" | "dataMode"
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
  render?: (props: SMSRenderProps) => React.ReactNode;
}

export const SMSConfig: TextMenuConfig = {
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

const SMSComponent = forwardRef<HTMLDivElement, SMSProps>(
  (
    {
      theme,
      hidePublish,
      variables,
      readOnly,
      channels,
      routing,
      render,
      headerRenderer,
      value,
      ...rest
    },
    ref
  ) => {
    const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
    const isInitialLoadRef = useRef(true);
    const isMountedRef = useRef(false);
    const setSelectedNode = useSetAtom(selectedNodeAtom);
    const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
    const isTemplateTransitioning = useAtomValue(isTemplateTransitioningAtom);

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
        [...ExtensionKit({ variables: extendedVariables, setSelectedNode })].filter(
          (e): e is AnyExtension => e !== undefined
        ),
      [extendedVariables, setSelectedNode]
    );

    const onUpdateHandler = useCallback(
      ({ editor }: { editor: Editor }) => {
        if (isTemplateTransitioning) {
          return;
        }

        // Handle new templates by creating initial structure
        if (!templateEditorContent) {
          const elemental = convertTiptapToElemental(editor.getJSON() as TiptapDoc);
          const textElements = elemental.filter((el) => el.type === "text");
          const getTextContent = (element: ElementalNode): string => {
            if ("content" in element && element.content) {
              return element.content.trim();
            }
            return "";
          };
          const text = textElements.map(getTextContent).join(" ").trim();

          const newContent = {
            version: "2022-01-01" as const,
            elements: [
              {
                type: "channel" as const,
                channel: "sms" as const,
                raw: {
                  text,
                },
              },
            ],
          };
          setTemplateEditorContent(newContent);
          return;
        }

        const elemental = convertTiptapToElemental(editor.getJSON() as TiptapDoc);

        // Extract text content from editor for SMS raw.text
        const textElements = elemental.filter((el) => el.type === "text");
        const getTextContent = (element: ElementalNode): string => {
          if ("content" in element && element.content) {
            return element.content.trim();
          }
          return "";
        };
        const text = textElements.map(getTextContent).join(" ").trim();

        // Save SMS channel with raw.text structure (no elements array)
        const newContent = updateElemental(templateEditorContent, {
          channel: {
            channel: "sms",
            raw: {
              text,
            },
          },
        });

        if (JSON.stringify(templateEditorContent) !== JSON.stringify(newContent)) {
          setTemplateEditorContent(newContent);
        }
      },
      [templateEditorContent, setTemplateEditorContent, isTemplateTransitioning]
    );

    const content = useMemo(() => {
      if (isTemplateLoading !== false) {
        return null;
      }

      // First try to get SMS content from value prop, then fallback to templateEditorContent
      let smsChannel = value?.elements.find(
        (el): el is ElementalNode & { type: "channel"; channel: "sms" } =>
          el.type === "channel" && el.channel === "sms"
      );

      // Fallback: if no SMS channel found in value, try to get it from templateEditorContent
      if (!smsChannel && templateEditorContent) {
        smsChannel = getOrCreateSMSElement(templateEditorContent);
      }

      // Extract text from raw properties or use defaults
      const text =
        (smsChannel?.type === "channel" && "raw" in smsChannel && smsChannel.raw?.text) || "";

      // Convert SMS raw data to elements for Tiptap editor
      const smsElements: ElementalNode[] = text
        ? [{ type: "text" as const, content: text }]
        : [{ type: "text" as const, content: "\n" }]; // Default empty content

      const elementalContent = {
        type: "channel" as const,
        channel: "sms" as const,
        elements: smsElements,
      };

      return convertElementalToTiptap({
        version: "2022-01-01",
        elements: [elementalContent],
      });
    }, [value, templateEditorContent, isTemplateLoading]);

    return (
      <MainLayout
        theme={theme}
        isLoading={Boolean(isTemplateLoading && isInitialLoadRef.current)}
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
        ref={ref}
      >
        {render?.({
          content,
          extensions,
          editable: !readOnly,
          autofocus: !readOnly,
          onUpdate: onUpdateHandler,
        })}
        {/* <div className="courier-flex courier-flex-col courier-items-center courier-py-8">
          <IPhoneFrame>
            <div className="courier-sms-editor">
              <EditorProvider
                content={content}
                extensions={extensions}
                editable={!readOnly}
                autofocus={!readOnly}
                onUpdate={onUpdateHandler}
                // editorContainerProps={{
                //   className: cn(
                //     "courier-sms-editor"
                //     // readOnly && "courier-brand-editor-readonly"
                //   ),
                // }}
                immediatelyRender={false}
              >
                <SMSEditorContent />
                <BubbleTextMenu config={SMSConfig} />
              </EditorProvider>
            </div>
          </IPhoneFrame>
        </div> */}
      </MainLayout>
    );
  }
);

export const SMS = memo(SMSComponent);
