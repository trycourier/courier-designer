import { cn } from "@/lib";
import { NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { useSetAtom } from "jotai";
import { useCallback, useEffect, useReducer } from "react";
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
const cellDragListeners: Set<() => void> = new Set();

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
        <div className="courier-w-full courier-flex courier-gap-2" style={borderStyle}>
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
      <div className="courier-w-full" style={borderStyle}>
        <NodeViewContent />
      </div>
    </div>
  );
};

export const ColumnComponentNode = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);

  const handleSelect = useCallback(
    (e: React.MouseEvent) => {
      if (!props.editor.isEditable) {
        return;
      }

      // Only select the column if clicking on the wrapper itself, not nested content
      const target = e.target as HTMLElement;
      const wrapper = e.currentTarget as HTMLElement;

      // Check if click is on the column wrapper/padding area, not on cell content
      if (
        target === wrapper ||
        target.classList.contains("node-element") ||
        target
          .closest("[data-node-view-content]")
          ?.parentElement?.classList.contains("node-element")
      ) {
        e.stopPropagation();
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

  return (
    <SortableItemWrapper
      id={props.node.attrs.id}
      className={cn(props.node.attrs.isSelected && "selected-element")}
      onClick={handleSelect}
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
