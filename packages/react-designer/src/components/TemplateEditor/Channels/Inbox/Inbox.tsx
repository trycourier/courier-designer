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
import { InboxIcon, HamburgerMenuIcon, ExpandIcon, MoreMenuIcon } from "../../../ui-kit/Icon";
import { SideBar } from "./SideBar";

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

  // We've removed the reactive update that causes the circular dependency
  // This allows the user's typing to persist without editor refreshes

  return null;
};

export interface InboxProps {
  theme?: Theme | string;
  hidePublish?: boolean;
  variables?: Record<string, unknown>;
  readOnly?: boolean;
}

const InboxComponent = forwardRef<HTMLDivElement, InboxProps>(
  ({ theme, hidePublish, variables, readOnly }, ref) => {
    const isTenantLoading = useAtomValue(isTenantLoadingAtom);
    const isInitialLoadRef = useRef(true);
    const isMountedRef = useRef(false);
    const setSelectedNode = useSetAtom(selectedNodeAtom);
    const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
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
          channel: "inbox",
        });

        if (JSON.stringify(templateEditorContent) !== JSON.stringify(newContent)) {
          setTemplateEditorContent(newContent);
        }
      },
      [templateEditorContent, setTemplateEditorContent]
    );

    const content = useMemo(() => {
      let element: ElementalNode | undefined = templateEditorContent?.elements.find(
        (el): el is ElementalNode & { type: "channel"; channel: "inbox" } =>
          el.type === "channel" && el.channel === "inbox"
      );

      if (!element) {
        element = {
          type: "channel",
          channel: "inbox",
          elements: [
            {
              type: "text",
              content: "\n",
              text_style: "h2",
            },
            { type: "text", content: "\n" },
            {
              type: "action",
              content: "Register",
              align: "left",
              href: "",
            },
          ],
        };
      }

      // At this point, element is guaranteed to be ElementalNode
      const tipTapContent = convertElementalToTiptap({
        version: "2022-01-01",
        elements: [element], // element is now definitely ElementalNode
      });

      return tipTapContent;
    }, [templateEditorContent]);

    return (
      <MainLayout
        theme={theme}
        isLoading={Boolean(isTenantLoading && isInitialLoadRef.current)}
        Header={<Channels hidePublish={hidePublish} />}
        ref={ref}
      >
        <div className="courier-flex courier-flex-1 courier-flex-row courier-overflow-hidden">
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
              >
                <EditorContent />
              </EditorProvider>
            </div>
          </div>
          <div className="courier-editor-sidebar courier-opacity-100 courier-translate-x-0 courier-w-64 courier-flex-shrink-0">
            <div className="courier-p-4 courier-h-full">
              <SideBar />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }
);

export const Inbox = memo(InboxComponent);
