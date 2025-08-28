import { ExtensionKit } from "@/components/extensions/extension-kit";
import { isTemplateLoadingAtom } from "@/components/Providers/store";
import { brandEditorAtom, templateEditorContentAtom } from "@/components/TemplateEditor/store";
// import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import type { TextMenuConfig } from "@/components/ui/TextMenu/config";
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import type { TiptapDoc } from "@/lib/utils";
import { convertElementalToTiptap, convertTiptapToElemental, updateElemental } from "@/lib/utils";
import type { ElementalNode } from "@/types/elemental.types";
import type { AnyExtension, Editor } from "@tiptap/react";
// import { EditorProvider, useCurrentEditor } from "@tiptap/react";
import { useCurrentEditor } from "@tiptap/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { forwardRef, memo, useCallback, useEffect, useMemo, useRef } from "react";
import { SegmentedMessage } from "sms-segments-calculator";
import type { MessageRouting } from "../../../Providers/store";
import { MainLayout } from "../../../ui/MainLayout";
// import { IPhoneFrame } from "../../IPhoneFrame";
import type { ChannelType } from "@/store";
import type { TemplateEditorProps } from "../../TemplateEditor";
import { Channels } from "../Channels";

export const defaultSMSContent: ElementalNode[] = [{ type: "text", content: "" }];

export const SMSEditorContent = ({ value }: { value?: TiptapDoc | null }) => {
  const { editor } = useCurrentEditor();
  const setBrandEditor = useSetAtom(brandEditorAtom);
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
      setBrandEditor(editor);
      setTimeout(() => {
        editor.commands.blur();
      }, 1);
    }
  }, [editor, setBrandEditor]);

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
    { theme, hidePublish, variables, readOnly, channels, routing, render, headerRenderer, value },
    ref
  ) => {
    const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
    const isInitialLoadRef = useRef(true);
    const isMountedRef = useRef(false);
    const setSelectedNode = useSetAtom(selectedNodeAtom);
    const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);

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
        if (!templateEditorContent) {
          return;
        }
        const elemental = convertTiptapToElemental(editor.getJSON() as TiptapDoc);
        const newContent = updateElemental(templateEditorContent, {
          elements: elemental,
          channel: "sms",
        });

        if (JSON.stringify(templateEditorContent) !== JSON.stringify(newContent)) {
          setTemplateEditorContent(newContent);
        }
      },
      [templateEditorContent, setTemplateEditorContent]
    );

    const content = useMemo(() => {
      if (isTemplateLoading !== false) {
        return null;
      }

      let element: ElementalNode | undefined = value?.elements.find(
        (el): el is ElementalNode & { type: "channel"; channel: "sms" } =>
          el.type === "channel" && el.channel === "sms"
      );

      if (!element) {
        element = {
          type: "channel",
          channel: "sms",
          elements: defaultSMSContent,
        };
      }

      // At this point, element is guaranteed to be ElementalNode
      return convertElementalToTiptap({
        version: "2022-01-01",
        elements: [element], // element is now definitely ElementalNode
      });
    }, [value, isTemplateLoading]);

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
