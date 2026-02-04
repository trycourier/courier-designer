import { cn } from "@/lib";
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useAtomValue, useSetAtom } from "jotai";
import { GripVertical } from "lucide-react";
import { isDraggingAtom } from "../../TemplateEditor/store";
import { selectedNodeAtom, setSelectedNodeAtom } from "../../ui/TextMenu/store";

// Helper to get sibling cell positions and nodes
const getSiblingCells = (editor: NodeViewProps["editor"], columnId: string) => {
  const cells: { pos: number; node: ReturnType<typeof editor.state.doc.nodeAt>; index: number }[] =
    [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "columnCell" && node.attrs.columnId === columnId) {
      cells.push({ pos, node, index: node.attrs.index });
    }
    return true;
  });
  return cells.sort((a, b) => a.index - b.index);
};

export const ColumnCellComponentNode = (props: NodeViewProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
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
      canDrop: ({ source }) => {
        const sourceDragType = (source.data as { dragType?: string })?.dragType;
        return sourceDragType !== "column";
      },
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

  // Get cell width and index
  const cellWidth = props.node.attrs.width || 50;
  const cellIndex = props.node.attrs.index || 0;
  const columnId = props.node.attrs.columnId;

  // Get Frame attributes
  const paddingHorizontal = props.node.attrs.paddingHorizontal || 0;
  const paddingVertical = props.node.attrs.paddingVertical || 0;
  const backgroundColor = props.node.attrs.backgroundColor || "transparent";

  // Get Border attributes
  const borderWidth = props.node.attrs.borderWidth || 0;
  const borderRadius = props.node.attrs.borderRadius || 0;
  const borderColor = props.node.attrs.borderColor || "transparent";

  // Get sibling cells to determine if this is the last cell and total column count
  const siblingCells = getSiblingCells(props.editor, columnId);
  const numColumns = siblingCells.length || 1;
  const isLastCell = cellIndex === numColumns - 1;

  // Gap between columns in pixels (must match ColumnRow's gap value)
  const GAP_PX = 16;
  // Calculate total gap: (numColumns - 1) gaps
  const totalGapPx = (numColumns - 1) * GAP_PX;
  // Calculate visual width using calc() to account for gaps
  // Formula: (100% - totalGap) * (cellWidth / 100)
  const visualWidth = `calc((100% - ${totalGapPx}px) * ${cellWidth / 100})`;

  // Handle resize start
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (!props.editor.isEditable || isPreviewMode) return;

      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);

      const startX = e.clientX;
      // Find the columnRow container (the flex parent that contains all cells)
      const columnRowElement = ref.current?.closest(
        '[data-type="column-row"]'
      ) as HTMLElement | null;
      if (!columnRowElement) return;

      const parentWidth = columnRowElement.getBoundingClientRect().width;
      const cells = getSiblingCells(props.editor, columnId);
      const currentCell = cells.find((c) => c.index === cellIndex);
      const nextCell = cells.find((c) => c.index === cellIndex + 1);

      if (!currentCell?.node || !nextCell?.node) return;

      const startCurrentWidth = currentCell.node.attrs.width || 50;
      const startNextWidth = nextCell.node.attrs.width || 50;

      // Track final widths for the history-enabled transaction
      let finalCurrentWidth = startCurrentWidth;
      let finalNextWidth = startNextWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaPercent = (deltaX / parentWidth) * 100;

        // Calculate new widths, ensuring minimum 10% for each cell
        let newCurrentWidth = startCurrentWidth + deltaPercent;
        let newNextWidth = startNextWidth - deltaPercent;

        // Clamp widths to minimum 10%
        if (newCurrentWidth < 10) {
          newCurrentWidth = 10;
          newNextWidth = startCurrentWidth + startNextWidth - 10;
        }
        if (newNextWidth < 10) {
          newNextWidth = 10;
          newCurrentWidth = startCurrentWidth + startNextWidth - 10;
        }

        // Store final widths
        finalCurrentWidth = newCurrentWidth;
        finalNextWidth = newNextWidth;

        // Update both cells' widths
        const tr = props.editor.state.tr;
        const updatedCells = getSiblingCells(props.editor, columnId);
        const updatedCurrentCell = updatedCells.find((c) => c.index === cellIndex);
        const updatedNextCell = updatedCells.find((c) => c.index === cellIndex + 1);

        if (updatedCurrentCell && updatedNextCell) {
          tr.setNodeMarkup(updatedCurrentCell.pos, undefined, {
            ...updatedCurrentCell.node?.attrs,
            width: newCurrentWidth,
          });
          tr.setNodeMarkup(updatedNextCell.pos, undefined, {
            ...updatedNextCell.node?.attrs,
            width: newNextWidth,
          });
          tr.setMeta("addToHistory", false); // Don't add intermediate steps to history
          props.editor.view.dispatch(tr);
        }
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        // Only add to history if widths actually changed
        if (finalCurrentWidth !== startCurrentWidth || finalNextWidth !== startNextWidth) {
          // Create a transaction that resets to start values and then sets final values
          // This ensures the change is properly recorded in history and triggers onUpdate
          const tr = props.editor.state.tr;
          const updatedCells = getSiblingCells(props.editor, columnId);
          const updatedCurrentCell = updatedCells.find((c) => c.index === cellIndex);
          const updatedNextCell = updatedCells.find((c) => c.index === cellIndex + 1);

          if (updatedCurrentCell && updatedNextCell) {
            // First reset to start widths
            tr.setNodeMarkup(updatedCurrentCell.pos, undefined, {
              ...updatedCurrentCell.node?.attrs,
              width: startCurrentWidth,
            });
            tr.setNodeMarkup(updatedNextCell.pos, undefined, {
              ...updatedNextCell.node?.attrs,
              width: startNextWidth,
            });
            // Then set to final widths - this creates a proper document change
            tr.setNodeMarkup(updatedCurrentCell.pos, undefined, {
              ...updatedCurrentCell.node?.attrs,
              width: finalCurrentWidth,
            });
            tr.setNodeMarkup(updatedNextCell.pos, undefined, {
              ...updatedNextCell.node?.attrs,
              width: finalNextWidth,
            });
            tr.setMeta("addToHistory", true);
            props.editor.view.dispatch(tr);
          }
        }
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [props.editor, columnId, cellIndex, isPreviewMode]
  );

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
      style={{
        // Use calc() to account for gaps between columns
        flex: `0 0 ${visualWidth}`,
        width: visualWidth,
        position: "relative",
        // Apply user-defined Frame styles (padding and background)
        ...(paddingHorizontal > 0 || paddingVertical > 0
          ? {
              paddingTop: `${paddingVertical}px`,
              paddingBottom: `${paddingVertical}px`,
              paddingLeft: `${paddingHorizontal}px`,
              paddingRight: `${paddingHorizontal}px`,
            }
          : {}),
        ...(backgroundColor !== "transparent" && {
          backgroundColor: backgroundColor,
        }),
        // Apply user-defined Border styles
        ...(borderWidth > 0 && {
          borderWidth: `${borderWidth}px`,
          borderStyle: "solid",
          borderColor: borderColor,
        }),
        ...(borderRadius > 0 && {
          borderRadius: `${borderRadius}px`,
        }),
      }}
      className={cn(
        "courier-flex courier-flex-col",
        // Default padding if no custom padding is set
        paddingHorizontal === 0 && paddingVertical === 0 && "courier-p-4 courier-pl-0",
        // min-height is handled by CSS in editor.css (includes sibling detection logic)
        // Only show borders when not in preview mode and no custom border is set
        !isPreviewMode && borderWidth === 0 && "courier-border",
        !isPreviewMode &&
          borderWidth === 0 &&
          (isSelected
            ? "courier-border-solid courier-border courier-border-blue-500 courier-rounded"
            : isDraggedOver
              ? "courier-border-solid courier-border-t-2 courier-border-t-blue-500 courier-border-r-transparent courier-border-b-transparent courier-border-l-transparent courier-rounded-none"
              : "courier-border-dashed courier-border-gray-300 courier-rounded"),
        // When custom border is set but in selected/draggedOver state, add visual indicator
        !isPreviewMode &&
          borderWidth > 0 &&
          isSelected &&
          "courier-ring-2 courier-ring-blue-500 courier-ring-offset-1",
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

      {/* Resize handle - positioned in the gap between columns */}
      {!isLastCell && !isPreviewMode && (
        <div
          ref={resizeHandleRef}
          onMouseDown={handleResizeStart}
          className={cn(
            "courier-absolute courier-top-0 courier-h-full courier-flex courier-items-center courier-justify-center",
            "courier-cursor-col-resize courier-z-10",
            isResizing && "courier-bg-blue-100"
          )}
          style={{
            // Position in the center of the 16px gap
            right: "-15px",
            width: "12px",
          }}
        >
          <GripVertical
            size={16}
            strokeWidth={1.5}
            className={cn(
              "courier-text-gray-400 courier-pointer-events-none",
              isResizing && "courier-text-blue-500"
            )}
          />
        </div>
      )}
    </NodeViewWrapper>
  );
};
