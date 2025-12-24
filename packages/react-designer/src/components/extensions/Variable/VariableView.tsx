import { cn } from "@/lib";
import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { useAtomValue } from "jotai";
import React, { useCallback, useEffect, useState } from "react";
import { variableValuesAtom } from "../../TemplateEditor/store";
import { VariableChipBase } from "../../ui/VariableEditor/VariableChipBase";
import { VariableIcon } from "./VariableIcon";

export const VariableView: React.FC<NodeViewProps> = ({
  node,
  editor,
  getPos,
  updateAttributes,
}) => {
  const variableValues = useAtomValue(variableValuesAtom);
  const variableId = node.attrs.id || "";
  const value = variableValues[variableId];
  const isInvalid = node.attrs.isInvalid;
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

  const handleUpdateAttributes = useCallback(
    (attrs: { id: string; isInvalid: boolean }) => {
      updateAttributes(attrs);
    },
    [updateAttributes]
  );

  const handleDelete = useCallback(() => {
    if (typeof getPos === "function") {
      const pos = getPos();
      if (typeof pos === "number") {
        editor
          .chain()
          .focus()
          .deleteRange({ from: pos, to: pos + node.nodeSize })
          .run();
      }
    }
  }, [editor, getPos, node.nodeSize]);

  // Get icon color based on state
  const getIconColor = (invalid: boolean, hasValue: boolean): string => {
    if (invalid) return "#DC2626"; // red-600
    if (hasValue) return "#1E40AF"; // blue-800
    return "#B45309"; // amber-700
  };

  const iconColor = getIconColor(isInvalid, !!value);

  return (
    <NodeViewWrapper className="courier-inline-block courier-max-w-full">
      <VariableChipBase
        variableId={variableId}
        isInvalid={isInvalid}
        value={value}
        onUpdateAttributes={handleUpdateAttributes}
        onDelete={handleDelete}
        icon={<VariableIcon color={iconColor} />}
        className={cn("courier-variable-node", isInButton && "courier-variable-in-button")}
        textColorOverride={isInButton ? "#000000" : undefined}
        readOnly={!editor.isEditable}
      />
    </NodeViewWrapper>
  );
};
