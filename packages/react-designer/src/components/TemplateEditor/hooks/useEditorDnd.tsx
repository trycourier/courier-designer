import type { Editor } from "@tiptap/react";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useState } from "react";
import { templateEditorAtom, isDraggingAtom } from "../store";

type UniqueIdentifier = string | number;

interface UseEditorDndProps {
  items: { Sidebar: string[]; Editor: UniqueIdentifier[] };
  setItems: React.Dispatch<React.SetStateAction<{ Sidebar: string[]; Editor: UniqueIdentifier[] }>>;
  editor?: Editor | null;
}

export const useEditorDnd = ({ setItems, editor }: UseEditorDndProps) => {
  const [lastPlaceholderIndex] = useState<number | null>(null);
  const [activeDragType] = useState<string | null>(null);
  const [activeId] = useState<UniqueIdentifier | null>(null);

  const templateEditor = useAtomValue(templateEditorAtom);
  const setIsDragging = useSetAtom(isDraggingAtom);

  const activeEditor = editor || templateEditor;

  const cleanupPlaceholder = useCallback(() => {
    activeEditor?.commands.removeDragPlaceholder();
    setItems((prev) => ({
      ...prev,
      Editor: prev.Editor.filter((id) => !id.toString().includes("_temp")),
    }));
  }, [activeEditor?.commands, setItems]);

  // Placeholder - drag and drop now handled by pragmatic-drag-and-drop in SortableItemWrapper
  const onDragStartHandler = useCallback(() => {
    // Drag start handled by individual draggable components
  }, []);

  const onDragEndHandler = useCallback(() => {
    // Drag end handled by individual draggable components
    cleanupPlaceholder();
  }, [cleanupPlaceholder]);

  const onDragMoveHandler = useCallback(() => {
    // Drag move handled by individual draggable components
  }, []);

  const onDragCancelHandler = useCallback(() => {
    cleanupPlaceholder();
    setIsDragging(false);
  }, [cleanupPlaceholder, setIsDragging]);

  return {
    activeId,
    activeDragType,
    onDragStartHandler,
    onDragEndHandler,
    onDragMoveHandler,
    onDragCancelHandler,
    lastPlaceholderIndex,
    cleanupPlaceholder,
    sensors: undefined, // No longer needed with pragmatic-drag-and-drop
    measuringProps: undefined, // No longer needed
    collisionDetectionStrategy: undefined, // No longer needed
  };
};
