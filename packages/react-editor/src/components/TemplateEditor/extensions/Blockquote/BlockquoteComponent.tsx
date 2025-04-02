import { cn } from "@/lib/utils";
import { NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { useCallback } from "react";
import { setSelectedNodeAtom } from "../../components/TextMenu/store";
import type { BlockquoteProps } from "./Blockquote.types";
import { SortableItemWrapper } from "../../components/SortableItemWrapper";

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
  }, [props.editor, props.getPos]);

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
