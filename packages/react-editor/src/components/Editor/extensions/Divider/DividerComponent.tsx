import { cn } from "@/lib";
import { type NodeViewProps } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { useCallback } from "react";
import { SortableItemWrapper } from "../../components/SortableItemWrapper";
import { setSelectedNodeAtom } from "../../components/TextMenu/store";
import type { DividerProps } from "./Divider.types";

export const DividerComponent: React.FC<
  DividerProps & {
    nodeKey?: string;
    selected?: boolean;
    draggable?: boolean;
  }
> = ({ margin, color, width, radius }) => (
  <div className="w-full node-element">
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
  </div>
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
    <SortableItemWrapper id={props.node.attrs.id} className={cn(props.node.attrs.isSelected && 'selected-element')} onClick={handleSelect} editor={props.editor}>
      <DividerComponent {...(props.node.attrs as DividerProps)} />
    </SortableItemWrapper>
  );
};
