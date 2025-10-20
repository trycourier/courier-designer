import { cn } from "@/lib";
import { type NodeViewProps } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { useCallback } from "react";
import { SortableItemWrapper } from "../../ui/SortableItemWrapper";
import { setSelectedNodeAtom } from "../../ui/TextMenu/store";
import { safeGetNodeAtPos } from "../../utils";
import type { ColumnProps } from "./Column.types";

export const ColumnComponent: React.FC<ColumnProps> = ({
  columnsCount,
  paddingHorizontal,
  paddingVertical,
  backgroundColor,
  borderWidth,
  borderRadius,
  borderColor,
}) => {
  // Create array of columns based on count
  const columns = Array.from({ length: columnsCount }, (_, i) => i);

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
      <div className="courier-flex courier-gap-2 courier-w-full" style={borderStyle}>
        {columns.map((index) => (
          <div
            key={index}
            className="courier-flex-1 courier-min-h-[120px] courier-border courier-border-dashed courier-border-gray-300 courier-rounded courier-flex courier-text-center courier-items-center courier-justify-center courier-text-sm courier-p-4"
          >
            Drag and drop content blocks
          </div>
        ))}
      </div>
    </div>
  );
};

export const ColumnComponentNode = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);

  const handleSelect = useCallback(() => {
    if (!props.editor.isEditable) {
      return;
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
  }, [props, setSelectedNode]);

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
