import { useAutoSave } from "@/hooks/useAutoSave";
import { convertElementalToTiptap, convertTiptapToElemental } from "@/lib";
import type { ElementalContent } from "@/types/elemental.types";
import type { TiptapDoc } from "@/lib/utils/convertTiptapToElemental/convertTiptapToElemental";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Doc as YDoc } from "yjs";
import { pageAtom } from "../../store";
import type { BrandEditorProps } from "../BrandEditor";
import { Editor as BrandEditorInternal } from "../BrandEditor/Editor";
import { ElementalValue } from "../ElementalValue/ElementalValue";
import { useTemplateActions } from "../Providers";
import {
  isTemplateLoadingAtom,
  templateDataAtom,
  templateEditorAtom,
  templateIdAtom,
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

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
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
  const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
  const selectedNode = useAtomValue(selectedNodeAtom);
  const setSelectedNode = useSetAtom(selectedNodeAtom);
  const setNodeConfig = useSetAtom(setNodeConfigAtom);
  const templateData = useAtomValue(templateDataAtom);
  const templateId = useAtomValue(templateIdAtom);
  const setTemplateData = useSetAtom(templateDataAtom);
  const setEditor = useSetAtom(templateEditorAtom);
  const [subject, setSubject] = useAtom(subjectAtom);
  const { getTemplate, saveTemplate } = useTemplateActions();
  const ydoc = useMemo(() => new YDoc(), []);
  const page = useAtomValue(pageAtom);
  const mountedRef = useRef(false);
  const isDataSetRef = useRef(false);
  const dataSetRef = useRef<NodeJS.Timeout | null>(null);
  const previousTemplateIdRef = useRef<string | null>(null);

  const { handleAutoSave } = useAutoSave({
    onSave: saveTemplate,
    debounceMs: autoSaveDebounce,
    enabled: isTemplateLoading !== null && autoSave,
    onError: () => toast.error("Error saving template"),
  });

  useEffect(() => {
    if (templateId && previousTemplateIdRef.current !== templateId && isTemplateLoading !== true) {
      previousTemplateIdRef.current = templateId;
      isDataSetRef.current = false;
      getTemplate(templateId);
    }
  }, [templateId, isTemplateLoading, previousTemplateIdRef, isDataSetRef, getTemplate]);

  // Reset subject when templateId changes
  useEffect(() => {
    if (templateId) {
      console.log("useEffect templateId", templateId);
      setSubject("");
    }
  }, [templateId, setSubject]);

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
      if (!mountedRef.current) return;

      setElementalValue(value);

      if (onChange) {
        onChange(value);
      }

      const content = templateData?.data?.tenant?.notification?.data?.content;

      if (
        (content && JSON.stringify(content) !== JSON.stringify(value)) ||
        templateData?.data?.tenant?.notification === null
      ) {
        setTemplateData({
          ...templateData,
          data: {
            ...templateData?.data,
            tenant: {
              ...templateData?.data?.tenant,
              notification: {
                ...templateData?.data?.tenant?.notification,
                data: { ...templateData?.data?.tenant?.notification?.data, content: value },
              },
            },
          },
        });

        // Only call handleAutoSave if we're not in the initial loading state
        if (isDataSetRef.current) {
          handleAutoSave(value);
        }
      }
    },
    [handleAutoSave, mountedRef, onChange, templateData, setTemplateData, isDataSetRef]
  );

  const { editor } = useBlockEditor({
    initialContent: elementalValue,
    ydoc,
    onUpdate: handleUpdate,
    variables,
    setSelectedNode,
    subject,
    onDestroy: () => {
      console.log("onDestroy");
      isDataSetRef.current = false;
      previousTemplateIdRef.current = null;
      setSubject("");
    },
  });

  useEffect(() => {
    // Force an update when subject changes
    const emailChannel = templateData?.data?.tenant?.notification?.data?.content?.elements?.find(
      (el) => el.type === "channel" && el.channel === "email"
    );
    let currentSubject = "";
    if (emailChannel && "elements" in emailChannel && emailChannel.elements) {
      const metaNode = emailChannel.elements.find((el) => el.type === "meta");
      if (metaNode && "title" in metaNode && typeof metaNode.title === "string") {
        currentSubject = metaNode.title;
      }
    }
    if (editor && currentSubject !== subject) {
      handleUpdate(convertTiptapToElemental(editor?.getJSON() as TiptapDoc, subject));
    }
  }, [
    subject,
    editor,
    handleUpdate,
    isDataSetRef,
    templateData?.data?.tenant?.notification?.data?.content?.elements,
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
    const content = templateData?.data?.tenant?.notification?.data?.content;

    // if (content && editor && !isInitialLoadRef.current) {
    console.log("content", content);
    if (content && editor && !isDataSetRef.current && isTemplateLoading !== true) {
      if (dataSetRef.current) {
        clearTimeout(dataSetRef.current);
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

        // Get subject from the channel node
        const channelNode = content.elements.find(
          (el) => el.type === "channel" && el.channel === "email"
        );

        if (channelNode && "elements" in channelNode && channelNode.elements) {
          const subjectNode = channelNode.elements.find((el) => el.type === "meta");

          if (subjectNode && "title" in subjectNode && typeof subjectNode.title === "string") {
            setSubject(subjectNode.title);
          }
        }

        // Wait until next tick to ensure all editor updates are processed
        // before marking initial load as complete
        setTimeout(() => {
          isDataSetRef.current = true;
        }, 300);
      }, 0);
    }
    return () => {
      if (dataSetRef.current) {
        clearTimeout(dataSetRef.current);
        console.log("clearTimeout");
      }
    };
  }, [editor, templateData, isDataSetRef, isTemplateLoading, setEditor, setSubject]);

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
      mountedRef.current = false;
    };
  }, []);

  return (
    <>
      <EditorLayout theme={theme}>
        {/* {isTemplateLoading && isInitialLoadRef.current && ( */}
        {isTemplateLoading && (
          <div className="courier-editor-loading">
            <Loader />
          </div>
        )}
        {editor && (
          <>
            <Editor
              editor={editor}
              handleEditorClick={handleEditorClick}
              // isLoading={Boolean(isTemplateLoading) && isInitialLoadRef.current}
              isLoading={Boolean(isTemplateLoading)}
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
        Ver: 0.0.5
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
