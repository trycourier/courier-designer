import { editorHoldsFocus } from "@/components/utils/editorFocus";
import { ExtensionKit } from "@/components/extensions/extension-kit";
import type { MessageRouting } from "@/components/Providers/store";
import { isTemplateLoadingAtom } from "@/components/Providers/store";
import {
  templateEditorAtom,
  templateEditorContentAtom,
  isTemplateTransitioningAtom,
  isDraggingAtom,
  pendingAutoSaveAtom,
  getFormUpdating,
  previewLocaleAtom,
  type VisibleBlockItem,
} from "@/components/TemplateEditor/store";
import { MessagingChannelPaste } from "@/components/extensions/MessagingChannelPaste";
import { DropRules } from "@/components/extensions/DropRules";
import type { TextMenuConfig } from "@/components/ui/TextMenu/config";
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import type { TiptapDoc } from "@/lib/utils";
import {
  applyLocaleToContent,
  convertElementalToTiptap,
  convertTiptapToElemental,
  updateElemental,
} from "@/lib/utils";
import { setTestEditor } from "@/lib/testHelpers";
import type { ChannelType } from "@/store";
import type { ElementalNode, ElementalActionNode } from "@/types/elemental.types";
import type { Node } from "@tiptap/pm/model";
import type { AnyExtension, Editor } from "@tiptap/react";
import { useCurrentEditor } from "@tiptap/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import type { HTMLAttributes } from "react";
import { forwardRef, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MainLayout } from "../../../ui/MainLayout";
import type { TemplateEditorProps } from "../../TemplateEditor";
import { Channels } from "../Channels";
import { usePragmaticDnd } from "../../hooks/usePragmaticDnd";
import { useSyncEditorItems } from "../../hooks/useSyncEditorItems";
import { WhatsappFlatLists, WhatsappHeaderFirst } from "./whatsappExtensions";
import { useHandlebarsPreviewData } from "@/hooks/useHandlebarsPreviewData";
import {
  WHATSAPP_CHANNEL,
  getWhatsappActions,
  getWhatsappHeader,
  toEditorElements,
  toWhatsappElements,
} from "./whatsappContent";
import type { WhatsappHeader } from "./whatsappContent";

export const WhatsappEditorContent = ({ value }: { value?: TiptapDoc | null }) => {
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
      setTestEditor("whatsapp", editor);
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

    const element = getOrCreateWhatsappElement(templateEditorContent);

    // Get elements from Whatsapp channel (now uses elements instead of raw)
    const whatsappElements: ElementalNode[] = toEditorElements(
      (element.type === "channel" && "elements" in element && element.elements) ||
        defaultWhatsappContent,
      getWhatsappHeader(templateEditorContent)
    );

    const elementalContent = {
      type: "channel" as const,
      channel: "whatsapp" as const,
      elements: whatsappElements,
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
        if (!editorHoldsFocus(editor) && !getFormUpdating() && !sidebarFocused) {
          editor.commands.setContent(newContent);
        }
      }, 1);
    }
  }, [editor, templateEditorContent]);

  return null;
};

type UniqueIdentifier = string | number;

/** Text and lists build the body; a Button is dropped under the bubble, into the button slot. */
export const WHATSAPP_BODY_BLOCKS: VisibleBlockItem[] = ["text", "list", "button"];

export interface WhatsappRenderProps {
  content: TiptapDoc | null;
  items: { Sidebar: VisibleBlockItem[]; Editor: UniqueIdentifier[] };
  textMenuConfig: TextMenuConfig;
  /** A selected list shows its bullets/numbers switch in the sidebar. */
  selectedNode: Node | null;
  whatsappEditor: Editor | null;
  /** The template's header; an image one is drawn at the top of the bubble. */
  header?: WhatsappHeader;
  /** The buttons drawn under the bubble. */
  actions: ElementalActionNode[];
  extensions: AnyExtension[];
  editable: boolean;
  autofocus: boolean;
  onUpdate: ({ editor }: { editor: Editor }) => void;
}

export interface WhatsappProps
  extends Pick<
      TemplateEditorProps,
      | "hidePublish"
      | "theme"
      | "variables"
      | "variableViewMode"
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
  render?: (props: WhatsappRenderProps) => React.ReactNode;
}

// The title line is drawn from the header, so a new template starts with an empty body only
export const defaultWhatsappContent: ElementalNode[] = [
  {
    type: "text",
    content: "\n",
  },
];

// Helper function to get or create default Whatsapp element
const getOrCreateWhatsappElement = (
  templateEditorContent: { elements: ElementalNode[] } | null | undefined
): ElementalNode & { type: "channel"; channel: "whatsapp" } => {
  let element: ElementalNode | undefined = templateEditorContent?.elements.find(
    (el: ElementalNode): el is ElementalNode & { type: "channel"; channel: "whatsapp" } =>
      el.type === "channel" && el.channel === "whatsapp"
  );

  if (!element) {
    element = {
      type: "channel",
      channel: "whatsapp",
      elements: defaultWhatsappContent,
    };
  }

  return element! as ElementalNode & { type: "channel"; channel: "whatsapp" };
};

