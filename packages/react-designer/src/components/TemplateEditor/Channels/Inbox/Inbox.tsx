import { ExtensionKit } from "@/components/extensions/extension-kit";
import type { MessageRouting } from "@/components/Providers/store";
import { isTenantLoadingAtom } from "@/components/Providers/store";
import { brandEditorAtom, templateEditorContentAtom } from "@/components/TemplateEditor/store";
import type { TextMenuConfig } from "@/components/ui/TextMenu/config";
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import type { TiptapDoc } from "@/lib/utils";
import { convertElementalToTiptap, convertTiptapToElemental, updateElemental } from "@/lib/utils";
import type { ChannelType } from "@/store";
import type { ElementalNode } from "@/types/elemental.types";
import type { AnyExtension, Editor } from "@tiptap/react";
import { useCurrentEditor } from "@tiptap/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
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
  }

  return element;
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

export const InboxEditorContent = () => {
  const { editor } = useCurrentEditor();
  const setBrandEditor = useSetAtom(brandEditorAtom);
  const [templateEditorContent] = useAtom(templateEditorContentAtom);

  useEffect(() => {
    if (editor) {
      setBrandEditor(editor);
      setTimeout(() => {
        editor.commands.blur();
      }, 1);
    }
  }, [editor, setBrandEditor]);

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

    const currentContent = editor.getJSON();

    // Only update if content has actually changed to avoid infinite loops
    if (JSON.stringify(currentContent) !== JSON.stringify(newContent)) {
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
    "hidePublish" | "theme" | "variables" | "channels" | "routing"
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
  render?: (props: InboxRenderProps) => React.ReactNode;
}

const InboxComponent = forwardRef<HTMLDivElement, InboxProps>(
  ({ theme, hidePublish, variables, readOnly, channels, routing, headerRenderer, render }, ref) => {
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
        if (!templateEditorContent || !editor) {
          return;
        }

        // Prevent updates during rapid typing by debouncing
        const currentJson = editor.getJSON() as TiptapDoc;
        const elemental = convertTiptapToElemental(currentJson);
        const newContent = updateElemental(templateEditorContent, {
          elements: elemental,
          channel: "inbox",
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
      [templateEditorContent, setTemplateEditorContent]
    );

    const content = useMemo(() => {
      const element = getOrCreateInboxElement(templateEditorContent);

      // At this point, element is guaranteed to be ElementalNode
      const tipTapContent = convertElementalToTiptap(
        {
          version: "2022-01-01",
          elements: [element], // element is now definitely ElementalNode
        },
        { channel: "inbox" }
      );

      return tipTapContent;
    }, [templateEditorContent]);

    return (
      <MainLayout
        theme={theme}
        isLoading={Boolean(isTenantLoading && isInitialLoadRef.current)}
        Header={
          headerRenderer ? (
            headerRenderer({ hidePublish, channels, routing })
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
