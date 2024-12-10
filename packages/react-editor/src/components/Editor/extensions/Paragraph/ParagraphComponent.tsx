import { cn } from "@/lib/utils";
import { NodeViewContent, NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import type { ParagraphProps } from "./Paragraph.types";

export const ParagraphComponentNode = (props: NodeViewProps) => {
  const attrs = props.node.attrs as ParagraphProps;
  const {
    padding,
    margin,
    backgroundColor,
    borderWidth,
    borderRadius,
    borderColor,
    textAlign,
  } = attrs;

  const isEmpty = !props.node.content.size;
  const isFirst = props.getPos() === 0;

  return (
    <NodeViewWrapper
      as="p"
      className={cn(
        isEmpty && "is-empty",
        isFirst && isEmpty && "is-editor-empty"
      )}
      data-placeholder
      style={{
        padding: `${padding}px`,
        margin: `${margin}px 0px`,
        backgroundColor,
        borderWidth: `${borderWidth}px`,
        borderRadius: `${borderRadius}px`,
        borderColor,
        borderStyle: borderWidth > 0 ? "solid" : "none",
        whiteSpace: "pre-wrap",
        textAlign,
      }}
    >
      <NodeViewContent as="span" />
    </NodeViewWrapper>
  );
};
