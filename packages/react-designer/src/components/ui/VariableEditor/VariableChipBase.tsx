import { cn } from "@/lib";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isValidVariableName } from "../../utils/validateVariableName";

export const MAX_VARIABLE_LENGTH = 50;
export const MAX_DISPLAY_LENGTH = 24;

export interface VariableColors {
  bgColor: string;
  borderColor: string;
  iconColor: string;
  textColor: string;
}

export interface VariableChipBaseProps {
  /** The variable name/id */
  variableId: string;
  /** Whether the variable is currently invalid */
  isInvalid: boolean;
  /** Called when attributes should be updated */
  onUpdateAttributes: (attrs: { id: string; isInvalid: boolean }) => void;
  /** Called when the node should be deleted */
  onDelete: () => void;
  /** Icon component to render */
  icon: React.ReactNode;
  /** Optional value to display (e.g., for variables with known values) */
  value?: string;
  /** Whether to use single-click (true) or double-click (false) to edit */
  singleClickToEdit?: boolean;
  /** Additional class names for the outer span */
  className?: string;
  /** Override text color (e.g., for button context) */
  textColorOverride?: string;
  /** Custom color getter function */
  getColors?: (isInvalid: boolean, hasValue: boolean) => VariableColors;
}

const defaultGetColors = (isInvalid: boolean, hasValue: boolean): VariableColors => {
  if (isInvalid) {
    // Invalid - reddish colors
    return {
      bgColor: "#FEF2F2", // red-50
      borderColor: "#FECACA", // red-200
      iconColor: "#DC2626", // red-600
      textColor: "#991B1B", // red-800
    };
  }
  if (hasValue) {
    // Has value - blue colors
    return {
      bgColor: "#EFF6FF",
      borderColor: "#BFDBFE",
      iconColor: "#1E40AF",
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

export const VariableChipBase: React.FC<VariableChipBaseProps> = ({
  variableId,
  isInvalid,
  onUpdateAttributes,
  onDelete,
  icon,
  value,
  singleClickToEdit = false,
  className,
  textColorOverride,
  getColors = defaultGetColors,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(variableId);
  const editableRef = useRef<HTMLSpanElement>(null);

  // Auto-enter edit mode if id is empty (newly inserted variable)
  useEffect(() => {
    if (variableId === "" && !isEditing) {
      setIsEditing(true);
      setEditValue("");
    }
  }, [variableId, isEditing]);

  // Focus and place cursor at end when entering edit mode
  useEffect(() => {
    if (isEditing && editableRef.current) {
      editableRef.current.focus();
      // Place cursor at end of content
      const range = document.createRange();
      range.selectNodeContents(editableRef.current);
      range.collapse(false); // Collapse to end
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [isEditing]);

  // Sync editValue when variableId changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(variableId);
    }
  }, [variableId, isEditing]);

  // Update span content when editValue changes (for non-editing state)
  useEffect(() => {
    if (editableRef.current && !isEditing) {
      editableRef.current.textContent = editValue;
    }
  }, [editValue, isEditing]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    const trimmedValue = editValue.trim();

    // If empty, delete the node
    if (trimmedValue === "") {
      onDelete();
      return;
    }

    // Validate and update
    const isValid = isValidVariableName(trimmedValue);
    onUpdateAttributes({
      id: trimmedValue,
      isInvalid: !isValid,
    });
  }, [editValue, onDelete, onUpdateAttributes]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLSpanElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        editableRef.current?.blur();
      } else if (e.key === "Escape") {
        e.preventDefault();
        // Revert to original value
        setEditValue(variableId);
        if (editableRef.current) {
          editableRef.current.textContent = variableId;
        }
        setIsEditing(false);
        // If it was a new empty variable, delete it
        if (variableId === "") {
          onDelete();
        }
      }
    },
    [variableId, onDelete]
  );

  const handleInput = useCallback(() => {
    if (editableRef.current) {
      let text = editableRef.current.textContent || "";
      // Enforce max length
      if (text.length > MAX_VARIABLE_LENGTH) {
        text = text.slice(0, MAX_VARIABLE_LENGTH);
        editableRef.current.textContent = text;
        // Move cursor to end
        const range = document.createRange();
        range.selectNodeContents(editableRef.current);
        range.collapse(false);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      setEditValue(text);
    }
  }, []);

  // Handle paste to strip formatting and enforce max length
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain").slice(0, MAX_VARIABLE_LENGTH);
    document.execCommand("insertText", false, text);
  }, []);

  const handleEditTrigger = useCallback(
    (e: React.MouseEvent) => {
      // Stop propagation to prevent TipTap from stealing focus
      e.stopPropagation();
      if (!isEditing) {
        setIsEditing(true);
        setEditValue(variableId);
      }
    },
    [variableId, isEditing]
  );

  const colors = getColors(isInvalid, !!value);
  const { bgColor, borderColor, textColor } = colors;
  const finalTextColor = textColorOverride || textColor;

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

  // Prevent TipTap from capturing mouse events on the chip
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Stop click propagation to prevent TipTap from stealing focus
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const clickProps = singleClickToEdit
    ? { onClick: handleEditTrigger }
    : { onClick: handleClick, onDoubleClick: handleEditTrigger };

  return (
    <span
      className={cn(
        "courier-inline-block courier-rounded courier-border courier-px-1.5 courier-pl-6 courier-py-[1px] courier-max-w-full courier-tracking-[0.64px] courier-relative courier-align-middle",
        className
      )}
      style={{
        fontSize: "inherit",
        fontFamily: "inherit",
        fontWeight: "inherit",
        backgroundColor: bgColor,
        borderColor: borderColor,
        color: finalTextColor,
        direction: "ltr",
      }}
      onMouseDown={handleMouseDown}
      {...clickProps}
      title={displayInfo.showTitle ? displayInfo.fullText : undefined}
    >
      <span className="courier-flex-shrink-0 courier-flex courier-items-center courier-absolute courier-left-1 courier-top-1/2 -courier-translate-y-1/2">
        {icon}
      </span>
      <span
        ref={editableRef}
        role="textbox"
        contentEditable={isEditing}
        suppressContentEditableWarning
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onPaste={handlePaste}
        onMouseDown={handleMouseDown}
        {...(singleClickToEdit
          ? { onClick: handleEditTrigger }
          : { onClick: handleClick, onDoubleClick: handleEditTrigger })}
        className={cn(
          "courier-outline-none courier-min-w-[1ch]",
          !isEditing && "courier-cursor-text"
        )}
        style={{
          color: finalTextColor,
          maxWidth: `${MAX_DISPLAY_LENGTH}ch`,
          overflow: "hidden",
          textOverflow: isEditing ? "clip" : "ellipsis",
          whiteSpace: "nowrap",
          direction: "ltr",
          unicodeBidi: "isolate",
        }}
      >
        {editValue}
      </span>
    </span>
  );
};
