import { cn } from "@/lib";
import { NodeViewContent, type NodeViewProps } from "@tiptap/react";
import type { Node } from "@tiptap/pm/model";
import { useSetAtom, useAtomValue } from "jotai";
import { useCallback, useEffect, useState, useRef } from "react";
import { SortableItemWrapper } from "../../ui/SortableItemWrapper";
import { setSelectedNodeAtom } from "../../ui/TextMenu/store";
import { safeGetNodeAtPos } from "../../utils";
import type { ColumnProps } from "./Column.types";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { isDraggingAtom } from "../../TemplateEditor/store";

const PlaceholderCell = ({
  columnId,
  index,
  isPreviewMode,
}: {
  columnId: string;
  index: number;
  isPreviewMode: boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    return dropTargetForElements({
      element,
      getData: () => ({
        type: "column-cell",
        columnId,
        index,
        isEmpty: true,
      }),
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: () => setIsDraggedOver(false),
    });
  }, [columnId, index]);

  return (
    <div
      ref={ref}
      data-placeholder-cell="true"
      data-column-cell="true"
      data-column-id={columnId}
      data-cell-index={index}
      onClick={(e) => {
        // Stop propagation to prevent selecting Column when clicking inside cell
        e.stopPropagation();
      }}
      className={cn(
        "courier-flex-1 courier-min-h-[120px] courier-flex courier-flex-col courier-p-4",
        // Hide borders and placeholder in preview mode
        !isPreviewMode && "courier-border",
        !isPreviewMode &&
          (isDraggedOver
            ? "courier-border-solid courier-border-t-2 courier-border-t-blue-500 courier-border-r-transparent courier-border-b-transparent courier-border-l-transparent courier-rounded-none"
            : "courier-border-dashed courier-border-gray-300 courier-rounded"),
        !isPreviewMode &&
          "courier-items-center courier-justify-center courier-text-center courier-text-sm courier-text-gray-400"
      )}
    >
      {!isPreviewMode && (
        <span className="courier-pointer-events-none">Drag and drop content blocks</span>
      )}
    </div>
  );
};

export const ColumnComponent: React.FC<
  ColumnProps & { node: Node; columnsCount: number; isPreviewMode?: boolean }
