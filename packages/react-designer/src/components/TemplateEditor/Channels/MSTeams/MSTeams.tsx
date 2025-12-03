import type { MessageRouting } from "@/components/Providers/store";
import { isTemplateLoadingAtom } from "@/components/Providers/store";
import {
  templateEditorAtom,
  isTemplateTransitioningAtom,
  templateEditorContentAtom,
  isDraggingAtom,
  pendingAutoSaveAtom,
} from "@/components/TemplateEditor/store";
import { ExtensionKit } from "@/components/extensions/extension-kit";
import type { TextMenuConfig } from "@/components/ui/TextMenu/config";
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import type { TiptapDoc } from "@/lib/utils";
import { convertElementalToTiptap, convertTiptapToElemental, updateElemental } from "@/lib/utils";
import { setTestEditor } from "@/lib/testHelpers";
import type { ChannelType } from "@/store";
import type { ElementalNode } from "@/types/elemental.types";
import type { Node } from "@tiptap/pm/model";
import type { AnyExtension, Editor } from "@tiptap/react";
import { useCurrentEditor } from "@tiptap/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import React, {
  forwardRef,
  type HTMLAttributes,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MainLayout } from "../../../ui/MainLayout";
import type { TemplateEditorProps } from "../../TemplateEditor";
import { usePragmaticDnd } from "../../hooks/usePragmaticDnd";
import { Channels } from "../Channels";

type UniqueIdentifier = string | number;

export const defaultMSTeamsContent: ElementalNode[] = [{ type: "text", content: "\n" }];

// Helper function to get or create default MSTeams element
const getOrCreateMSTeamsElement = (
  templateEditorContent: { elements: ElementalNode[] } | null | undefined
): ElementalNode => {
  let element: ElementalNode | undefined = templateEditorContent?.elements.find(
    (el: ElementalNode): el is ElementalNode & { type: "channel"; channel: "msteams" } =>
      el.type === "channel" && el.channel === "msteams"
  );

  if (!element) {
    element = {
      type: "channel",
      channel: "msteams",
      elements: defaultMSTeamsContent,
    };
  }

  return element!;
};

