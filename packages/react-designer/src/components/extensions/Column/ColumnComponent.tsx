import { cn } from "@/lib";
import { NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { useSetAtom } from "jotai";
import { useCallback } from "react";
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

export const ColumnComponent: React.FC<ColumnProps> = ({
  paddingHorizontal,
  paddingVertical,
  backgroundColor,
  borderWidth,
  borderRadius,
  borderColor,
}) => {
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
      <ColumnComponent {...(props.node.attrs as ColumnProps)} />
    </SortableItemWrapper>
  );
};
