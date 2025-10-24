import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import React from "react";
import { VariableIcon } from "./VariableIcon";

export const VariableView: React.FC<NodeViewProps> = ({ node }) => {
  return (
    <NodeViewWrapper className="courier-inline-block courier-max-w-full">
      <span className="courier-inline-flex courier-items-center courier-gap-0.5 courier-rounded courier-border courier-border-[#BFDBFE] courier-bg-[#EFF6FF] courier-px-1.5 courier-pl-1 courier-py-[1px] courier-text-sm courier-variable-node courier-font-mono courier-max-w-full courier-tracking-[0.64px]">
        <VariableIcon />
        <span className="courier-truncate courier-min-w-0">{node.attrs.id}</span>
      </span>
    </NodeViewWrapper>
  );
};
