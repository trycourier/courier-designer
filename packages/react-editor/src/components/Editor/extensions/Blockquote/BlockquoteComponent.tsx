import { cn } from "@/lib/utils";
import { NodeViewContent, type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { useCallback } from "react";
import { setSelectedNodeAtom } from "../../components/TextMenu/store";
import type { BlockquoteProps } from "./Blockquote.types";

export const BlockquoteComponent: React.FC<BlockquoteProps> = ({
  paddingHorizontal,
  paddingVertical,
  backgroundColor,
  borderLeftWidth,
  borderColor,
}) => (
  <div
    style={{
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
);

export const BlockquoteComponentNode = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);

  const handleSelect = useCallback(() => {
    const pos = props.getPos();
    const node = props.editor.state.doc.nodeAt(pos);
    if (node) {
      setSelectedNode(node);
    }
  }, [props.editor, props.getPos]);

  return (
    <NodeViewWrapper className={cn(props.node.attrs.isSelected && 'selected-element')} onClick={handleSelect}>
      <BlockquoteComponent
        {...(props.node.attrs as BlockquoteProps)}
      />
    </NodeViewWrapper>
  );
}; 