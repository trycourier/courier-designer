import { Editor as TiptapEditor } from "@tiptap/react";
import { forwardRef, useState } from "react";
import { TemplateEditor } from "./TemplateEditor";
import { ThemeEditor } from "./ThemeEditor";
export interface EditorProps {
  editor: TiptapEditor;
  handleEditorClick: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export const Editor = forwardRef<HTMLDivElement, EditorProps>(({ editor, handleEditorClick }, ref) => {
  const [page, setPage] = useState<"template" | "theme">("template");

  return page === "template" ? (
    <TemplateEditor editor={editor} handleEditorClick={handleEditorClick} ref={ref} />
  ) : (
    <ThemeEditor />
  );
});
