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
import type { Theme } from "../../../ui-kit/ThemeProvider/ThemeProvider.types";
import { MainLayout } from "../../../ui/MainLayout";
import { Channels } from "../Channels";

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

export interface PushProps {
  theme?: Theme | string;
  hidePublish?: boolean;
  variables?: Record<string, unknown>;
  readOnly?: boolean;
}

const PushComponent = forwardRef<HTMLDivElement, PushProps>(
  ({ theme, hidePublish, variables, readOnly }, ref) => {
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
          channel: "push",
        });

        if (JSON.stringify(templateEditorContent) !== JSON.stringify(newContent)) {
          setTemplateEditorContent(newContent);
        }
      },
      [templateEditorContent, setTemplateEditorContent]
    );

    const content = useMemo(() => {
      let element: ElementalNode | undefined = templateEditorContent?.elements.find(
        (el): el is ElementalNode & { type: "channel"; channel: "push" } =>
          el.type === "channel" && el.channel === "push"
      );

      if (!element) {
        element = {
          type: "channel",
          channel: "push",
          elements: [
            {
              type: "text",
              content: "\n",
              text_style: "h2",
            },
            { type: "text", content: "\n" },
          ],
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
        Header={<Channels hidePublish={hidePublish} />}
        ref={ref}
      >
        <div className="courier-flex courier-flex-col courier-items-center courier-h-full">
          <div className="courier-py-2 courier-border-8 courier-w-80 courier-h-3/4 courier-rounded-3xl courier-bg-background courier-mt-8">
            <div className="courier-px-4 courier-py-2 courier-text-gray-500 courier-text-center courier-my-8">
              <p className="courier-text-lg courier-font-medium">
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="courier-text-5xl courier-font-semibold courier-mt-1">
                {new Date().toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </p>
            </div>
            <EditorProvider
              content={content}
              extensions={extensions}
              editable={!readOnly}
              autofocus={!readOnly}
              onUpdate={onUpdateHandler}
              editorContainerProps={{
                className: cn(
                  "courier-push-editor"
                  // readOnly && "courier-brand-editor-readonly"
                ),
              }}
            >
              <EditorContent />
            </EditorProvider>
          </div>
        </div>
      </MainLayout>
    );
  }
);

export const Push = memo(PushComponent);
