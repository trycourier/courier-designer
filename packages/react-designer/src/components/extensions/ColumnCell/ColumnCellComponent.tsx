import { cn } from "@/lib";
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { useEffect, useReducer, useState } from "react";
import { getActiveCellDrag, cellDragListeners } from "../Column/ColumnComponent";

export const ColumnCellComponentNode = (props: NodeViewProps) => {
  // Check isEditorMode flag to determine if we should show placeholder
  const isEditorMode = props.node.attrs.isEditorMode === true;
  // Track editor's editable state
  const [isEditable, setIsEditable] = useState(props.editor.isEditable);

  // Subscribe to cell drag state changes
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    // Subscribe to the global cell drag listeners
    cellDragListeners.add(forceUpdate);
    return () => {
      cellDragListeners.delete(forceUpdate);
    };
  }, []);

  // Re-render when editor's editable state changes
  useEffect(() => {
    const handleUpdate = () => {
      setIsEditable(props.editor.isEditable);
    };

    // Also check on every update
    props.editor.on("update", handleUpdate);
    props.editor.on("transaction", handleUpdate);
    props.editor.on("selectionUpdate", handleUpdate);

    return () => {
      props.editor.off("update", handleUpdate);
      props.editor.off("transaction", handleUpdate);
      props.editor.off("selectionUpdate", handleUpdate);
    };
  }, [props.editor]);

  const isPreviewMode = !isEditable;

  const activeCellState = getActiveCellDrag();
  const isActiveCell =
    activeCellState?.columnId === props.node.attrs.columnId &&
    activeCellState?.cellIndex === props.node.attrs.index;

  // Hide placeholder and borders in preview mode
  const showPlaceholder = !isEditorMode && !isPreviewMode;

  return (
    <NodeViewWrapper
      data-column-cell="true"
      data-column-id={props.node.attrs.columnId}
      data-cell-index={props.node.attrs.index}
      className={cn(
        "courier-flex-1 courier-min-h-[120px] courier-flex courier-flex-col courier-p-4 courier-w-full",
        // Only show borders when not in preview mode
        !isPreviewMode && "courier-border",
        !isPreviewMode &&
          (isActiveCell
            ? "courier-border-solid courier-border-t-2 courier-border-t-blue-500 courier-border-r-transparent courier-border-b-transparent courier-border-l-transparent courier-rounded-none"
            : "courier-border-dashed courier-border-gray-300 courier-rounded"),
        showPlaceholder &&
          "courier-items-center courier-justify-center courier-text-center courier-text-sm courier-text-gray-400"
      )}
    >
      {showPlaceholder && (
        <span className="courier-pointer-events-none">Drag and drop content blocks</span>
      )}
      <NodeViewContent className="courier-flex courier-flex-col courier-gap-2 courier-w-full" />
    </NodeViewWrapper>
  );
};
