import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";

export const ColumnRowComponentNode = (_props: NodeViewProps) => {
  return (
    <NodeViewWrapper
      className="courier-flex courier-flex-row courier-gap-2 courier-w-full"
      style={{ display: "flex", flexDirection: "row", gap: "0.5rem", width: "100%" }}
    >
      <NodeViewContent
        className="courier-flex courier-flex-row courier-gap-2 courier-w-full"
        style={{ display: "flex", flexDirection: "row", gap: "0.5rem", width: "100%" }}
      />
    </NodeViewWrapper>
  );
};
