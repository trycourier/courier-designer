import { useAutoSave } from "@/hooks/useAutoSave";
import type { TiptapDoc } from "@/lib";
import { convertElementalToTiptap, convertTiptapToElemental } from "@/lib";
import type { ElementalContent } from "@/types/elemental.types";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Doc as YDoc } from "yjs";
import { pageAtom } from "../../store";
import type { BrandEditorProps } from "../BrandEditor";
import { Editor as BrandEditorInternal } from "../BrandEditor/Editor";
import { ElementalValue } from "../ElementalValue/ElementalValue";
import { useTemplateActions } from "../Providers";
import {
  isTenantLoadingAtom,
  isTenantSavingAtom,
  isTemplateEditorSetAtom,
  tenantDataAtom,
  tenantEditorAtom,
  templateIdAtom,
  tenantIdAtom,
} from "../Providers/store";
import type { Theme } from "../ui-kit/ThemeProvider/ThemeProvider.types";
import { EditorLayout } from "../ui/EditorLayout";
import { Loader } from "../ui/Loader";
import { getTextMenuConfigForNode } from "../ui/TextMenu/config";
import { selectedNodeAtom, setNodeConfigAtom } from "../ui/TextMenu/store";
import { Editor } from "./Editor";
import { useBlockEditor } from "./Editor/useBlockEditor";
import { subjectAtom } from "./store";

export interface TemplateEditorProps {
  theme?: Theme | string;
  value?: ElementalContent;
  onChange?: (value: ElementalContent) => void;
  variables?: Record<string, unknown>;
  hidePublish?: boolean;
  autoSave?: boolean;
  autoSaveDebounce?: number;
  brandEditor?: boolean;
  brandProps?: BrandEditorProps;
}

// Track the current tenant and pending fetches globally
let currentTemplateId: string | null = null;
let currentTenantId: string | null = null;
let pendingFetch = false;

const getSubject = (content: ElementalContent) => {
  const channelNode = content.elements.find(
    (el) => el.type === "channel" && el.channel === "email"
  );

  if (channelNode && "elements" in channelNode && channelNode.elements) {
    const subjectNode = channelNode.elements.find((el) => el.type === "meta");

    if (subjectNode && "title" in subjectNode && typeof subjectNode.title === "string") {
      return subjectNode.title;
    }
  }
  return null;
};

