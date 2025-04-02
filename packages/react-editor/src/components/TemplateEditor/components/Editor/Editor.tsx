import { Editor as TiptapEditor } from "@tiptap/react";
import { forwardRef } from "react";
import { TemplateEditor } from "./TemplateEditor";
import { ThemeEditor } from "./ThemeEditor";
import { useAtomValue } from "jotai";
import { pageAtom } from "../../store";

export interface EditorProps {
  editor: TiptapEditor;
  handleEditorClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  isLoading?: boolean;
  isVisible?: boolean;
  isAutoSave?: boolean;
}

export const Editor = forwardRef<HTMLDivElement, EditorProps>(
  ({ editor, handleEditorClick, isLoading, isAutoSave }, ref) => {
    const page = useAtomValue(pageAtom);

    return (
      <>
        <TemplateEditor
          editor={editor}
          handleEditorClick={handleEditorClick}
          ref={ref}
          isLoading={isLoading}
          isVisible={page === "template"}
          isAutoSave={isAutoSave}
        />
        <ThemeEditor editor={editor} ref={ref} isVisible={page === "theme"} isAutoSave={isAutoSave} />
      </>
    );
  }
);
