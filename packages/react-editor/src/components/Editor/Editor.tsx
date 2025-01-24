import { convertElementalToTiptap } from "@/lib";
import type { ElementalContent } from "@/types";
import type { Mark, Node as ProseMirrorNode } from "@tiptap/pm/model";
import { EditorContent } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Doc as YDoc } from "yjs";
import { ElementalValue } from "../ElementalValue/ElementalValue";
import { ThemeProvider } from "../ui-kit";
import type { Theme } from "../ui-kit/ThemeProvider/ThemeProvider.types";
import { SideBar } from "./components";
import { ContentItemMenu } from "./components/ContentItemMenu";
import { SideBarItemDetails } from "./components/SideBar/SideBarItemDetails";
import { TextMenu } from "./components/TextMenu";
import { useBlockEditor } from "./useBlockEditor";
import { useCourierTemplate } from "../CourierTemplateProvider";

export interface EditorProps {
  theme?: Theme | string;
  value?: ElementalContent;
  onChange?: (value: ElementalContent) => void;
  imageBlockPlaceholder?: string;
  variables?: Record<string, any>;
  autoSave?: boolean;
}

type SelectedElementInfo = {
  node: ProseMirrorNode;
  mark?: Mark;
  pendingLink?: {
    from: number;
    to: number;
  };
};

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
  const [selectedElement, setSelectedElement] = useState<SelectedElementInfo | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const isInitialLoadRef = useRef(true);
  const previousContentRef = useRef<string>();
  const pendingChangesRef = useRef<ElementalContent | null>(null);
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
    onSelectionChange: setSelectedElement,
    onElementSelect: (node) => {
      setSelectedElement(node ? { node } : undefined);
    },
    imageBlockPlaceholder,
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (selectedElement?.node) {
      try {
        const selection = editor.state.selection;
        // Check if we have a valid selection position
        if (selection.$from.pos > 0) {
          const pos = editor.state.doc.resolve(selection.$from.before()).pos;
          const node = editor.state.doc.nodeAt(pos);
          if (node && !node.attrs.isSelected) {
            editor.commands.setSelectedNode(pos);
          }
        }
      } catch (error) {
        // Silently handle any position resolution errors
        console.debug('Selection position error:', error);
      }
    } else {
      editor.commands.clearSelectedNode();
    }
  }, [editor, selectedElement]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (editor?.state.selection.$head.parent.type.name === 'paragraph' || selectedElement) {
          editor?.commands.blur();
          setTimeout(() => {
            setSelectedElement(undefined);
            if (editor) {
              editor.commands.clearSelectedNode();
            }
          }, 100);
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [editor, selectedElement]);

  // Add effect to select initial paragraph
  useEffect(() => {
    if (!editor || !isInitialLoadRef.current) {
      return;
    }

    // Find the first paragraph node
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph') {
        setSelectedElement({ node });
        editor.commands.setSelectedNode(pos);
        return false; // Stop traversing after finding first paragraph
      }
      return true;
    });
  }, [editor]);

  // Fix the issue where clicking on a paragraph's begginning/end doesn't select it
  const handleEditorClick = useCallback(() => {
    if (!editor || selectedElement) {
      return;
    }
    console.log('handleEditorClick')

    const { state } = editor;
    const { selection } = state;
    const node = selection.$head.parent;

    if (node.type.name === 'paragraph') {
      const pos = state.doc.resolve(selection.$from.before()).pos;
      setSelectedElement({ node });
      editor.commands.setSelectedNode(pos);
    }
  }, [editor, selectedElement]);

  return (
    <ThemeProvider theme={theme}>
      <div
        className="h-full rounded-sm border border-border bg-card flex flex-col text-foreground min-w-[768px]"
        data-mode="light"
      >
        {editor && <TextMenu editor={editor} />}
        <div className="flex flex-1 overflow-hidden"> {/* Added overflow-hidden */}
          <div className="flex-1 flex flex-col p-6 overflow-y-auto" ref={menuContainerRef}> {/* Added overflow-y-auto */}
            <EditorContent
              editor={editor}
              className="flex-1 bg-white rounded-lg border border-border shadow-sm max-w-2xl mx-auto w-full"
              onClick={handleEditorClick}
            />
            {editor && <ContentItemMenu editor={editor} />}
          </div>
          <div className="rounded-br-sm border-border w-64 bg-white border-l overflow-y-auto h-full"> {/* Modified to h-full */}
            <div className="p-3"> {/* Wrapped content in div with padding */}
              {selectedElement ? (
                <SideBarItemDetails
                  element={selectedElement.node}
                  editor={editor}
                  mark={selectedElement.mark}
                  pendingLink={selectedElement.pendingLink}
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