export const WhatsappConfig: TextMenuConfig = {
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
  orderedList: { state: "hidden" },
  unorderedList: { state: "hidden" },
  link: { state: "hidden" },
  variable: { state: "enabled" },
};

/**
 * Bold, italic and strikethrough are WhatsApp's own `*`, `_` and `~`, so they are offered on
 * selected body text, and a body paragraph can be made a quote (`> ` lines). The header
 * takes no formatting.
 */
export const getWhatsappTextMenuConfig = (
  node: Node | null,
  hasTextSelection: boolean
): TextMenuConfig => {
  const name = node?.type.name;
  // A click inside a quote selects the quote itself, so it is treated as text
  const isText = name === "paragraph" || name === "blockquote";
  const marks = isText || name === "list" ? hasTextSelection : false;
  const state = (enabled: boolean) => ({
    state: enabled ? ("enabled" as const) : ("hidden" as const),
  });

  return {
    ...WhatsappConfig,
    bold: state(marks),
    italic: state(marks),
    strike: state(marks),
    quote: state(isText),
    variable: state(true),
  };
};

const WhatsappComponent = forwardRef<HTMLDivElement, WhatsappProps>(
  (
    {
      theme,
      hidePublish,
      readOnly,
      channels,
      routing,
      headerRenderer,
      render,
      value,
      colorScheme,
      variables,
      variableViewMode,
      disableVariablesAutocomplete = false,
      ...rest
    },
    ref
  ) => {
    const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
    const previewLocale = useAtomValue(previewLocaleAtom);
    const isInitialLoadRef = useRef(true);
    const isMountedRef = useRef(false);
    const setSelectedNode = useSetAtom(selectedNodeAtom);
    const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
    const setPendingAutoSave = useSetAtom(pendingAutoSaveAtom);
    const isTemplateTransitioning = useAtomValue(isTemplateTransitioningAtom);
    const templateEditor = useAtomValue(templateEditorAtom);
    const isDragging = useAtomValue(isDraggingAtom);
    const isDraggingRef = useRef(isDragging);
    const rafId = useRef<number | null>(null);
    const selectedNode = useAtomValue(selectedNodeAtom);
    const [hasTextSelection, setHasTextSelection] = useState(false);

    const [items, setItems] = useState<{ Sidebar: VisibleBlockItem[]; Editor: UniqueIdentifier[] }>(
      { Sidebar: WHATSAPP_BODY_BLOCKS, Editor: [] }
    );

    usePragmaticDnd({ items, setItems, toChannelElements: toWhatsappElements });
    const { syncEditorItems } = useSyncEditorItems({ setItems, rafId });

    useEffect(() => {
      isDraggingRef.current = isDragging;
    }, [isDragging]);

    useEffect(() => {
      if (isTemplateLoading === false && templateEditorContent && templateEditor) {
        // After the DOM has the loaded content
        setTimeout(() => {
          if (!templateEditor.isDestroyed) {
            syncEditorItems(templateEditor);
          }
        }, 300);
      }
    }, [isTemplateLoading, templateEditorContent, templateEditor, syncEditorItems]);

    useEffect(() => {
      if (!templateEditor) return;

      const updateSelection = () => {
        const selection = templateEditor.state?.selection;
        if (selection) {
          setHasTextSelection(selection.from !== selection.to);
        }
      };

      templateEditor.on("selectionUpdate", updateSelection);
      templateEditor.on("transaction", updateSelection);
      return () => {
        templateEditor.off("selectionUpdate", updateSelection);
        templateEditor.off("transaction", updateSelection);
      };
    }, [templateEditor]);

    const textMenuConfig = useMemo(
      () => getWhatsappTextMenuConfig(selectedNode, hasTextSelection),
      [selectedNode, hasTextSelection]
    );

    const shouldHandleClick = useCallback(() => !isDraggingRef.current, []);

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
            shouldHandleClick,
            variables,
            disableVariablesAutocomplete,
            textMarks: { underline: "disabled" },
          }),
          MessagingChannelPaste.configure({ headingBehavior: "strip" }),
          // The header line stays first and only text and lists drop into the body
          DropRules.configure({ fixedFirstBlock: true, sidebarTypes: ["text", "list"] }),
          WhatsappHeaderFirst,
          WhatsappFlatLists,
        ].filter((e): e is AnyExtension => e !== undefined),
      [setSelectedNode, shouldHandleClick, variables, disableVariablesAutocomplete]
    );

    const onUpdateHandler = useCallback(
      ({ editor }: { editor: Editor }) => {
        // The placeholder doc mounted while loading would auto-save as an empty body (C-21461).
        if (isTemplateLoading !== false || isTemplateTransitioning) {
          return;
        }

        const elemental = convertTiptapToElemental(editor.getJSON() as TiptapDoc);

        // Handle new templates by creating initial structure
        if (!templateEditorContent) {
          const newContent = {
            version: "2022-01-01" as const,
            elements: [
              {
                type: "channel" as const,
                channel: "whatsapp" as const,
                elements: toWhatsappElements(null, elemental),
              },
            ],
          };
          setTemplateEditorContent(newContent);
          setPendingAutoSave(newContent);
          return;
        }

        const newContent = updateElemental(templateEditorContent, {
          channel: WHATSAPP_CHANNEL,
          elements: toWhatsappElements(templateEditorContent, elemental),
        });

        if (JSON.stringify(templateEditorContent) !== JSON.stringify(newContent)) {
          setTemplateEditorContent(newContent);
          setPendingAutoSave(newContent);
        }
      },
      [
        templateEditorContent,
        setTemplateEditorContent,
        setPendingAutoSave,
        isTemplateLoading,
        isTemplateTransitioning,
      ]
    );

    // While read-only — version history, Preview & Test — the host swaps `value`
    // to show a different saved version, and re-deriving is the only way that
    // selection reaches the canvas (ReadOnlyEditorContent re-applies whatever
    // this memo returns). Nothing is being typed, so it is safe. While editable
    // the memo stays frozen: see the dependency note below.
    const readOnlyValue = readOnly ? (value ?? templateEditorContent) : null;

    // Derive content once on mount - EditorProvider uses this as initial value only
    // Subsequent updates flow through restoration effect in WhatsappEditorContent
    const previewData = useHandlebarsPreviewData(variableViewMode, variables, "whatsapp");

    const content = useMemo(() => {
      if (isTemplateLoading !== false) {
        return null;
      }

      let source = value ?? templateEditorContent;

      // Apply locale translations BEFORE extracting/restructuring whatsapp elements,
      // because the meta→H2 conversion below drops locales from the original nodes.
      if (previewLocale && source) {
        source = applyLocaleToContent(source, previewLocale) ?? source;
      }

      // First try to get Whatsapp content from value prop, then fallback to templateEditorContent
      let whatsappChannel = source?.elements?.find(
        (el): el is ElementalNode & { type: "channel"; channel: "whatsapp" } =>
          el.type === "channel" && el.channel === "whatsapp"
      );

      // Fallback: if no Whatsapp channel found in value, try to get it from templateEditorContent
      // This handles null/undefined source by creating default content
      if (!whatsappChannel) {
        whatsappChannel = getOrCreateWhatsappElement(source);
      }

      // Get elements from Whatsapp channel (now uses elements instead of raw)
      const whatsappElements: ElementalNode[] = toEditorElements(
        (whatsappChannel?.type === "channel" &&
          "elements" in whatsappChannel &&
          whatsappChannel.elements) ||
          defaultWhatsappContent,
        getWhatsappHeader(source),
        { preview: true }
      );

      const elementalContent = {
        type: "channel" as const,
        channel: "whatsapp" as const,
        elements: whatsappElements,
      };

      const elementalForConversion = {
        version: "2022-01-01" as const,
        elements: [elementalContent],
      };

      // Keep the plain single-argument call while editing; preview is the only
      // case that needs options.
      return previewData
        ? convertElementalToTiptap(elementalForConversion, { previewData })
        : convertElementalToTiptap(elementalForConversion);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTemplateLoading, previewLocale, previewData, readOnlyValue]); // `value`/`templateEditorContent` are read but intentionally omitted from the deps while editable: EditorProvider treats `content` as an initial value and live edits flow back out through onUpdate, so re-deriving mid-edit would fight the user's cursor. `readOnlyValue` re-admits `value` only when read-only.

    // Live while editing; the host's `value` only while read-only, when it shows a saved version
    const actionsSource = readOnly ? (value ?? templateEditorContent) : templateEditorContent;
    const actions = useMemo(() => getWhatsappActions(actionsSource), [actionsSource]);
    const header = useMemo(() => getWhatsappHeader(actionsSource), [actionsSource]);

    return (
      <MainLayout
        theme={theme}
        colorScheme={colorScheme}
        isLoading={Boolean(isTemplateLoading && isInitialLoadRef.current)}
        readOnly={readOnly}
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
          items,
          textMenuConfig,
          selectedNode,
          whatsappEditor: templateEditor,
          header,
          actions,
          extensions,
          editable: !readOnly,
          autofocus: !readOnly,
          onUpdate: onUpdateHandler,
        })}
      </MainLayout>
    );
  }
);

export const Whatsapp = memo(WhatsappComponent);
