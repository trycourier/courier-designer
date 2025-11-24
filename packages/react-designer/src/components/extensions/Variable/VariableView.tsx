import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import React, { useCallback, useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { VariableIcon } from "./VariableIcon";
import { variableValuesAtom } from "../../TemplateEditor/store";

export const VariableView: React.FC<NodeViewProps> = ({ node, editor, getPos }) => {
  const variableValues = useAtomValue(variableValuesAtom);
  const value = variableValues[node.attrs.id];
  const [isInButton, setIsInButton] = useState(false);

  // Check if variable is inside a button
  const checkIfInButton = useCallback(() => {
    if (typeof getPos === "function") {
      try {
        const pos = getPos();
        if (pos === null || pos === undefined) {
          setIsInButton(false);
          return;
        }

        const $pos = editor.state.doc.resolve(pos);
        const parent = $pos.parent;

        setIsInButton(parent && parent.type.name === "button");
      } catch (e) {
        // Ignore resolution errors, keep isInButton as false
        setIsInButton(false);
      }
    } else {
      setIsInButton(false);
    }
  }, [editor, getPos]);

  useEffect(() => {
    // Check immediately
    checkIfInButton();

    // Also listen for editor updates to re-check when structure changes
    const handleUpdate = () => {
      checkIfInButton();
    };

    editor.on("update", handleUpdate);
    editor.on("selectionUpdate", handleUpdate);

    return () => {
      editor.off("update", handleUpdate);
      editor.off("selectionUpdate", handleUpdate);
    };
  }, [editor, checkIfInButton]);

  // Use yellow/warning colors when no value is set, blue when value exists
  const bgColor = value ? "#EFF6FF" : "#FFFBEB";
  const borderColor = value ? "#BFDBFE" : "#FDE68A";
  const iconColor = value ? undefined : "#B45309";

  return (
    <NodeViewWrapper className="courier-inline-block courier-max-w-full">
      <span
        className={`courier-inline-flex courier-items-center courier-gap-0.5 courier-rounded courier-border courier-px-1.5 courier-pl-1 courier-py-[1px] courier-text-sm courier-variable-node courier-font-mono courier-max-w-full courier-tracking-[0.64px] ${isInButton ? "courier-variable-in-button" : ""}`}
        style={{
          backgroundColor: bgColor,
          borderColor: borderColor,
          ...(isInButton && { color: "#000000" }),
        }}
      >
        <VariableIcon color={iconColor} />
        <span
          className="courier-truncate courier-min-w-0"
          style={isInButton ? { color: "#000000" } : undefined}
        >
          {node.attrs.id}
          {value ? `="${value}"` : ""}
        </span>
      </span>
    </NodeViewWrapper>
  );
};
