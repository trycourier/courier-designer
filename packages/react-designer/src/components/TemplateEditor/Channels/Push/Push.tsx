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

export const PushEditorContent = ({ value }: { value?: TiptapDoc | null }) => {
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
      setTestEditor("push", editor);
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

    const element = getOrCreatePushElement(templateEditorContent);

    // Get elements from Push channel (now uses elements instead of raw)
    let pushElements: ElementalNode[] =
      (element.type === "channel" && "elements" in element && element.elements) ||
      defaultPushContent;

    // Convert meta element to H2 text for editor display
    pushElements = pushElements.map((el) => {
      if (el.type === "meta" && "title" in el) {
        // Convert meta.title to H2 text element for editor
        return {
          type: "text" as const,
          content: el.title || "\n",
          text_style: "h2" as const,
        };
      }
      return el;
    });

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

export const defaultPushContent: ElementalNode[] = [
  {
    type: "meta",
    title: "",
  },
  {
    type: "text",
    content: "\n",
  },
];

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
      elements: defaultPushContent,
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

          // Extract title from first H2 element and remove it from body elements
          const firstElement = elemental[0];
          let titleText = "";
          let bodyElements = elemental;

          if (
            firstElement &&
            firstElement.type === "text" &&
            "text_style" in firstElement &&
            firstElement.text_style === "h2" &&
            "content" in firstElement
          ) {
            titleText = (firstElement.content as string).trim();
            // Remove the H2 element from body - it will become the meta title
            bodyElements = elemental.slice(1);
          }

          // Create proper structure with meta (title extracted from H2)
          const titleUpdate = createTitleUpdate(null, "push", titleText, bodyElements);

          const newContent = {
            version: "2022-01-01" as const,
            elements: [
              {
                type: "channel" as const,
                channel: "push" as const,
                elements: titleUpdate.elements,
              },
            ],
          };
          setTemplateEditorContent(newContent);
          return;
        }

        const elemental = convertTiptapToElemental(editor.getJSON() as TiptapDoc);

        // Extract title from first H2 element and remove it from body elements
        const firstElement = elemental[0];
        let titleText = "";
        let bodyElements = elemental;

        if (
          firstElement &&
          firstElement.type === "text" &&
          "text_style" in firstElement &&
          firstElement.text_style === "h2" &&
          "content" in firstElement
        ) {
          titleText = (firstElement.content as string).trim();
          // Remove the H2 element from body - it will become the meta title
          bodyElements = elemental.slice(1);
        }

        // Create proper structure with meta (title extracted from H2)
        const titleUpdate = createTitleUpdate(
          templateEditorContent,
          "push",
          titleText,
          bodyElements
        );

        // Save Push channel with elements array (with meta for title)
        const newContent = updateElemental(templateEditorContent, {
          channel: "push",
          elements: titleUpdate.elements,
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

      // Get elements from Push channel (now uses elements instead of raw)
      let pushElements: ElementalNode[] =
        (pushChannel?.type === "channel" && "elements" in pushChannel && pushChannel.elements) ||
        defaultPushContent;

      // Convert meta element to H2 text for editor display
      pushElements = pushElements.map((element) => {
        if (element.type === "meta" && "title" in element) {
          // Convert meta.title to H2 text element for editor
          return {
            type: "text" as const,
            content: element.title || "\n",
            text_style: "h2" as const,
          };
        }
        return element;
      });

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
