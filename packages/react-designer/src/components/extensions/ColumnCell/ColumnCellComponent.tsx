import { cn } from "@/lib";
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { useEffect, useReducer } from "react";
import { getActiveCellDrag, cellDragListeners } from "../Column/ColumnComponent";

export const ColumnCellComponentNode = (props: NodeViewProps) => {
  const isEmpty = !props.node.content || props.node.content.size === 0;

  // Subscribe to cell drag state changes
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    // Subscribe to the global cell drag listeners
    cellDragListeners.add(forceUpdate);
    return () => {
      cellDragListeners.delete(forceUpdate);
    };
  }, []);

  const activeCellState = getActiveCellDrag();
  const isActiveCell =
    activeCellState?.columnId === props.node.attrs.columnId &&
    activeCellState?.cellIndex === props.node.attrs.index;

  return (
    <NodeViewWrapper
      data-column-cell="true"
      data-column-id={props.node.attrs.columnId}
      data-cell-index={props.node.attrs.index}
      className={cn(
        "courier-flex-1 courier-min-h-[120px] courier-flex courier-flex-col courier-p-4 courier-border courier-w-full",
        isActiveCell
          ? "courier-border-solid courier-border-t-2 courier-border-t-blue-500 courier-border-r-transparent courier-border-b-transparent courier-border-l-transparent courier-rounded-none"
          : "courier-border-dashed courier-border-gray-300 courier-rounded",
        isEmpty &&
          "courier-items-center courier-justify-center courier-text-center courier-text-sm courier-text-gray-400"
      )}
    >
      {isEmpty && <span className="courier-pointer-events-none">Drag and drop content blocks</span>}
      <NodeViewContent className="courier-flex courier-flex-col courier-gap-2 courier-w-full" />
    </NodeViewWrapper>
  );
};
