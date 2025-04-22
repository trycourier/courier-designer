import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { Braces } from "lucide-react";
import React from "react";

export const VariableView: React.FC<NodeViewProps> = ({ node }) => {
  return (
    <NodeViewWrapper className="courier-inline-block">
      <span className="courier-group courier-text-sm courier-variable-node courier-bg-gray-200 courier-pl-2 courier-pr-3 courier-py-[1px] courier-rounded courier-border courier-border-gray-400 hover:courier-bg-accent-foreground hover:courier-border-accent-foreground hover:courier-text-secondary-foreground courier-flex courier-items-center courier-gap-1">
        <Braces size={16} className="courier-text-gray-500 group-hover:courier-stroke-primary" />
        {node.attrs.id}
      </span>
    </NodeViewWrapper>
  );
};
