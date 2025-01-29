import { convertElementalToTiptap } from "@/lib";
import type { ElementalContent } from "@/types";
import { EditorContent } from "@tiptap/react";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Doc as YDoc } from "yjs";
import { useCourierTemplate } from "../CourierTemplateProvider";
import { ElementalValue } from "../ElementalValue/ElementalValue";
import { ThemeProvider } from "../ui-kit";
import type { Theme } from "../ui-kit/ThemeProvider/ThemeProvider.types";
import { SideBar } from "./components";
import { ContentItemMenu } from "./components/ContentItemMenu";
import { SideBarItemDetails } from "./components/SideBar/SideBarItemDetails";
import { TextMenu } from "./components/TextMenu";
import { selectedNodeAtom, setSelectedNodeAtom } from "./components/TextMenu/store";
import { useBlockEditor } from "./useBlockEditor";


export interface EditorProps {
  theme?: Theme | string;
  value?: ElementalContent;
  onChange?: (value: ElementalContent) => void;
  imageBlockPlaceholder?: string;
  variables?: Record<string, any>;
  autoSave?: boolean;
}

export const Editor: React.FC<EditorProps> = ({
  theme,
  value,
  onChange,
  imageBlockPlaceholder,
  variables,
  autoSave = true,
}) => {
  const menuContainerRef = useRef(null);
  const [elementalValue, setElementalValue] = useState<ElementalContent>();
  const [isSaving, setIsSaving] = useState(false);
  const isInitialLoadRef = useRef(true);
  const previousContentRef = useRef<string>();
  const pendingChangesRef = useRef<ElementalContent | null>(null);
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);
  const selectedNode = useAtomValue(selectedNodeAtom);

  const [, saveTemplate] = useCourierTemplate();

  const ydoc = useMemo(() => new YDoc(), []);

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
      await saveTemplate(content);

      // Check if we have pending changes that occurred during the save
      if (pendingChangesRef.current) {
        const pendingContent = pendingChangesRef.current;
        pendingChangesRef.current = null;
        // Trigger save with pending changes
        handleAutoSave(pendingContent);
      }
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setIsSaving(false);
    }
  }, [autoSave, isSaving, saveTemplate]);

  const { editor } = useBlockEditor({
    ydoc,
    initialContent: value,
    variables,
    onUpdate: (value) => {
      setElementalValue(value);

      if (onChange) {
        onChange(value);
      }

      // Skip save on initial load
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        if (autoSave) {
          previousContentRef.current = JSON.stringify(value);
        }
        return;
      }

      handleAutoSave(value);
    },
    selectedNode,
    setSelectedNode,
    imageBlockPlaceholder,
  });

  useEffect(() => {
    if (editor) {
      editor.commands.updateSelectionState(selectedNode);
    }
  }, [editor, selectedNode]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selectedNode) {
        editor?.commands.blur();
        setSelectedNode(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [editor, selectedNode]);

  const handleEditorClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!editor) {
      return;
    }
    const target = event.target as HTMLElement;
    const targetPos = editor.view.posAtDOM(target, 0);
    const targetNode = editor.state.doc.resolve(targetPos).node();

    if (targetNode.type.name === 'paragraph') {
      setSelectedNode(targetNode);
    }
  }, [editor]);

  return (
    <ThemeProvider theme={theme}>
      <div
        className="h-full rounded-sm border border-border bg-card flex flex-col text-foreground min-w-[768px]"
        data-mode="light"
      >
        {editor && <TextMenu editor={editor} />}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col p-6 overflow-y-auto" ref={menuContainerRef}>
            <div className="flex-1 bg-white rounded-lg border border-border shadow-sm max-w-2xl mx-auto w-full select-none">
              <EditorContent
                editor={editor}
                onClick={handleEditorClick}
              />
              {editor && <ContentItemMenu editor={editor} />}
            </div>
          </div>
          <div className="rounded-br-sm border-border w-64 bg-white border-l overflow-y-auto h-full">
            <div className="p-3">
              {selectedNode ? (
                <SideBarItemDetails
                  element={selectedNode}
                  editor={editor}
                />
              ) : (
                <SideBar editor={editor} />
              )}
            </div>
          </div>
        </div>
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
