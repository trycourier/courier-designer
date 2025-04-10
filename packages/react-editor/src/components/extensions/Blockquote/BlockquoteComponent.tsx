import { SortableItemWrapper } from "@/components/ui/SortableItemWrapper";
import { cn } from "@/lib";
import { NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { useCallback } from "react";
import { setSelectedNodeAtom } from "../../ui/TextMenu/store";
import type { BlockquoteProps } from "./Blockquote.types";

export const BlockquoteComponent: React.FC<BlockquoteProps> = ({
  paddingHorizontal,
  paddingVertical,
  backgroundColor,
  borderLeftWidth,
  borderColor,
}) => (
  <div className="courier-w-full node-element">
    <div
      style={{
        zIndex: -15,
        position: "relative",
        padding: `${paddingVertical}px ${paddingHorizontal}px`,
        backgroundColor,
        borderLeftWidth: `${borderLeftWidth}px`,
        borderColor,
        borderStyle: borderLeftWidth > 0 ? "solid" : "none",
        whiteSpace: "pre-wrap",
      }}
    >
      <NodeViewContent />
    </div>
  </div>
);

export const BlockquoteComponentNode = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);

  const handleSelect = useCallback(() => {
    if (!props.editor.isEditable) {
      return;
    }

    const pos = props.getPos();
    const node = props.editor.state.doc.nodeAt(pos);
    if (node) {
      setSelectedNode(node);
    }
  }, [props, setSelectedNode]);

  const isEmpty = !props.node.content || props.node.content.size === 0;

  return (
    <SortableItemWrapper
      id={props.node.attrs.id}
      className={cn(props.node.attrs.isSelected && "selected-element", isEmpty && "is-empty")}
      onClick={handleSelect}
      editor={props.editor}
    >
      <BlockquoteComponent {...(props.node.attrs as BlockquoteProps)} />
    </SortableItemWrapper>
  );
};
