import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import React, { useCallback } from "react";
import type { DividerProps } from "./Divider.types";

export const DividerComponent: React.FC<
  DividerProps & {
    nodeKey?: string;
    selected?: boolean;
    draggable?: boolean;
    onSelect?: () => void;
    onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  }
> = ({ margin, color, width, radius, draggable, onSelect, onDragStart }) => (
  <hr
    draggable={draggable}
    onDragStart={onDragStart}
    onClick={onSelect}
    style={{
      marginTop: `${margin}px`,
      marginBottom: `${margin}px`,
      backgroundColor: color,
      height: `${width}px`,
      borderRadius: `${radius}px`,
      border: "none",
    }}
  />
);

export const DividerComponentNode = (props: NodeViewProps) => {
  const handleSelect = useCallback(() => {
    const pos = props.getPos();
    if (typeof pos === "number") {
      props.editor.commands.setNodeSelection(pos);
    }
  }, [props.editor, props.getPos]);

  return (
    <NodeViewWrapper>
      <DividerComponent
        {...(props.node.attrs as DividerProps)}
        onSelect={handleSelect}
      />
    </NodeViewWrapper>
  );
};
