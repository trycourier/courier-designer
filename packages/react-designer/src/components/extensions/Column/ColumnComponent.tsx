import { cn } from "@/lib";
import { NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { useSetAtom } from "jotai";
import { useCallback, useEffect, useReducer, useState } from "react";
import { SortableItemWrapper } from "../../ui/SortableItemWrapper";
import { setSelectedNodeAtom } from "../../ui/TextMenu/store";
import { safeGetNodeAtPos } from "../../utils";
import type { ColumnProps } from "./Column.types";

interface CellDragState {
  columnId: string;
  cellIndex: number;
}

// Global state for cell hover (shared across all column instances)
let activeCellDragState: CellDragState | null = null;
export const cellDragListeners: Set<() => void> = new Set();

export const setActiveCellDrag = (state: CellDragState | null) => {
  activeCellDragState = state;
  cellDragListeners.forEach((listener) => listener());
};

export const getActiveCellDrag = () => activeCellDragState;

export const ColumnComponent: React.FC<ColumnProps & { node: any; columnsCount: number }> = ({
  paddingHorizontal,
  paddingVertical,
  backgroundColor,
  borderWidth,
  borderRadius,
  borderColor,
  node,
  columnsCount,
}) => {
  // Check if column is empty (no columnRow child)
  const isEmpty = !node.content || node.content.size === 0;

  // Subscribe to cell drag state changes for highlighting
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    if (isEmpty) {
      cellDragListeners.add(forceUpdate);
      return () => {
        cellDragListeners.delete(forceUpdate);
      };
    }
  }, [isEmpty]);

  const activeCellState = getActiveCellDrag();

  // Calculate border styles
  const borderStyle = {
    borderWidth: `${borderWidth}px`,
    borderStyle: borderWidth > 0 ? "solid" : "none",
    borderColor: borderColor,
    borderRadius: `${borderRadius}px`,
  };

  // Calculate frame (padding) styles
  const frameStyle = {
    padding: `${paddingVertical}px ${paddingHorizontal}px`,
    backgroundColor: backgroundColor,
  };

  if (isEmpty) {
    // Render visual placeholder cells - these look like cells but aren't actual nodes yet
    // Need to get the column ID from the node attrs
    const columnId = (node as any).attrs?.id || "";

    return (
      <div className="courier-w-full node-element" style={frameStyle}>
        {/* Add padding to create clickable area around cells for Column selection */}
        <div className="courier-w-full courier-flex courier-gap-2 courier-p-2" style={borderStyle}>
          {Array.from({ length: columnsCount }).map((_, index) => {
            const isActiveCell =
              activeCellState?.columnId === columnId && activeCellState?.cellIndex === index;

            return (
              <div
                key={index}
                data-placeholder-cell="true"
                data-column-cell="true"
                data-column-id={columnId}
                data-cell-index={index}
                onClick={(e) => {
                  // Stop propagation to prevent selecting Column when clicking inside cell
                  e.stopPropagation();
                }}
                className={cn(
                  "courier-flex-1 courier-min-h-[120px] courier-flex courier-flex-col courier-p-4 courier-border courier-items-center courier-justify-center courier-text-center courier-text-sm courier-text-gray-400",
                  isActiveCell
                    ? "courier-border-solid courier-border-t-2 courier-border-t-blue-500 courier-border-r-transparent courier-border-b-transparent courier-border-l-transparent courier-rounded-none"
                    : "courier-border-dashed courier-border-gray-300 courier-rounded"
                )}
              >
                <span className="courier-pointer-events-none">Drag and drop content blocks</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="courier-w-full node-element" style={frameStyle}>
      {/* Add padding to create clickable area around cells for Column selection */}
      <div className="courier-w-full courier-p-2" style={borderStyle}>
        <NodeViewContent />
      </div>
    </div>
  );
};

export const ColumnComponentNode = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);
  const [isHoveringEdgeZone, setIsHoveringEdgeZone] = useState(false);

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

      // Check if we're clicking on any part of the Column's visual structure
      const shouldSelectColumn =
        isWrapper ||
        isNodeElement ||
        isPaddingArea ||
        isFlexContainer ||
        isDraggableItem ||
        target
          .closest("[data-node-view-content]")
          ?.parentElement?.classList.contains("node-element");

      if (shouldSelectColumn) {
        // Stop propagation and prevent default IMMEDIATELY to block editor's default selection
        e.stopPropagation();
        e.preventDefault();

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
      data-node-type="column"
    >
      <ColumnComponent
        {...(props.node.attrs as ColumnProps)}
        node={props.node}
        columnsCount={props.node.attrs.columnsCount || 2}
      />
    </SortableItemWrapper>
  );
};