export const MSTeamsEditorContent = ({ value }: { value?: TiptapDoc }) => {
  const { editor } = useCurrentEditor();
  const setTemplateEditor = useSetAtom(templateEditorAtom);
  const templateEditorContent = useAtomValue(templateEditorContentAtom);
  const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
  const selectedNode = useAtomValue(selectedNodeAtom);
  const isValueUpdated = useRef(false);
  const mountedRef = useRef(false);

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
      setTestEditor("teams", editor);
      setTimeout(() => {
        editor.commands.blur();
      }, 1);
    }
  }, [editor, setTemplateEditor]);

  useEffect(() => {
    if (editor && mountedRef.current) {
      editor.commands.updateSelectionState(selectedNode);
    }
  }, [editor, selectedNode]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Update editor content when templateEditorContent changes
  useEffect(() => {
    if (!editor || !templateEditorContent) return;

    // Don't update content if user is actively typing
    if (editor.isFocused) return;

    const element = getOrCreateMSTeamsElement(templateEditorContent);

    const newContent = convertElementalToTiptap(
      {
        version: "2022-01-01",
        elements: [element],
      },
      { channel: "msteams" }
    );

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

export interface MSTeamsRenderProps {
  content: TiptapDoc;
  extensions: AnyExtension[];
  editable: boolean;
  autofocus: boolean;
  onUpdate: ({ editor }: { editor: Editor }) => void;
  items: { Sidebar: string[]; Editor: UniqueIdentifier[] };
  selectedNode: Node | null;
  msteamsEditor: Editor | null;
}

export interface MSTeamsProps
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
  render?: (props: MSTeamsRenderProps) => React.ReactNode;
}

export const MSTeamsConfig: TextMenuConfig = {
  contentType: { state: "hidden" },
  bold: { state: "enabled" },
  italic: { state: "enabled" },
  underline: { state: "hidden" },
  strike: { state: "hidden" },
  alignLeft: { state: "hidden" },
  alignCenter: { state: "hidden" },
  alignRight: { state: "hidden" },
  alignJustify: { state: "hidden" },
  link: { state: "hidden" },
  quote: { state: "enabled" },
  variable: { state: "enabled" },
};

const MSTeamsComponent = forwardRef<HTMLDivElement, MSTeamsProps>(
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
    const disableVariableAutocomplete = true;
    const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
    const isTemplateTransitioning = useAtomValue(isTemplateTransitioningAtom);
    const templateEditor = useAtomValue(templateEditorAtom);
    const isDragging = useAtomValue(isDraggingAtom);

    const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom);
    const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
    const setPendingAutoSave = useSetAtom(pendingAutoSaveAtom);

    const isInitialLoadRef = useRef(true);
    const isMountedRef = useRef(false);
    const isDraggingRef = useRef(isDragging);

    const [items, setItems] = useState<{ Sidebar: string[]; Editor: UniqueIdentifier[] }>({
      Sidebar: ["text", "divider"],
      Editor: [],
    });

    const rafId = useRef<number | null>(null);

    usePragmaticDnd({
      items,
      setItems,
    });

    // Function to sync editor items - extracted for reuse
    const syncEditorItems = useCallback((editor: Editor) => {
      // Cancel any pending frame request
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }

      // Use setTimeout to ensure DOM has time to fully update
      setTimeout(() => {
        rafId.current = requestAnimationFrame(() => {
          try {
            // Get the editor DOM element
            const editorDOM = editor?.view.dom;
            if (!editorDOM) {
              console.warn("syncEditorItems: Editor DOM element not found");
              return;
            }

            // Find all rendered node view wrappers - direct children only
            const nodeWrappers = editorDOM.querySelectorAll(
              ".react-renderer > div[data-node-view-wrapper][data-id]"
            );

            // Extract IDs from DOM elements
            const domIds: string[] = [];
            nodeWrappers.forEach((wrapper) => {
              const id = (wrapper as HTMLElement).dataset.id;
              if (id) {
                domIds.push(id);
              }
            });

            // Update the state with the derived IDs from the DOM
            setItems((prevItems) => ({
              Editor: domIds,
              Sidebar: prevItems.Sidebar,
            }));
          } catch (error) {
            console.error("Error syncing editor items:", error);
            setItems((prev) => ({ ...prev })); // Avoid resetting state on error
          }
        });
      }, 50); // Small delay to let DOM updates settle
    }, []);

    // Track component mount status
    useEffect(() => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
      };
    }, []);

    // Update isDraggingRef when isDragging changes
    useEffect(() => {
      isDraggingRef.current = isDragging;
    }, [isDragging]);

    // Sync items when editor updates
    useEffect(() => {
      const updateItems = () => {
        if (templateEditor) {
          syncEditorItems(templateEditor);
        }
      };

      // Listen to multiple editor events to catch all update scenarios
      templateEditor?.on("update", updateItems);
      templateEditor?.on("selectionUpdate", updateItems);
      templateEditor?.on("create", updateItems);
      templateEditor?.on("transaction", updateItems);

      // Initial call to populate items immediately if editor is ready
      if (templateEditor && !templateEditor.isDestroyed) {
        updateItems();
      }

      // Listen for node duplication events
      const handleNodeDuplicated = (_event: CustomEvent) => {
        updateItems();
      };
      document.addEventListener("node-duplicated", handleNodeDuplicated as EventListener);

      // Cleanup
      return () => {
        templateEditor?.off("update", updateItems);
        templateEditor?.off("selectionUpdate", updateItems);
        templateEditor?.off("create", updateItems);
        templateEditor?.off("transaction", updateItems);
        document.removeEventListener("node-duplicated", handleNodeDuplicated as EventListener);
        // Cancel any pending frame request on unmount
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
        }
      };
    }, [templateEditor, syncEditorItems]);

    // Watch for template loading state changes to re-sync items when content is loaded
    useEffect(() => {
      if (isTemplateLoading === false && templateEditorContent) {
        // Use a slight delay to ensure DOM is fully updated after content loading
        setTimeout(() => {
          if (templateEditor && !templateEditor.isDestroyed) {
            syncEditorItems(templateEditor);
          }
        }, 300);
      }
    }, [isTemplateLoading, templateEditorContent, templateEditor, syncEditorItems]);

    const shouldHandleClick = useCallback(() => {
      return !isDraggingRef.current;
    }, []);

    const extensions = useMemo(
      () =>
        [
          ...ExtensionKit({
            variables,
            setSelectedNode,
            shouldHandleClick,
            disableVariableAutocomplete,
          }),
        ].filter((e): e is AnyExtension => e !== undefined),
      [variables, setSelectedNode, shouldHandleClick, disableVariableAutocomplete]
    );

    const onUpdateHandler = useCallback(
      ({ editor }: { editor: Editor }) => {
        if (!editor || isTemplateTransitioning) {
          return;
        }

        // Handle new templates by creating initial structure
        if (!templateEditorContent) {
          const elemental = convertTiptapToElemental(editor.getJSON() as TiptapDoc);

          const newContent = {
            version: "2022-01-01" as const,
            elements: [
              {
                type: "channel" as const,
                channel: "msteams" as const,
                elements: elemental,
              },
            ],
          };
          setTemplateEditorContent(newContent);
          setPendingAutoSave(newContent);
          return;
        }

        // Prevent updates during rapid typing by debouncing
        const currentJson = editor.getJSON() as TiptapDoc;
        const elemental = convertTiptapToElemental(currentJson);

        const newContent = updateElemental(templateEditorContent, {
          elements: elemental,
          channel: "msteams",
        });

        // Only update if there's a meaningful difference in structure, not just content
        const currentElementalStr = JSON.stringify(templateEditorContent.elements);
        const newElementalStr = JSON.stringify(newContent.elements);

        if (currentElementalStr !== newElementalStr) {
          setTemplateEditorContent(newContent);
          setPendingAutoSave(newContent);
        }
      },
      [templateEditorContent, setTemplateEditorContent, setPendingAutoSave, isTemplateTransitioning]
    );

    const content = useMemo(() => {
      const element = getOrCreateMSTeamsElement(value);

      // At this point, element is guaranteed to be ElementalNode
      const tipTapContent = convertElementalToTiptap(
        {
          version: "2022-01-01",
          elements: [element],
        },
        { channel: "msteams" }
      );

      return tipTapContent;
    }, [value]);

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
        ref={ref}
        {...rest}
      >
        <>
          {render?.({
            content,
            extensions,
            editable: !readOnly,
            autofocus: !readOnly,
            onUpdate: onUpdateHandler,
            items,
            selectedNode,
            msteamsEditor: templateEditor,
          })}
        </>
      </MainLayout>
    );
  }
);

export const MSTeams = memo(MSTeamsComponent);
