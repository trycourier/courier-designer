import { cn } from "@/lib";
import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { useCallback } from "react";
import { setSelectedNodeAtom } from "../../components/TextMenu/store";
import type { DividerProps } from "./Divider.types";

export const DividerComponent: React.FC<
  DividerProps & {
    nodeKey?: string;
    selected?: boolean;
    draggable?: boolean;
  }
> = ({ margin, color, width, radius }) => (
  <hr
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
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);

  const handleSelect = useCallback(() => {
    const pos = props.getPos();
    const node = props.editor.state.doc.nodeAt(pos);
    if (node) {
      props.editor.commands.blur()
      setSelectedNode(node);
    }
  }, [props.editor, props.getPos]);

  return (
    <NodeViewWrapper className={cn(props.node.attrs.isSelected && 'selected-element')} onClick={handleSelect}>
      <DividerComponent {...(props.node.attrs as DividerProps)} />
    </NodeViewWrapper>
  );
};
