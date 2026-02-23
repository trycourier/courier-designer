import { cn } from "@/lib";
import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { useAtomValue } from "jotai";
import { NodeSelection } from "prosemirror-state";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { variableValuesAtom, type VariableViewMode } from "../../TemplateEditor/store";
import { VariableChipBase } from "../../ui/VariableEditor/VariableChipBase";
import { VariableIcon } from "./VariableIcon";
import { getVariableViewMode } from "./variable-storage.utils";

function getFormattingStyleFromMarks(
  marks: readonly { type: { name: string } }[]
): React.CSSProperties {
  if (!marks || marks.length === 0) return {};
  const style: React.CSSProperties = {};
  const textDecorations: string[] = [];

  for (const mark of marks) {
    switch (mark.type.name) {
      case "bold":
        style.fontWeight = "bold";
        break;
      case "italic":
        style.fontStyle = "italic";
        break;
      case "underline":
        textDecorations.push("underline");
        break;
      case "strike":
        textDecorations.push("line-through");
        break;
    }
  }

  if (textDecorations.length > 0) {
    style.textDecoration = textDecorations.join(" ");
  }

  return style;
}

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
  const [isWithinSelection, setIsWithinSelection] = useState(false);

  const formattingStyle = useMemo(() => getFormattingStyleFromMarks(node.marks), [node]);

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

  const checkSelection = useCallback(() => {
    if (typeof getPos !== "function") return;
    try {
      const pos = getPos();
      if (typeof pos !== "number") {
        setIsWithinSelection(false);
        return;
      }
      const { from, to, empty } = editor.state.selection;
      setIsWithinSelection(!empty && from < pos + node.nodeSize && to > pos);
    } catch {
      setIsWithinSelection(false);
    }
  }, [editor, getPos, node.nodeSize]);

  useEffect(() => {
    checkIfInButton();
    checkSelection();

    const handleUpdate = () => {
      checkIfInButton();
      checkSelection();
    };

    editor.on("update", handleUpdate);
    editor.on("selectionUpdate", handleUpdate);

    return () => {
      editor.off("update", handleUpdate);
      editor.off("selectionUpdate", handleUpdate);
    };
  }, [editor, checkIfInButton, checkSelection]);

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

  const handleSelect = useCallback(() => {
    if (typeof getPos === "function") {
      const pos = getPos();
      if (typeof pos === "number") {
        editor
          .chain()
          .focus()
          .command(({ tr }) => {
            tr.setSelection(NodeSelection.create(tr.doc, pos));
            return true;
          })
          .run();
      }
    }
  }, [editor, getPos]);

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
        style={formattingStyle}
      >
        {value || ""}
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper as="span" className="courier-inline courier-max-w-full">
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
        formattingStyle={formattingStyle}
        isSelected={isWithinSelection}
        onSelect={handleSelect}
      />
    </NodeViewWrapper>
  );
};
