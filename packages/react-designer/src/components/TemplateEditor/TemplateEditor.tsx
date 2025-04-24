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
import { BrandEditorContentAtom } from "../BrandEditor/store";
import { ElementalValue } from "../ElementalValue/ElementalValue";
import { useTemplateActions } from "../Providers";
import {
  isTenantLoadingAtom,
  templateIdAtom,
  tenantDataAtom,
  tenantEditorAtom,
  tenantIdAtom,
} from "../Providers/store";
import type { Theme } from "../ui-kit/ThemeProvider/ThemeProvider.types";
import { EditorLayout } from "../ui/EditorLayout";
import { Loader } from "../ui/Loader";
import { getTextMenuConfigForNode } from "../ui/TextMenu/config";
import { selectedNodeAtom, setNodeConfigAtom } from "../ui/TextMenu/store";
import { Editor } from "./Editor";
import { useBlockEditor } from "./Editor/useBlockEditor";
import { subjectAtom, templateEditorContentAtom } from "./store";

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
  const [tenantData, setTenantData] = useAtom(tenantDataAtom);
  const templateId = useAtomValue(templateIdAtom);
  const tenantId = useAtomValue(tenantIdAtom);
  const setEditor = useSetAtom(tenantEditorAtom);
  const [subject, setSubject] = useAtom(subjectAtom);
  const { getTenant, saveTemplate } = useTemplateActions();
  const ydoc = useMemo(() => new YDoc(), []);
  const page = useAtomValue(pageAtom);
  const mountedRef = useRef(false);
  const isResponseSetRef = useRef(false);
  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
  const setBrandEditorContent = useSetAtom(BrandEditorContentAtom);

  useEffect(() => {
    if (tenantData && (templateId !== currentTemplateId || tenantId !== currentTenantId)) {
      setTenantData(null);
      setTemplateEditorContent(null);
      setBrandEditorContent(null);
      setSubject(null);
      isResponseSetRef.current = false;
      setElementalValue(undefined);
    }
  }, [
    templateId,
    isResponseSetRef,
    tenantData,
    tenantId,
    setTemplateEditorContent,
    setSubject,
    setTenantData,
    setBrandEditorContent,
  ]);

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
    getTenant({ includeBrand: brandEditor }).finally(() => {
      pendingFetch = false;
    });
  }, [templateId, tenantId, brandEditor, getTenant, isTenantLoading]);

  // Update TextMenu configuration when selected node changes
  useEffect(() => {
    if (selectedNode) {
      const nodeName = selectedNode.type.name;
      const config = getTextMenuConfigForNode(nodeName);
      setNodeConfig({ nodeName, config });
    }
  }, [selectedNode, setNodeConfig]);

  // Memoize the editor to prevent unnecessary re-renders
  const { editor } = useBlockEditor({
    initialContent: useMemo(() => elementalValue, []), // eslint-disable-line react-hooks/exhaustive-deps
    ydoc,
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

    if (isTenantLoading === false && !content) {
      isResponseSetRef.current = true;
    }

    if (!content || !editor) {
      return;
    }

    const subject = getSubject(content);
    setSubject(subject ?? "");

    setTimeout(() => {
      editor.commands.setContent(convertElementalToTiptap(content));
    }, 0);

    setTimeout(() => {
      isResponseSetRef.current = true;
    }, 100);
  }, [
    tenantData,
    isTenantLoading,
    editor,
    setSubject,
    setElementalValue,
    setTemplateEditorContent,
  ]);

  useEffect(() => {
    if (
      !isResponseSetRef.current ||
      !templateEditorContent ||
      JSON.stringify(elementalValue) === JSON.stringify(templateEditorContent)
    ) {
      return;
    }

    setTimeout(() => {
      setElementalValue(templateEditorContent);
    }, 0);

    if (!elementalValue) {
      return;
    }

    if (onChange) {
      onChange(templateEditorContent);
    }

    if (templateEditorContent !== null) {
      handleAutoSave(templateEditorContent);
    }
  }, [elementalValue, templateEditorContent, handleAutoSave, onChange]);

  useEffect(() => {
    if (subject === null || !isResponseSetRef.current) {
      return;
    }

    const newContent = convertTiptapToElemental(editor.getJSON() as TiptapDoc, subject ?? "");
    if (JSON.stringify(templateEditorContent) !== JSON.stringify(newContent)) {
      setTemplateEditorContent(newContent);
    }
  }, [templateEditorContent, editor, subject, setTemplateEditorContent]);

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
        {isTenantLoading && (
          <div className="courier-editor-loading">
            <Loader />
          </div>
        )}
        {editor && (
          <>
            <Editor
              editor={editor}
              variables={variables}
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
