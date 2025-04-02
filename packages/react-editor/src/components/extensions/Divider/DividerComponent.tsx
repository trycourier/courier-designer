import { cn } from "@/lib";
import { type NodeViewProps } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { useCallback } from "react";
import { SortableItemWrapper } from "../../ui/SortableItemWrapper";
import { setSelectedNodeAtom } from "../../ui/TextMenu/store";
import type { DividerProps } from "./Divider.types";

export const DividerComponent: React.FC<
  DividerProps & {
    nodeKey?: string;
    selected?: boolean;
    draggable?: boolean;
  }
> = ({ padding, color, size, radius, variant = "divider" }) => (
  <div className="courier-w-full node-element">
    <hr
      style={{
        marginTop: `${padding}px`,
        marginBottom: `${padding}px`,
        backgroundColor: variant === "spacer" ? "transparent" : color,
        height: `${size}px`,
        borderRadius: `${radius}px`,
        border: "none",
      }}
      data-variant={variant}
    />
  </div>
);

export const DividerComponentNode = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);

  const handleSelect = useCallback(() => {
    if (!props.editor.isEditable) {
      return;
    }

    const pos = props.getPos();
    const node = props.editor.state.doc.nodeAt(pos);
    if (node) {
      props.editor.commands.blur();
      setSelectedNode(node);
    }
  }, [props.editor, props.getPos]);

  return (
    <SortableItemWrapper
      id={props.node.attrs.id}
      className={cn(props.node.attrs.isSelected && "selected-element")}
      onClick={handleSelect}
      editor={props.editor}
    >
      <DividerComponent {...(props.node.attrs as DividerProps)} />
    </SortableItemWrapper>
  );
};
