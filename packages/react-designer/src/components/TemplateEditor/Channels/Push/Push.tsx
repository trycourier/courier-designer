import { ExtensionKit } from "@/components/extensions/extension-kit";
import type { MessageRouting } from "@/components/Providers/store";
import { isTemplateLoadingAtom } from "@/components/Providers/store";
import {
  brandEditorAtom,
  templateEditorContentAtom,
  isTemplateTransitioningAtom,
} from "@/components/TemplateEditor/store";
import type { TextMenuConfig } from "@/components/ui/TextMenu/config";
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import type { TiptapDoc } from "@/lib/utils";
import { convertElementalToTiptap, convertTiptapToElemental, updateElemental } from "@/lib/utils";
import type { ChannelType } from "@/store";
import type { ElementalNode, TextStyle } from "@/types/elemental.types";
import type { AnyExtension, Editor } from "@tiptap/react";
import { useCurrentEditor } from "@tiptap/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import type { HTMLAttributes } from "react";
import { forwardRef, memo, useCallback, useEffect, useMemo, useRef } from "react";
import { MainLayout } from "../../../ui/MainLayout";
import type { TemplateEditorProps } from "../../TemplateEditor";
import { Channels } from "../Channels";

export const PushEditorContent = ({ value }: { value?: TiptapDoc | null }) => {
  const { editor } = useCurrentEditor();
  const setBrandEditor = useSetAtom(brandEditorAtom);
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
      setBrandEditor(editor);
      setTimeout(() => {
        editor.commands.blur();
      }, 1);
    }
  }, [editor, setBrandEditor]);

  // Update editor content when templateEditorContent changes (fallback restoration mechanism)
  useEffect(() => {
    if (!editor || !templateEditorContent) return;

    // Don't update content if user is actively typing
    if (editor.isFocused) return;

    const element = getOrCreatePushElement(templateEditorContent);

    // Extract title and text from raw properties
    const title = (element.type === "channel" && "raw" in element && element.raw?.title) || "";
    const text = (element.type === "channel" && "raw" in element && element.raw?.text) || "";

    // Convert Push raw data to elements for Tiptap editor - ALWAYS maintain title and body structure
    const pushElements: ElementalNode[] = [
      { type: "text" as const, content: title || "\n", text_style: "h2" as TextStyle },
      { type: "text" as const, content: text || "\n" },
    ];

    const elementalContent = {
      type: "channel" as const,
      channel: "push" as const,
      elements: pushElements,
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

  return null;
};

export interface PushRenderProps {
  content: TiptapDoc | null;
  extensions: AnyExtension[];
  editable: boolean;
  autofocus: boolean;
  onUpdate: ({ editor }: { editor: Editor }) => void;
}

export interface PushProps
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
  render?: (props: PushRenderProps) => React.ReactNode;
}

export const defaultPushContent = {
  raw: {
    title: "",
    text: "",
  },
};

// Helper function to get or create default Push element
const getOrCreatePushElement = (
  templateEditorContent: { elements: ElementalNode[] } | null | undefined
): ElementalNode & { type: "channel"; channel: "push" } => {
  let element: ElementalNode | undefined = templateEditorContent?.elements.find(
    (el: ElementalNode): el is ElementalNode & { type: "channel"; channel: "push" } =>
      el.type === "channel" && el.channel === "push"
  );

  if (!element) {
    element = {
      type: "channel",
      channel: "push",
      raw: {
        title: "",
        text: "",
      },
    };
  }

  return element! as ElementalNode & { type: "channel"; channel: "push" };
};

export const PushConfig: TextMenuConfig = {
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

const PushComponent = forwardRef<HTMLDivElement, PushProps>(
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
          const title = textElements[0] ? getTextContent(textElements[0]) : "";
          const text = textElements[1] ? getTextContent(textElements[1]) : "";

          const newContent = {
            version: "2022-01-01" as const,
            elements: [
              {
                type: "channel" as const,
                channel: "push" as const,
                raw: {
                  title,
                  text,
                },
              },
            ],
          };
          setTemplateEditorContent(newContent);
          return;
        }

        const elemental = convertTiptapToElemental(editor.getJSON() as TiptapDoc);

        // Extract title (1st paragraph) and text (2nd paragraph) from editor content
        const textElements = elemental.filter((el) => el.type === "text");
        const getTextContent = (element: ElementalNode): string => {
          if ("content" in element && element.content) {
            return element.content.trim();
          }
          return "";
        };
        const title = textElements[0] ? getTextContent(textElements[0]) : "";
        const text = textElements[1] ? getTextContent(textElements[1]) : "";

        // Save Push channel with raw.title + raw.text structure (no elements array)
        const newContent = updateElemental(templateEditorContent, {
          channel: {
            channel: "push",
            raw: {
              title,
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

      // First try to get Push content from value prop, then fallback to templateEditorContent
      let pushChannel = value?.elements.find(
        (el): el is ElementalNode & { type: "channel"; channel: "push" } =>
          el.type === "channel" && el.channel === "push"
      );

      // Fallback: if no Push channel found in value, try to get it from templateEditorContent
      if (!pushChannel && templateEditorContent) {
        pushChannel = getOrCreatePushElement(templateEditorContent);
      }

      // Extract title and text from raw properties or use defaults
      const title =
        (pushChannel?.type === "channel" && "raw" in pushChannel && pushChannel.raw?.title) || "";
      const text =
        (pushChannel?.type === "channel" && "raw" in pushChannel && pushChannel.raw?.text) || "";

      // Convert Push raw data to elements for Tiptap editor - ALWAYS maintain title and body structure
      const pushElements: ElementalNode[] = [
        { type: "text" as const, content: title || "\n", text_style: "h2" as TextStyle },
        { type: "text" as const, content: text || "\n" },
      ];

      const elementalContent = {
        type: "channel" as const,
        channel: "push" as const,
        elements: pushElements,
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
      </MainLayout>
    );
  }
);

export const Push = memo(PushComponent);
