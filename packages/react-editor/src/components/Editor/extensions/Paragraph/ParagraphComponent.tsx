import { cn } from "@/lib/utils";
import { NodeViewContent, type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import type { MouseEvent } from "react";
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
    textColor,
  } = attrs;

  const isEmpty = !props.node.content.size;
  const isFirst = props.getPos() === 0;

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      const span = e.currentTarget.querySelector('[data-node-view-content]');
      if (span instanceof HTMLElement) {
        e.preventDefault();
        span.focus();
        if (window.getSelection()?.isCollapsed) {
          const range = document.createRange();
          range.setStart(span, 0);
          range.collapse(true);
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      }
    }
  };

  return (
    <NodeViewWrapper
      as="p"
      className={cn(
        isEmpty && "is-empty",
        isFirst && isEmpty && "is-editor-empty",
        "cursor-text"
      )}
      data-placeholder
      onClick={handleClick}
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
        color: textColor,
        pointerEvents: "none",
      }}
    >
      <NodeViewContent
        as="span"
        style={{
          display: "block",
          outline: "none",
          pointerEvents: "auto",
        }}
      />
    </NodeViewWrapper>
  );
};
