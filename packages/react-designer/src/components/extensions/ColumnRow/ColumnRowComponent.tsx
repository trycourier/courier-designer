import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";

export const ColumnRowComponentNode = (_props: NodeViewProps) => {
  return (
    <NodeViewWrapper
      className="courier-flex courier-flex-row courier-items-stretch courier-w-full"
      style={{ display: "flex", flexDirection: "row", alignItems: "stretch", width: "100%" }}
    >
      <NodeViewContent
        className="courier-flex courier-flex-row courier-items-stretch courier-w-full"
        style={{ display: "flex", flexDirection: "row", alignItems: "stretch", width: "100%" }}
      />
    </NodeViewWrapper>
  );
};
