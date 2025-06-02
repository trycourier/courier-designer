import { ExtensionKit } from "@/components/extensions/extension-kit";
import { isTenantLoadingAtom } from "@/components/Providers/store";
import { brandEditorAtom, templateEditorContentAtom } from "@/components/TemplateEditor/store";
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import type { TiptapDoc } from "@/lib/utils";
import {
  cn,
  convertElementalToTiptap,
  convertTiptapToElemental,
  updateElemental,
} from "@/lib/utils";
import type { ElementalNode } from "@/types/elemental.types";
import type { AnyExtension, Editor } from "@tiptap/react";
import { EditorProvider, useCurrentEditor } from "@tiptap/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { forwardRef, memo, useCallback, useEffect, useMemo, useRef } from "react";
import { MainLayout } from "../../../ui/MainLayout";
import { IPhoneFrame } from "../../IPhoneFrame";
import { Channels } from "../Channels";
import type { TemplateEditorProps } from "../../TemplateEditor";

const EditorContent = () => {
  const { editor } = useCurrentEditor();
  const setBrandEditor = useSetAtom(brandEditorAtom);

  useEffect(() => {
    if (editor) {
      setBrandEditor(editor);
      setTimeout(() => {
        editor.commands.blur();
      }, 1);
    }
  }, [editor, setBrandEditor]);

  return null;
};

export interface SMSProps
  extends Pick<TemplateEditorProps, "hidePublish" | "theme" | "variables" | "channels"> {
  readOnly?: boolean;
}

const SMSComponent = forwardRef<HTMLDivElement, SMSProps>(
  ({ theme, hidePublish, variables, readOnly, channels }, ref) => {
    const isTenantLoading = useAtomValue(isTenantLoadingAtom);
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
      let element: ElementalNode | undefined = templateEditorContent?.elements.find(
        (el): el is ElementalNode & { type: "channel"; channel: "sms" } =>
          el.type === "channel" && el.channel === "sms"
      );

      if (!element) {
        element = {
          type: "channel",
          channel: "sms",
          elements: [{ type: "text", content: "" }],
        };
      }

      // At this point, element is guaranteed to be ElementalNode
      return convertElementalToTiptap({
        version: "2022-01-01",
        elements: [element], // element is now definitely ElementalNode
      });
    }, [templateEditorContent]);

    return (
      <MainLayout
        theme={theme}
        isLoading={Boolean(isTenantLoading && isInitialLoadRef.current)}
        Header={<Channels hidePublish={hidePublish} channels={channels} />}
        ref={ref}
      >
        <div className="courier-flex courier-flex-col courier-items-center courier-py-8">
          <IPhoneFrame>
            <EditorProvider
              content={content}
              extensions={extensions}
              editable={!readOnly}
              autofocus={!readOnly}
              onUpdate={onUpdateHandler}
              editorContainerProps={{
                className: cn(
                  "courier-sms-editor"
                  // readOnly && "courier-brand-editor-readonly"
                ),
              }}
              immediatelyRender={false}
            >
              <EditorContent />
            </EditorProvider>
          </IPhoneFrame>
        </div>
      </MainLayout>
    );
  }
);

export const SMS = memo(SMSComponent);