> = ({
  paddingHorizontal,
  paddingVertical,
  backgroundColor,
  borderWidth,
  borderRadius,
  borderColor,
  node,
  columnsCount,
  isPreviewMode = false,
}) => {
  // Check if column is empty (no columnRow child)
  const isEmpty = !node.content || node.content.size === 0;

  // Combined styles: border on outside, then padding + background inside
  const containerStyle = {
    // Border (on outside)
    borderWidth: borderWidth > 0 ? `${borderWidth}px` : undefined,
    borderStyle: borderWidth > 0 ? ("solid" as const) : undefined,
    borderColor: borderWidth > 0 ? borderColor : undefined,
    borderRadius: borderRadius > 0 ? `${borderRadius}px` : undefined,
    // Frame (padding + background)
    padding: `${paddingVertical}px ${paddingHorizontal}px`,
    backgroundColor: backgroundColor !== "transparent" ? backgroundColor : undefined,
  };

  if (isEmpty) {
    // Render visual placeholder cells - these look like cells but aren't actual nodes yet
    // Need to get the column ID from the node attrs
    const columnId = node.attrs?.id || "";

    return (
      <div className="courier-w-full node-element" style={containerStyle}>
        {/* Inner container for flex layout with gap */}
        <div className="courier-w-full courier-flex courier-gap-2 courier-p-2">
          {Array.from({ length: columnsCount }).map((_, index) => (
            <PlaceholderCell
              key={index}
              columnId={columnId}
              index={index}
              isPreviewMode={isPreviewMode}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="courier-w-full node-element" style={containerStyle}>
      {/* Inner container for clickable area around cells */}
      <div className="courier-w-full courier-p-2">
        <NodeViewContent />
      </div>
    </div>
  );
};

export const ColumnComponentNode = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);
  const isDragging = useAtomValue(isDraggingAtom);
  const [isHoveringEdgeZone, setIsHoveringEdgeZone] = useState(false);
  // Track editor's editable state
  const [isEditable, setIsEditable] = useState(props.editor.isEditable);

  // Re-render when editor's editable state changes
  useEffect(() => {
    const handleUpdate = () => {
      setIsEditable(props.editor.isEditable);
    };

    // Listen to multiple events to catch editable state changes
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

  const handleSelect = useCallback(
    (e: React.MouseEvent) => {
      if (!props.editor.isEditable) {
        return;
      }

      // Only select the column if clicking on the wrapper itself, not nested content
      const target = e.target as HTMLElement;
      const wrapper = e.currentTarget as HTMLElement;

      // Check if click is anywhere on the column wrapper or its visual elements
      // We want to select the Column unless clicking directly inside cell content
      const isWrapper = target === wrapper;
      const isNodeElement = target.classList.contains("node-element");
      const isPaddingArea = target.classList.contains("courier-p-2");
      const isFlexContainer = target.classList.contains("courier-gap-2");
      const isDraggableItem = target.classList.contains("draggable-item");
      const isDragHandle =
        target.hasAttribute("data-drag-handle") || target.closest("[data-drag-handle]") !== null;

      // Check if we're clicking on any part of the Column's visual structure
      const shouldSelectColumn =
        isWrapper ||
        isNodeElement ||
        isPaddingArea ||
        isFlexContainer ||
        isDraggableItem ||
        isDragHandle ||
        target
          .closest("[data-node-view-content]")
          ?.parentElement?.classList.contains("node-element");

      if (shouldSelectColumn) {
        // Stop propagation to block editor's default selection
        e.stopPropagation();
        // Only prevent default if NOT clicking on drag handle (handle needs default for dnd-kit)
        if (!isDragHandle) {
          e.preventDefault();
        }

        const node = safeGetNodeAtPos(props);
        if (node) {
          props.editor.commands.blur();
          const nodeId = node.attrs.id;
          props.editor.state.doc.descendants((currentNode) => {
            if (currentNode.type.name === "column" && currentNode.attrs.id === nodeId) {
              setSelectedNode(currentNode);
              return false; // Stop traversal
            }
            return true; // Continue traversal
          });
        }
      }
    },
    [props, setSelectedNode]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const wrapper = e.currentTarget as HTMLElement;

    // Check if hovering over a cell or any content inside a cell
    const isOverCell = target.closest("[data-column-cell]") !== null;

    // If NOT over a cell, we're in the Column's padding/border area - show hover
    if (!isOverCell) {
      setIsHoveringEdgeZone(true);
      return;
    }

    // If over a cell, check if we're near the edges
    const rect = wrapper.getBoundingClientRect();
    const mouseY = e.clientY;
    const EDGE_MARGIN = 30; // pixels from top/bottom edge

    const isInEdgeZone = mouseY <= rect.top + EDGE_MARGIN || mouseY >= rect.bottom - EDGE_MARGIN;

    setIsHoveringEdgeZone(isInEdgeZone);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHoveringEdgeZone(false);
  }, []);

  return (
    <SortableItemWrapper
      id={props.node.attrs.id}
      className={cn(
        props.node.attrs.isSelected && "selected-element",
        isHoveringEdgeZone && "hover-edge-zone"
      )}
      onMouseDown={handleSelect}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      editor={props.editor}
      getPos={props.getPos}
      data-node-type="column"
    >
      <ColumnComponent
        {...(props.node.attrs as ColumnProps)}
        node={props.node}
        columnsCount={props.node.attrs.columnsCount || 2}
        isPreviewMode={isPreviewMode}
      />
    </SortableItemWrapper>
  );
};
