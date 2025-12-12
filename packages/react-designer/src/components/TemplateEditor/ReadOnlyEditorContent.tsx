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

    // Defer setContent to avoid flushSync during React rendering
    // TipTap's setContent uses flushSync internally which can't be called during lifecycle methods
    const timeoutId = setTimeout(() => {
      editor.commands.setContent(value || defaultValue);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [editor, value, defaultValue]);

  return null;
};
