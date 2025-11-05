import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import React from "react";
import { useAtomValue } from "jotai";
import { VariableIcon } from "./VariableIcon";
import { variableValuesAtom } from "../../TemplateEditor/store";

export const VariableView: React.FC<NodeViewProps> = ({ node }) => {
  const variableValues = useAtomValue(variableValuesAtom);
  const value = variableValues[node.attrs.id];

  // Use yellow/warning colors when no value is set, blue when value exists
  const bgColor = value ? "#EFF6FF" : "#FFFBEB";
  const borderColor = value ? "#BFDBFE" : "#FDE68A";
  const iconColor = value ? undefined : "#B45309";

  return (
    <NodeViewWrapper className="courier-inline-block courier-max-w-full">
      <span
        className="courier-inline-flex courier-items-center courier-gap-0.5 courier-rounded courier-border courier-px-1.5 courier-pl-1 courier-py-[1px] courier-text-sm courier-variable-node courier-font-mono courier-max-w-full courier-tracking-[0.64px]"
        style={{
          backgroundColor: bgColor,
          borderColor: borderColor,
        }}
      >
        <VariableIcon color={iconColor} />
        <span className="courier-truncate courier-min-w-0">
          {node.attrs.id}
          {value ? `="${value}"` : ""}
        </span>
      </span>
    </NodeViewWrapper>
  );
};
