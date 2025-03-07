import React from 'react';
import { NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/react';
import { Braces } from 'lucide-react';

export const VariableView: React.FC<NodeViewProps> = ({ node }) => {
  return (
    <NodeViewWrapper className="inline-block">
      <span className="group text-sm variable-node bg-gray-200 pl-2 pr-3 py-[1px] rounded border border-gray-400 hover:bg-accent-foreground hover:border-accent-foreground hover:text-secondary-foreground flex items-center gap-1">
        <Braces size={16} className="text-gray-500 group-hover:stroke-primary" />
        {node.attrs.id}
      </span>
    </NodeViewWrapper>
  );
}; 
