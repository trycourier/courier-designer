import { cn } from "@/lib/utils";
import { NodeViewContent, NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import type { BlockquoteProps } from "./Blockquote.types";

export const BlockquoteComponentNode = (props: NodeViewProps) => {
  const attrs = props.node.attrs as BlockquoteProps;
  const {
    padding,
    margin,
    backgroundColor,
    borderLeftWidth,
    borderColor,
  } = attrs;

  const isEmpty = !props.node.content.size;
  const isFirst = props.getPos() === 0;

  return (
    <NodeViewWrapper
      as="blockquote"
      className={cn(
        isEmpty && "is-empty",
        isFirst && isEmpty && "is-editor-empty",
        "blockquote-wrapper"
      )}
      data-placeholder
      style={{
        padding: `${padding}px`,
        margin: `${margin}px 0px`,
        backgroundColor,
        borderLeftWidth: `${borderLeftWidth}px`,
        borderColor,
        borderStyle: borderLeftWidth > 0 ? "solid" : "none",
        whiteSpace: "pre-wrap",
      }}
    >
      <NodeViewContent
        as="span"
        style={{
          padding: 0,
          margin: 0,
          backgroundColor: "transparent",
          border: "none",
        }}
      />
    </NodeViewWrapper>
  );
}; 