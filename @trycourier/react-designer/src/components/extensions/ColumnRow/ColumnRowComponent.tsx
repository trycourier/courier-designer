import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";

export const ColumnRowComponentNode = (_props: NodeViewProps) => {
  return (
    <NodeViewWrapper
      className="courier-flex courier-flex-row courier-items-stretch courier-w-full courier-gap-4"
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        width: "100%",
        gap: "16px",
      }}
    >
      <NodeViewContent
        className="courier-flex courier-flex-row courier-items-stretch courier-w-full courier-gap-4"
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          width: "100%",
          gap: "16px",
        }}
      />
    </NodeViewWrapper>
  );
};
