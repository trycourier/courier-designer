import { cn } from "@/lib";
import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { useAtomValue } from "jotai";
import React, { useCallback, useEffect, useState } from "react";
import { variableValuesAtom, type VariableViewMode } from "../../TemplateEditor/store";
import { VariableChipBase } from "../../ui/VariableEditor/VariableChipBase";
import { VariableIcon } from "./VariableIcon";
import { getVariableViewMode } from "./variable-storage.utils";

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

  const [variableViewMode, setVariableViewMode] = useState<VariableViewMode>(() =>
    getVariableViewMode(editor)
  );

  useEffect(() => {
    const handleTransaction = ({
      transaction,
    }: {
      transaction: { getMeta: (key: string) => boolean | undefined };
    }) => {
      if (transaction.getMeta("variableViewModeChanged")) {
        const newMode = getVariableViewMode(editor);
        setVariableViewMode(newMode);
      }
    };

    editor.on("transaction", handleTransaction);
    return () => {
      editor.off("transaction", handleTransaction);
    };
  }, [editor, variableId]);

  useEffect(() => {
    const currentMode = getVariableViewMode(editor);
    if (currentMode) {
      setVariableViewMode(currentMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.storage?.variable?.variableViewMode]);

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
      } catch {
        setIsInButton(false);
      }
    } else {
      setIsInButton(false);
    }
  }, [editor, getPos]);

  useEffect(() => {
    checkIfInButton();

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

  const getIconColor = (invalid: boolean, hasValue: boolean): string => {
    if (invalid) return "#DC2626";
    if (hasValue) return "#1E40AF";
    return "#B45309";
  };

  const iconColor = getIconColor(isInvalid, !!value);

  if (variableViewMode === "wysiwyg") {
    return (
      <NodeViewWrapper
        as="span"
        className="courier-inline"
        contentEditable={false}
        data-variable-id={variableId}
        data-wysiwyg="true"
      >
        {value || ""}
      </NodeViewWrapper>
    );
  }

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
