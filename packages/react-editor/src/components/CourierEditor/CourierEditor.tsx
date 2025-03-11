import { convertElementalToTiptap } from "@/lib";
import type { ElementalContent } from "@/types";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Doc as YDoc } from "yjs";
import { useCourierTemplate } from "../CourierTemplateProvider";
import { isTemplateLoadingAtom, templateDataAtom, templateEditorAtom } from "../CourierTemplateProvider/store";
import { ElementalValue } from "../ElementalValue/ElementalValue";
import { ThemeProvider } from "../ui-kit";
import type { Theme } from "../ui-kit/ThemeProvider/ThemeProvider.types";
import { Editor } from "./components/Editor";
import { Loader } from "./components/Loader";
import { TextMenu } from "./components/TextMenu";
import { getTextMenuConfigForNode } from "./components/TextMenu/config";
import { selectedNodeAtom, setNodeConfigAtom } from "./components/TextMenu/store";
import { useBlockEditor } from "./useBlockEditor";
import { toast, Toaster } from "sonner";

export interface EditorProps {
  theme?: Theme | string;
  value?: ElementalContent;
  onChange?: (value: ElementalContent) => void;
  variables?: Record<string, any>;
  autoSave?: boolean;
}

export const CourierEditor: React.FC<EditorProps> = ({
  theme,
  value,
  onChange,
  variables,
  autoSave = true,
}) => {
  const menuContainerRef = useRef(null);
  const [elementalValue, setElementalValue] = useState<ElementalContent>();
  const [isSaving, setIsSaving] = useState(false);
  const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
  const isInitialLoadRef = useRef(true);
  const previousContentRef = useRef<string>();
  const pendingChangesRef = useRef<ElementalContent | null>(null);
  const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom);
  const setNodeConfig = useSetAtom(setNodeConfigAtom);
  const mountedRef = useRef(false);
  const templateData = useAtomValue(templateDataAtom);
  const setEditor = useSetAtom(templateEditorAtom);

  const { saveTemplate } = useCourierTemplate();

  const ydoc = useMemo(() => new YDoc(), []);

  // Update TextMenu configuration when selected node changes
  useEffect(() => {
    if (selectedNode) {
      const nodeName = selectedNode.type.name;
      const config = getTextMenuConfigForNode(nodeName);
      setNodeConfig({ nodeName, config });
    }
  }, [selectedNode, setNodeConfig]);

  const handleAutoSave = useCallback(async (content: ElementalContent) => {
    if (!autoSave) return;

    if (isSaving) {
      // Store the latest changes to be saved after current save completes
      pendingChangesRef.current = content;
      return;
    }

    try {
      const contentString = JSON.stringify(content);
      // Don't save if content hasn't changed
      if (contentString === previousContentRef.current) {
        return;
      }

      setIsSaving(true);
      previousContentRef.current = contentString;
      // await saveTemplate(content);
      await saveTemplate();

      // Check if we have pending changes that occurred during the save
      if (pendingChangesRef.current) {
        const pendingContent = pendingChangesRef.current;
        pendingChangesRef.current = null;
        // Trigger save with pending changes
        handleAutoSave(pendingContent);
      }
    } catch (error) {
      toast.error("Error saving template");
    } finally {
      setIsSaving(false);
    }
  }, [autoSave, isSaving, saveTemplate]);

  const { editor } = useBlockEditor({
    ydoc,
    initialContent: value,
    variables,
    onUpdate: (value) => {
      if (!mountedRef.current) return;

      setElementalValue(value);

      if (onChange) {
        onChange(value);
      }

      // Skip save on initial load
      if (isInitialLoadRef.current) {
        if (autoSave) {
          previousContentRef.current = JSON.stringify(value);
        }
        return;
      }

      handleAutoSave(value);
    },
    selectedNode,
    setSelectedNode,
  });

  // Set isInitialLoadRef to false after the first content update
  useEffect(() => {
    if (editor && isInitialLoadRef.current) {
      const timeout = setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 1000); // Give enough time for the initial content to be loaded
      return () => clearTimeout(timeout);
    }
  }, [editor]);

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
    if (content && editor) {
      setTimeout(() => {
        // console.log("Update ----", convertElementalToTiptap(content));
        const convertedContent = convertElementalToTiptap(content);

        // Use view.dispatch directly to ensure update event is triggered
        const transaction = editor.state.tr.replaceWith(
          0,
          editor.state.doc.content.size,
          editor.state.schema.nodeFromJSON(convertedContent)
        );

        editor.view.dispatch(transaction);
        setElementalValue(content);
        setEditor(editor);
      }, 0);
    }
  }, [editor, templateData, setEditor]);

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

  const handleEditorClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!editor || !mountedRef.current || !editor.isEditable) {
      return;
    }

    const target = event.target as HTMLElement;
    const targetPos = editor.view.posAtDOM(target, 0);
    const targetNode = editor.state.doc.resolve(targetPos).node();

    if (targetNode.type.name === 'paragraph') {
      setSelectedNode(targetNode);
    }
  }, [editor]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <div
        className="relative h-full rounded-sm border border-border bg-card flex flex-col text-foreground min-w-[768px] overflow-hidden"
        data-mode="light"
      >
        <Toaster
          position="top-center"
          expand
          visibleToasts={2}
          style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)' }}
        />
        {(isTemplateLoading && isInitialLoadRef.current) && (
          <div className="editor-loading"><Loader /></div>
        )}
        {editor && (
          <>
            {!isInitialLoadRef.current && <TextMenu editor={editor} />}
            <Editor
              editor={editor}
              handleEditorClick={handleEditorClick}
              ref={menuContainerRef}
            />
          </>
        )}
      </div>
      <div className="mt-12 w-full">
        <div className="flex gap-4 w-full h-[300px]">
          <textarea
            className="flex-1 rounded-lg border border-border shadow-sm p-4 h-full"
            readOnly
            value={
              elementalValue
                ? JSON.stringify(
                  convertElementalToTiptap(elementalValue),
                  null,
                  2
                )
                : ""
            }
          />
          <div className="flex flex-col w-1/2">
            <ElementalValue
              value={elementalValue}
              onChange={(value, isValid) => {
                if (isValid) {
                  try {
                    const parsedValue = JSON.parse(value);
                    setElementalValue(parsedValue);
                    if (editor) {
                      editor.commands.setContent(
                        convertElementalToTiptap(parsedValue)
                      );
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
