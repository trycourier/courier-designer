import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { NodeSelection, TextSelection } from "prosemirror-state";
import React, { useCallback, useEffect, useState } from "react";
import { VariableChipBase } from "../../ui/VariableEditor/VariableChipBase";
import { VARIABLE_ENTER_EDIT_META } from "../Variable/Variable.types";
import { LiquidTagIcon } from "./LiquidTagIcon";

/** Liquid tags can be longer than variable names (e.g. `for x in data.items`). */
const LIQUID_TAG_MAX_LENGTH = 200;

export const LiquidTagView: React.FC<NodeViewProps> = ({
  node,
  editor,
  getPos,
  updateAttributes,
}) => {
  const content = node.attrs.content || "";
  const [isWithinSelection, setIsWithinSelection] = useState(false);
  // Bumped to request edit mode (e.g. Enter pressed on the selected chip).
  const [editTrigger, setEditTrigger] = useState(0);

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
    checkSelection();
    // selectionUpdate covers chip selection state; no need for the update event.
    editor.on("selectionUpdate", checkSelection);
    return () => {
      editor.off("selectionUpdate", checkSelection);
    };
  }, [editor, checkSelection]);

  useEffect(() => {
    const handleTransaction = ({
      transaction,
    }: {
      transaction: { getMeta: (key: string) => unknown };
    }) => {
      const editPos = transaction.getMeta(VARIABLE_ENTER_EDIT_META);
      if (typeof editPos === "number" && typeof getPos === "function" && getPos() === editPos) {
        setEditTrigger((n) => n + 1);
      }
    };

    editor.on("transaction", handleTransaction);
    return () => {
      editor.off("transaction", handleTransaction);
    };
  }, [editor, getPos]);

  // The chip works in terms of a string `id`; map it to the tag `content` attr.
  const handleUpdateAttributes = useCallback(
    (attrs: { id: string }) => {
      updateAttributes({ content: attrs.id });
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

  const handleCommit = useCallback(() => {
    if (typeof getPos === "function") {
      const pos = getPos();
      if (typeof pos === "number") {
        const afterPos = pos + node.nodeSize;
        requestAnimationFrame(() => {
          if (editor.isDestroyed || !editor.state || !editor.view) return;
          try {
            const { tr } = editor.state;
            tr.setSelection(TextSelection.create(tr.doc, afterPos));
            editor.view.dispatch(tr);
            editor.view.focus();
          } catch {
            // Editor may have been destroyed between scheduling and execution
          }
        });
      }
    }
  }, [editor, getPos, node.nodeSize]);

  return (
    <NodeViewWrapper as="span" className="courier-inline courier-max-w-full">
      <VariableChipBase
        variableId={content}
        isInvalid={false}
        onUpdateAttributes={handleUpdateAttributes}
        onDelete={handleDelete}
        icon={<LiquidTagIcon />}
        className="courier-liquid-tag-chip"
        readOnly={!editor.isEditable}
        isSelected={isWithinSelection}
        onSelect={handleSelect}
        onCommit={handleCommit}
        editTrigger={editTrigger}
        freeform
        maxLength={LIQUID_TAG_MAX_LENGTH}
      />
    </NodeViewWrapper>
  );
};
