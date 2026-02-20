import { ExtensionKit } from "@/components/extensions/extension-kit";
import { isTemplateLoadingAtom } from "@/components/Providers/store";
import {
  templateEditorAtom,
  templateEditorContentAtom,
  isTemplateTransitioningAtom,
  pendingAutoSaveAtom,
  getFormUpdating,
} from "@/components/TemplateEditor/store";
// import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import type { TextMenuConfig } from "@/components/ui/TextMenu/config";
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import type { TiptapDoc } from "@/lib/utils";
import {
  convertElementalToTiptap,
  convertTiptapToElemental,
  updateElemental,
  cleanSMSElements,
} from "@/lib/utils";
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

export const defaultSMSContent: ElementalNode[] = [
  {
    type: "text",
    content: "\n",
  },
];

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
      elements: defaultSMSContent,
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

    // Don't update content if a sidebar form is actively updating the editor
    if (getFormUpdating()) return;

    // Don't update content if user is focused on a sidebar form input
    const activeElement = document.activeElement;
    if (activeElement?.closest("[data-sidebar-form]")) return;

    const element = getOrCreateSMSElement(templateEditorContent);

    // Get elements from SMS channel (now uses elements instead of raw)
    const smsElements: ElementalNode[] =
      (element.type === "channel" && "elements" in element && element.elements) ||
      defaultSMSContent;

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
        const activeEl = document.activeElement;
        const sidebarFocused = activeEl?.closest("[data-sidebar-form]") !== null;
        if (!editor.isFocused && !getFormUpdating() && !sidebarFocused) {
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
      readOnly,
      channels,
      routing,
      render,
      headerRenderer,
      value,
      colorScheme,
      variables,
      disableVariablesAutocomplete = false,
      ...rest
    },
    ref
  ) => {
    const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
    const isInitialLoadRef = useRef(true);
    const isMountedRef = useRef(false);
    const setSelectedNode = useSetAtom(selectedNodeAtom);
    const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
    const setPendingAutoSave = useSetAtom(pendingAutoSaveAtom);
    const isTemplateTransitioning = useAtomValue(isTemplateTransitioningAtom);

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
            setSelectedNode,
            variables,
            disableVariablesAutocomplete,
            textMarks: "plain-text", // SMS doesn't support rich text formatting
          }),
        ].filter((e): e is AnyExtension => e !== undefined),
      [setSelectedNode, variables, disableVariablesAutocomplete]
    );

    const onUpdateHandler = useCallback(
      ({ editor }: { editor: Editor }) => {
        if (isTemplateTransitioning) {
          return;
        }

        // Handle new templates by creating initial structure
        if (!templateEditorContent) {
          const elemental = convertTiptapToElemental(editor.getJSON() as TiptapDoc);
          const cleanedElements = cleanSMSElements(elemental);

          const newContent = {
            version: "2022-01-01" as const,
            elements: [
              {
                type: "channel" as const,
                channel: "sms" as const,
                elements: cleanedElements.length > 0 ? cleanedElements : defaultSMSContent,
              },
            ],
          };
          setTemplateEditorContent(newContent);
          setPendingAutoSave(newContent);
          return;
        }

        const elemental = convertTiptapToElemental(editor.getJSON() as TiptapDoc);
        const cleanedElements = cleanSMSElements(elemental);

        // Save SMS channel with elements array (cleaned of styling properties)
        const newContent = updateElemental(templateEditorContent, {
          channel: "sms",
          elements: cleanedElements.length > 0 ? cleanedElements : defaultSMSContent,
        });

        if (JSON.stringify(templateEditorContent) !== JSON.stringify(newContent)) {
          setTemplateEditorContent(newContent);
          setPendingAutoSave(newContent);
        }
      },
      [templateEditorContent, setTemplateEditorContent, setPendingAutoSave, isTemplateTransitioning]
    );

    // Derive content once on mount - EditorProvider uses this as initial value only
    // Subsequent updates flow through restoration effect in SMSEditorContent
    const content = useMemo(() => {
      if (isTemplateLoading !== false) {
        return null;
      }

      const source = value ?? templateEditorContent;

      // First try to get SMS content from value prop, then fallback to templateEditorContent
      let smsChannel = source?.elements?.find(
        (el): el is ElementalNode & { type: "channel"; channel: "sms" } =>
          el.type === "channel" && el.channel === "sms"
      );

      // Fallback: if no SMS channel found in value, try to get it from templateEditorContent
      // This handles null/undefined source by creating default content
      if (!smsChannel) {
        smsChannel = getOrCreateSMSElement(source);
      }

      // Get elements from SMS channel (now uses elements instead of raw)
      const smsElements: ElementalNode[] =
        (smsChannel?.type === "channel" && "elements" in smsChannel && smsChannel.elements) ||
        defaultSMSContent;

      const elementalContent = {
        type: "channel" as const,
        channel: "sms" as const,
        elements: smsElements,
      };

      return convertElementalToTiptap({
        version: "2022-01-01",
        elements: [elementalContent],
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTemplateLoading]); // Only recompute when loading state changes - value/templateEditorContent intentionally omitted to keep EditorProvider stable

    return (
      <MainLayout
        theme={theme}
        colorScheme={colorScheme}
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
