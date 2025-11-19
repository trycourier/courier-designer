import { cn } from "@/lib";
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useAtomValue } from "jotai";
import { isDraggingAtom } from "../../TemplateEditor/store";

export const ColumnCellComponentNode = (props: NodeViewProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const isDragging = useAtomValue(isDraggingAtom);

  // Check isEditorMode flag to determine if we should show placeholder
  const isEditorMode = props.node.attrs.isEditorMode === true;
  // Track editor's editable state
  const [isEditable, setIsEditable] = useState(props.editor.isEditable);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    return dropTargetForElements({
      element,
      getData: () => ({
        type: "column-cell",
        columnId: props.node.attrs.columnId,
        index: props.node.attrs.index,
      }),
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: () => setIsDraggedOver(false),
    });
  }, [props.node.attrs.columnId, props.node.attrs.index]);

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

  // When dragging, we want to show placeholders even if editor is disabled
  const isPreviewMode = !isEditable && !isDragging;

  // Hide placeholder and borders in preview mode
  const showPlaceholder = !isEditorMode && !isPreviewMode;

  return (
    <NodeViewWrapper
      ref={ref}
      data-column-cell="true"
      data-column-id={props.node.attrs.columnId}
      data-cell-index={props.node.attrs.index}
      className={cn(
        "courier-flex-1 courier-min-h-[120px] courier-flex courier-flex-col courier-p-4 courier-pl-0 courier-w-full",
        // Only show borders when not in preview mode
        !isPreviewMode && "courier-border",
        !isPreviewMode &&
          (isDraggedOver
            ? "courier-border-solid courier-border-t-2 courier-border-t-blue-500 courier-border-r-transparent courier-border-b-transparent courier-border-l-transparent courier-rounded-none"
            : "courier-border-dashed courier-border-gray-300 courier-rounded"),
        showPlaceholder &&
          "courier-items-center courier-justify-center courier-text-center courier-text-sm courier-text-gray-400"
      )}
    >
      {showPlaceholder && (
        <span className="courier-pointer-events-none courier-pl-4">
          Drag and drop content blocks
        </span>
      )}
      <NodeViewContent className="courier-flex courier-flex-col courier-gap-2 courier-w-full" />
    </NodeViewWrapper>
  );
};