const TemplateEditorComponent: React.FC<TemplateEditorProps> = ({
  theme,
  value,
  onChange,
  variables,
  hidePublish = false,
  autoSave = true,
  autoSaveDebounce = 200,
  brandEditor = false,
  brandProps,
}) => {
  const [elementalValue, setElementalValue] = useState<ElementalContent | undefined>(value);
  const isTenantLoading = useAtomValue(isTenantLoadingAtom);
  const selectedNode = useAtomValue(selectedNodeAtom);
  const setSelectedNode = useSetAtom(selectedNodeAtom);
  const setNodeConfig = useSetAtom(setNodeConfigAtom);
  const tenantData = useAtomValue(tenantDataAtom);
  const templateId = useAtomValue(templateIdAtom);
  const tenantId = useAtomValue(tenantIdAtom);
  const setTenantData = useSetAtom(tenantDataAtom);
  const setIsTenantSaving = useSetAtom(isTenantSavingAtom);
  const setEditor = useSetAtom(tenantEditorAtom);
  const [subject, setSubject] = useAtom(subjectAtom);
  const [isTemplateEditorSet, setIsTemplateEditorSet] = useAtom(isTemplateEditorSetAtom);
  const { getTenant, saveTemplate } = useTemplateActions();
  const ydoc = useMemo(() => new YDoc(), []);
  const page = useAtomValue(pageAtom);
  const mountedRef = useRef(false);
  const dataSetRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (templateId !== currentTemplateId || tenantId !== currentTenantId) {
      setIsTemplateEditorSet(false);
      setSubject(null);
    }
  }, [templateId, tenantId, setIsTemplateEditorSet, setSubject]);

  const { handleAutoSave } = useAutoSave({
    onSave: saveTemplate,
    debounceMs: autoSaveDebounce,
    enabled: isTenantLoading !== null && autoSave,
    onError: () => toast.error("Error saving template"),
  });

  // Simple effect with only the essential logic
  useEffect(() => {
    // Skip if no tenant or already loading
    if (!templateId || !tenantId || isTenantLoading || pendingFetch) {
      return;
    }

    // Skip if tenant hasn't changed
    if (templateId === currentTemplateId && tenantId === currentTenantId) {
      return;
    }

    // Tenant has changed - update and fetch
    currentTemplateId = templateId;
    currentTenantId = tenantId;
    pendingFetch = true;

    // Make the API call
    getTenant().finally(() => {
      pendingFetch = false;
    });
  }, [templateId, tenantId, getTenant, isTenantLoading]);

  // Update TextMenu configuration when selected node changes
  useEffect(() => {
    if (selectedNode) {
      const nodeName = selectedNode.type.name;
      const config = getTextMenuConfigForNode(nodeName);
      setNodeConfig({ nodeName, config });
    }
  }, [selectedNode, setNodeConfig]);

  const handleUpdate = useCallback(
    (value: ElementalContent) => {
      if (!mountedRef.current) {
        return;
      }

      // Add check to prevent unnecessary state updates
      if (JSON.stringify(elementalValue) === JSON.stringify(value)) {
        return;
      }

      setElementalValue(value);

      if (onChange) {
        onChange(value);
      }

      const notification = tenantData?.data?.tenant?.notification;
      const content = notification?.data?.content;

      if (content && JSON.stringify(content) !== JSON.stringify(value)) {
        // Only call handleAutoSave if we're not in the initial loading state
        if (isTemplateEditorSet && notification?.notificationId === currentTemplateId) {
          handleAutoSave(value);
        }
      }
    },
    [
      handleAutoSave,
      mountedRef,
      onChange,
      tenantData,
      // setTenantData,
      isTemplateEditorSet,
      elementalValue,
    ]
  );

  // Memoize the editor to prevent unnecessary re-renders
  const { editor } = useBlockEditor({
    initialContent: useMemo(() => elementalValue, []), // eslint-disable-line react-hooks/exhaustive-deps
    ydoc,
    onUpdate: handleUpdate,
    variables,
    setSelectedNode,
    subject,
    // onDestroy: () => {
    //   // currentTemplateId = null;
    //   // setIsTemplateEditorSet(false);
    //   // setSubject("");
    // },
  });

  useEffect(() => {
    const content = tenantData?.data?.tenant?.notification?.data?.content;
    const currentSubject = content ? getSubject(content) : null;

    if (
      content &&
      editor &&
      subject !== null &&
      currentTemplateId === templateId &&
      currentTenantId === tenantId &&
      currentSubject !== subject
    ) {
      const channelNode = tenantData?.data?.tenant?.notification?.data?.content?.elements.find(
        (el) => el.type === "channel" && el.channel === "email"
      );

      if (
        tenantData?.data?.tenant?.notification?.data?.content &&
        channelNode &&
        "elements" in channelNode &&
        channelNode.elements
      ) {
        const subjectNode = channelNode.elements.find((el) => el.type === "meta");
        const subjectNodeIndex = channelNode.elements.findIndex((el) => el.type === "meta");

        if (subjectNode && "title" in subjectNode && typeof subjectNode.title === "string") {
          // Create a deep copy of the content structure
          const newContent = {
            ...tenantData.data.tenant.notification.data.content,
            elements: [...tenantData.data.tenant.notification.data.content.elements],
          };

          // Find the channel element index
          const channelIndex = newContent.elements.findIndex(
            (el) => el.type === "channel" && el.channel === "email"
          );

          if (channelIndex !== -1) {
            const channel = newContent.elements[channelIndex];
            // Type guard to ensure channel has elements property
            if ("elements" in channel && Array.isArray(channel.elements)) {
              // Create a new channel element with the updated meta
              const newChannel = {
                ...channel,
                elements: [...channel.elements],
              };

              // Update the meta title - use type assertion to avoid TypeScript errors
              if (subjectNodeIndex !== -1) {
                newChannel.elements[subjectNodeIndex] = {
                  ...newChannel.elements[subjectNodeIndex],
                  title: subject,
                } as any; // Type assertion to avoid type errors

                // Replace the channel in the content
                newContent.elements[channelIndex] = newChannel as any; // Type assertion to avoid type errors

                // Update tenant data with the new content
                setTenantData({
                  ...tenantData,
                  data: {
                    ...tenantData.data,
                    tenant: {
                      ...tenantData.data.tenant,
                      notification: {
                        ...tenantData.data.tenant.notification,
                        data: {
                          ...tenantData.data.tenant.notification.data,
                          content: newContent,
                        },
                      },
                    },
                  },
                });
              }
            }
          }
        }
      }

      handleUpdate(convertTiptapToElemental(editor?.getJSON() as TiptapDoc, subject));
    }
  }, [
    editor,
    tenantData,
    subject,
    isTemplateEditorSet,
    setTenantData,
    handleUpdate,
    templateId,
    tenantId,
  ]);

  useEffect(() => {
    if (editor) {
      setEditor(editor);
    }
  }, [editor, setEditor]);

  useEffect(() => {
    if (editor && mountedRef.current) {
      editor.commands.updateSelectionState(selectedNode);
    }
  }, [editor, selectedNode]);

  useEffect(() => {
    const notification = tenantData?.data?.tenant?.notification;
    const content = notification?.data?.content;

    if (
      content &&
      editor &&
      (!isTemplateEditorSet || !mountedRef.current) &&
      isTenantLoading !== true &&
      notification?.notificationId === currentTemplateId
    ) {
      if (dataSetRef.current) {
        clearTimeout(dataSetRef.current);
      }

      // Get subject from the channel node
      const subject = getSubject(content);
      if (subject) {
        setSubject(subject);
      }

      dataSetRef.current = setTimeout(() => {
        // Convert the content directly, our convertElementalToTiptap function now handles the channel structure
        const convertedContent = content ? convertElementalToTiptap(content) : null;

        // Use view.dispatch directly to ensure update event is triggered
        const transaction = editor.state.tr.replaceWith(
          0,
          editor.state.doc.content.size,
          editor.state.schema.nodeFromJSON(convertedContent)
        );

        editor.view.dispatch(transaction);
        setElementalValue(content);
        setEditor(editor);

        setIsTemplateEditorSet(true);
      }, 0);
    }
    return () => {
      if (dataSetRef.current) {
        clearTimeout(dataSetRef.current);
      }
    };
  }, [
    editor,
    tenantData,
    isTenantLoading,
    templateId,
    isTemplateEditorSet,
    mountedRef,
    setEditor,
    setSubject,
    setIsTemplateEditorSet,
  ]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedNode(null);
        editor?.commands.blur();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [editor, setSelectedNode]);

  const handleEditorClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!editor || !mountedRef.current || !editor.isEditable) {
        return;
      }

      const target = event.target as HTMLElement;
      const targetPos = editor.view.posAtDOM(target, 0);
      const targetNode = editor.state.doc.resolve(targetPos).node();

      if (targetNode.type.name === "paragraph") {
        setSelectedNode(targetNode);
      }
    },
    [editor, setSelectedNode]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      setIsTemplateEditorSet(false);
      setIsTenantSaving(null);
      mountedRef.current = false;
    };
  }, [setIsTemplateEditorSet, setIsTenantSaving]);

  return (
    <>
      <EditorLayout theme={theme}>
        {isTenantLoading && (
          <div className="courier-editor-loading">
            <Loader />
          </div>
        )}
        {editor && (
          <>
            <Editor
              editor={editor}
              handleEditorClick={handleEditorClick}
              isLoading={Boolean(isTenantLoading)}
              isVisible={page === "template"}
              hidePublish={hidePublish}
              brandEditor={brandEditor}
            />
            {brandEditor && (
              <BrandEditorInternal
                hidePublish={hidePublish}
                autoSave={autoSave}
                isVisible={page === "brand"}
                templateEditor
                variables={variables}
                {...brandProps}
              />
            )}
          </>
        )}
      </EditorLayout>
      <div className="courier-mt-12 courier-w-full">
        Ver: 0.0.20
        <div className="courier-flex courier-gap-4 courier-w-full courier-h-[300px]">
          <textarea
            className="courier-flex-1 courier-rounded-lg courier-border courier-border-border courier-shadow-sm courier-p-4 courier-h-full"
            readOnly
            value={elementalValue ? JSON.stringify(elementalValue, null, 2) : ""}
          />
          <div className="courier-flex courier-flex-col courier-w-1/2">
            <ElementalValue
              value={elementalValue}
              onChange={(value, isValid) => {
                if (isValid) {
                  try {
                    const parsedValue = JSON.parse(value);
                    setElementalValue(parsedValue);
                    if (editor) {
                      editor.commands.setContent(convertElementalToTiptap(parsedValue));
                    }
                  } catch (e) {
                    console.error("Invalid JSON format", e);
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export const TemplateEditor = memo(TemplateEditorComponent);
