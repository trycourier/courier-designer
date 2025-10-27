import { useCurrentEditor } from "@tiptap/react";
import { useEffect } from "react";
import type { TiptapDoc } from "@/lib/utils";
import type { ElementalNode } from "@/types/elemental.types";

export interface ReadOnlyEditorContentProps {
  value?: TiptapDoc;
  defaultValue: ElementalNode[];
}

export const ReadOnlyEditorContent = ({ value, defaultValue }: ReadOnlyEditorContentProps) => {
  const { editor } = useCurrentEditor();

  useEffect(() => {
    if (!editor) {
      return;
    }
    editor.commands.setContent(value || defaultValue);
  }, [editor, value, defaultValue]);

  return null;
};
