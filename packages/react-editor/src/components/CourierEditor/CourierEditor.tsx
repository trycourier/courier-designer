import { convertElementalToTiptap, convertTiptapToElemental } from "@/lib";
import type { ElementalContent, TiptapDoc } from "@/types";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Doc as YDoc } from "yjs";
import { useCourierTemplate } from "../CourierTemplateProvider";
import {
  isTemplateLoadingAtom,
  templateDataAtom,
  templateEditorAtom,
} from "../CourierTemplateProvider/store";
import { ElementalValue } from "../ElementalValue/ElementalValue";
import { ThemeProvider } from "../ui-kit";
import type { Theme } from "../ui-kit/ThemeProvider/ThemeProvider.types";
import { Editor } from "./components/Editor";
import { Loader } from "./components/Loader";
import { getTextMenuConfigForNode } from "./components/TextMenu/config";
import { selectedNodeAtom, setNodeConfigAtom } from "./components/TextMenu/store";
import { subjectAtom } from "./store";
import { useBlockEditor } from "../CourierEditor/components/Editor/TemplateEditor/useBlockEditor";
import { toast, Toaster } from "sonner";

export interface EditorProps {
  theme?: Theme | string;
  value?: ElementalContent;
  onChange?: (value: ElementalContent) => void;
  variables?: Record<string, any>;
  autoSave?: boolean;
  autoSaveDebounce?: number;
}

export const CourierEditor: React.FC<EditorProps> = ({
  theme,
  value,
  onChange,
  variables,
  autoSave = true,
  autoSaveDebounce = 200,
}) => {
  const menuContainerRef = useRef(null);
  const [elementalValue, setElementalValue] = useState<ElementalContent | undefined>(value);
  const [isSaving, setIsSaving] = useState(false);
  const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
  const isInitialLoadRef = useRef(true);
  const previousContentRef = useRef<string>();
  const pendingChangesRef = useRef<ElementalContent | null>(null);
  const selectedNode = useAtomValue(selectedNodeAtom);
  const setSelectedNode = useSetAtom(selectedNodeAtom);
  const setNodeConfig = useSetAtom(setNodeConfigAtom);
  const mountedRef = useRef(false);
  const templateData = useAtomValue(templateDataAtom);
  const setEditor = useSetAtom(templateEditorAtom);
  const [subject, setSubject] = useAtom(subjectAtom);
  const { saveTemplate } = useCourierTemplate();
  const lastSaveTimestampRef = useRef<number>(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  const ydoc = useMemo(() => new YDoc(), []);

  // Update TextMenu configuration when selected node changes
  useEffect(() => {
    if (selectedNode) {
      const nodeName = selectedNode.type.name;
      const config = getTextMenuConfigForNode(nodeName);
      setNodeConfig({ nodeName, config });
    }
  }, [selectedNode, setNodeConfig]);

  const handleAutoSave = useCallback(
    async (content: ElementalContent) => {
      if (!autoSave) return;

      // Store or update the pending content immediately
      pendingChangesRef.current = content;

      // If there's already a save in progress or we're within debounce period, return
      // The pending content will be handled after current save/timeout completes
      if (isSaving || debounceTimeoutRef.current) {
        return;
      }

      const processPendingContent = async () => {
        // Get and clear pending content
        const contentToSave = pendingChangesRef.current;
        pendingChangesRef.current = null;

        if (!contentToSave) return;

        try {
          const contentString = JSON.stringify(contentToSave);
          // Don't save if content hasn't changed
          if (contentString === previousContentRef.current) {
            return;
          }

          setIsSaving(true);
          previousContentRef.current = contentString;
          lastSaveTimestampRef.current = Date.now();
          await saveTemplate();
        } catch (error) {
          toast.error("Error saving template");
        } finally {
          setIsSaving(false);

          // After save completes, if we have new pending changes, start the cycle again
          if (pendingChangesRef.current) {
            const now = Date.now();
            const timeSinceLastSave = now - lastSaveTimestampRef.current;
            const delay = Math.max(0, autoSaveDebounce - timeSinceLastSave);

            debounceTimeoutRef.current = setTimeout(() => {
              debounceTimeoutRef.current = undefined;
              handleAutoSave(pendingChangesRef.current!);
            }, delay);
          }
        }
      };

      // Initial save: wait for debounce period
      debounceTimeoutRef.current = setTimeout(() => {
        debounceTimeoutRef.current = undefined;
        processPendingContent();
      }, autoSaveDebounce);
    },
    [autoSave, isSaving, saveTemplate]
  );

  const handleUpdate = useCallback(
    (value: ElementalContent) => {
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
    [handleAutoSave, subject, mountedRef, onChange, autoSave]
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
    if (editor && !isInitialLoadRef.current) {
      handleUpdate(convertTiptapToElemental(editor?.getJSON() as TiptapDoc, subject));
    }
  }, [subject, editor, handleUpdate, isInitialLoadRef]);

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
        // Convert the content directly, our convertElementalToTiptap function now handles the channel structure
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

        // Get subject from the channel node
        const channelNode = content.elements.find(
          (el: { type: string; channel?: string }) =>
            el.type === "channel" && el.channel === "email"
        );
        const subjectNode = channelNode.elements.find((el: { type: string }) => el.type === "meta");
        if (subjectNode?.title) {
          setSubject(subjectNode.title);
        }
      }, 0);
    }
  }, [editor, templateData, setEditor, setSubject]);

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
