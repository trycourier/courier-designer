import { useAutoSave } from "@/hooks/useAutoSave";
import { convertElementalToTiptap, convertTiptapToElemental } from "@/lib";
import type { ElementalContent, TiptapDoc } from "@/types";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import { Doc as YDoc } from "yjs";
import { useTemplateActions } from "../EditorProvider";
import {
  isTemplateLoadingAtom,
  templateDataAtom,
  templateEditorAtom,
} from "../EditorProvider/store";
import { ElementalValue } from "../ElementalValue/ElementalValue";
import { ThemeProvider } from "../ui-kit";
import type { Theme } from "../ui-kit/ThemeProvider/ThemeProvider.types";
import { Editor } from "./Editor";
import { useBlockEditor } from "./Editor/TemplateEditor/useBlockEditor";
import { Loader } from "../ui/Loader";
import { getTextMenuConfigForNode } from "../ui/TextMenu/config";
import { selectedNodeAtom, setNodeConfigAtom } from "../ui/TextMenu/store";
import { subjectAtom } from "./store";

export interface TemplateEditorProps {
  theme?: Theme | string;
  value?: ElementalContent;
  onChange?: (value: ElementalContent) => void;
  variables?: Record<string, any>;
  autoSave?: boolean;
  autoSaveDebounce?: number;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  theme,
  value,
  onChange,
  variables,
  autoSave = true,
  autoSaveDebounce = 200,
}) => {
  const menuContainerRef = useRef(null);
  const [elementalValue, setElementalValue] = useState<ElementalContent | undefined>(value);
  const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
  const isInitialLoadRef = useRef(true);
  const selectedNode = useAtomValue(selectedNodeAtom);
  const setSelectedNode = useSetAtom(selectedNodeAtom);
  const setNodeConfig = useSetAtom(setNodeConfigAtom);
  const mountedRef = useRef(false);
  const templateData = useAtomValue(templateDataAtom);
  const setTemplateData = useSetAtom(templateDataAtom);
  const setEditor = useSetAtom(templateEditorAtom);
  const [subject, setSubject] = useAtom(subjectAtom);
  const { saveTemplate } = useTemplateActions();
  const ydoc = useMemo(() => new YDoc(), []);

  const { handleAutoSave } = useAutoSave({
    onSave: saveTemplate,
    debounceMs: autoSaveDebounce,
    enabled: autoSave,
    onError: () => toast.error("Error saving template"),
  });

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

      if (content && JSON.stringify(content) !== JSON.stringify(value)) {
        setTemplateData({
          ...templateData,
          data: {
            ...templateData?.data,
            tenant: { ...templateData?.data?.tenant, notification: { ...templateData?.data?.tenant?.notification, data: { ...templateData?.data?.tenant?.notification?.data, content: value } } }
          }
        })

        // Always call handleAutoSave - it will handle initial load internally
        handleAutoSave(value);
      }
    },
    [handleAutoSave, mountedRef, onChange]
  );

  const { editor } = useBlockEditor({
    initialContent: elementalValue,
    ydoc,
    onUpdate: handleUpdate,
    variables,
    setSelectedNode,
    subject,
  });

  useEffect(() => {
    // Force an update when subject changes
    const emailChannel = templateData?.data?.tenant?.notification?.data?.content?.elements?.find((el: any) => el.type === 'channel' && el.channel === 'email');
    const currentSubject = emailChannel?.elements?.find((el: any) => el.type === 'meta')?.title ?? '';
    if (editor && !isInitialLoadRef.current && currentSubject !== subject) {
      handleUpdate(convertTiptapToElemental(editor?.getJSON() as TiptapDoc, subject));
    }
  }, [subject, editor, handleUpdate, isInitialLoadRef]);

  // Remove the isInitialLoadRef timeout effect since it's now handled in useAutoSave
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

    if (content && editor && isInitialLoadRef.current) {
      setTimeout(() => {
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
          (el: { type: string; channel?: string }) =>
            el.type === "channel" && el.channel === "email"
        );
        const subjectNode = channelNode.elements.find((el: { type: string }) => el.type === "meta");
        if (subjectNode?.title) {
          setSubject(subjectNode.title);
        }

        isInitialLoadRef.current = false;
      }, 0);
    }
  }, [editor, templateData, setEditor, setSubject, isInitialLoadRef]);

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
  }, [editor, selectedNode]);

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
    [editor]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <div
        className="courier-relative courier-h-full courier-rounded-sm courier-border courier-border-border courier-bg-card courier-flex courier-flex-col courier-text-foreground courier-min-w-[812px] courier-overflow-hidden"
        data-mode="light"
      >
        <Toaster
          position="top-center"
          expand
          visibleToasts={2}
          style={{ position: "absolute", top: "10px", left: "50%", transform: "translateX(-50%)" }}
        />
        {isTemplateLoading && isInitialLoadRef.current && (
          <div className="courier-editor-loading">
            <Loader />
          </div>
        )}
        {editor && (
          <Editor
            isAutoSave={autoSave}
            isLoading={isTemplateLoading && isInitialLoadRef.current}
            editor={editor}
            handleEditorClick={handleEditorClick}
            ref={menuContainerRef}
          />
        )}
      </div>
      <div className="courier-mt-12 courier-w-full">
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
    </ThemeProvider>
  );
};
