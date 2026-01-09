import { cn } from "@/lib";
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useAtomValue, useSetAtom } from "jotai";
import { isDraggingAtom } from "../../TemplateEditor/store";
import { selectedNodeAtom, setSelectedNodeAtom } from "../../ui/TextMenu/store";

export const ColumnCellComponentNode = (props: NodeViewProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const isDragging = useAtomValue(isDraggingAtom);
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);
  const selectedNode = useAtomValue(selectedNodeAtom);

  // Check isEditorMode flag to determine if we should show placeholder
  const isEditorMode = props.node.attrs.isEditorMode === true;
  // Track editor's editable state
  const [isEditable, setIsEditable] = useState(props.editor.isEditable);

  // Check if this cell is selected
  const isSelected =
    selectedNode?.type?.name === "columnCell" &&
    selectedNode?.attrs?.columnId === props.node.attrs.columnId &&
    selectedNode?.attrs?.index === props.node.attrs.index;

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

  // Handle click on border area to select this cell
  const handleBorderClick = useCallback(
    (e: React.MouseEvent) => {
      if (!props.editor.isEditable) return;

      const target = e.target as HTMLElement;
      const wrapper = ref.current;
      if (!wrapper) return;

      // Get the click position relative to the wrapper
      const rect = wrapper.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Define the border clickable area (5px from edges)
      const borderSize = 5;
      const isNearLeftBorder = x <= borderSize;
      const isNearRightBorder = x >= rect.width - borderSize;
      const isNearTopBorder = y <= borderSize;
      const isNearBottomBorder = y >= rect.height - borderSize;

      // Check if click is on border area OR on the wrapper itself (not inside content)
      const isOnBorder =
        isNearLeftBorder || isNearRightBorder || isNearTopBorder || isNearBottomBorder;
      const isOnWrapper = target === wrapper || target.hasAttribute("data-cell-placeholder");

      if (isOnBorder || isOnWrapper) {
        e.stopPropagation();
        setSelectedNode(props.node);
      }
    },
    [props.editor.isEditable, props.node, setSelectedNode]
  );

  return (
    <NodeViewWrapper
      ref={ref}
      data-column-cell="true"
      data-column-id={props.node.attrs.columnId}
      data-cell-index={props.node.attrs.index}
      data-editor-mode={isEditorMode ? "true" : "false"}
      onClick={handleBorderClick}
      className={cn(
        "courier-flex-1 courier-flex courier-flex-col courier-p-4 courier-pl-0 courier-w-full",
        // min-height is handled by CSS in editor.css (includes sibling detection logic)
        // Only show borders when not in preview mode
        !isPreviewMode && "courier-border",
        !isPreviewMode &&
          (isSelected
            ? "courier-border-solid courier-border courier-border-blue-500 courier-rounded"
            : isDraggedOver
              ? "courier-border-solid courier-border-t-2 courier-border-t-blue-500 courier-border-r-transparent courier-border-b-transparent courier-border-l-transparent courier-rounded-none"
              : "courier-border-dashed courier-border-gray-300 courier-rounded"),
        showPlaceholder &&
          "courier-items-center courier-justify-center courier-text-center courier-text-sm courier-text-gray-400"
      )}
    >
      {showPlaceholder && (
        <span data-cell-placeholder="true" className="courier-pointer-events-none courier-pl-4">
          Drag and drop content blocks
        </span>
      )}
      <NodeViewContent className="courier-flex courier-flex-col courier-gap-2 courier-w-full" />
    </NodeViewWrapper>
  );
};
