import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import React, { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { useAtomValue } from "jotai";
import { VariableIcon } from "./VariableIcon";
import { variableValuesAtom } from "../../TemplateEditor/store";
import { isValidVariableName } from "../../utils/validateVariableName";

const MAX_VARIABLE_LENGTH = 50;
const MAX_DISPLAY_LENGTH = 24;

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
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(variableId);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when newly inserted (empty id)
  useEffect(() => {
    if (variableId === "" && !isEditing) {
      setIsEditing(true);
      setEditValue("");
    }
  }, [variableId, isEditing]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

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

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    const trimmedValue = editValue.trim();

    if (trimmedValue === "") {
      // If empty, delete the variable node
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
      return;
    }

    const isValid = isValidVariableName(trimmedValue);
    updateAttributes({
      id: trimmedValue,
      isInvalid: !isValid,
    });
  }, [editValue, editor, getPos, node.nodeSize, updateAttributes]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        inputRef.current?.blur();
      } else if (e.key === "Escape") {
        e.preventDefault();
        // Revert to original value
        setEditValue(variableId);
        setIsEditing(false);
      }
    },
    [variableId]
  );

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditValue(variableId);
  }, [variableId]);

  // Color scheme based on validity and value
  const getColors = () => {
    if (isInvalid) {
      // Invalid - reddish colors
      return {
        bgColor: "#FEF2F2", // red-50
        borderColor: "#FECACA", // red-200
        iconColor: "#DC2626", // red-600
        textColor: "#991B1B", // red-800
      };
    }
    if (value) {
      // Has value - blue colors
      return {
        bgColor: "#EFF6FF",
        borderColor: "#BFDBFE",
        iconColor: undefined,
        textColor: "#1E40AF",
      };
    }
    // No value - yellow/warning colors
    return {
      bgColor: "#FFFBEB",
      borderColor: "#FDE68A",
      iconColor: "#B45309",
      textColor: "#92400E",
    };
  };

  const { bgColor, borderColor, iconColor, textColor } = getColors();

  // Truncate display text and prepare title for tooltip
  const displayInfo = useMemo(() => {
    const name = variableId;
    const valueStr = value ? `="${value}"` : "";
    const fullText = `${name}${valueStr}`;
    const isTruncated = name.length > MAX_DISPLAY_LENGTH;
    const displayName = isTruncated ? `${name.slice(0, MAX_DISPLAY_LENGTH)}…` : name;
    const displayText = `${displayName}${valueStr}`;

    return {
      displayText,
      fullText,
      showTitle: isTruncated,
    };
  }, [variableId, value]);

  return (
    <NodeViewWrapper className="courier-inline-block courier-max-w-full">
      <span
        className={`courier-inline-flex courier-items-center courier-gap-0.5 courier-rounded courier-border courier-px-1.5 courier-pl-1 courier-py-[1px] courier-text-sm courier-variable-node courier-font-mono courier-max-w-full courier-tracking-[0.64px] ${isInButton ? "courier-variable-in-button" : ""}`}
        style={{
          backgroundColor: bgColor,
          borderColor: borderColor,
          color: isInButton ? "#000000" : textColor,
        }}
        onDoubleClick={handleDoubleClick}
        title={displayInfo.showTitle ? displayInfo.fullText : undefined}
      >
        <span className="courier-flex-shrink-0 courier-flex courier-items-center">
          <VariableIcon color={iconColor} />
        </span>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value.slice(0, MAX_VARIABLE_LENGTH))}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="courier-bg-transparent courier-border-none courier-outline-none courier-font-mono courier-text-sm"
            style={{
              color: isInButton ? "#000000" : textColor,
              width: `${Math.min(Math.max(editValue.length + 1, 4), MAX_DISPLAY_LENGTH)}ch`,
              padding: 0,
              margin: 0,
              lineHeight: "normal",
              boxSizing: "content-box",
            }}
            maxLength={MAX_VARIABLE_LENGTH}
          />
        ) : (
          <span
            className="courier-min-w-0 courier-cursor-text"
            style={isInButton ? { color: "#000000" } : undefined}
          >
            {displayInfo.displayText}
          </span>
        )}
      </span>
    </NodeViewWrapper>
  );
};
