import {
  availableVariablesAtom,
  disableVariablesAutocompleteAtom,
  variableValidationAtom,
} from "@/components/TemplateEditor/store";
import { cn } from "@/lib";
import { useAtomValue } from "jotai";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { getFlattenedVariables } from "../../utils/getFlattenedVariables";
import { isValidVariableName } from "../../utils/validateVariableName";
import { VariableAutocomplete } from "./VariableAutocomplete";

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
  /** Custom color getter function (kept for API compatibility, colors handled by CSS) */
  getColors?: (isInvalid: boolean, hasValue: boolean) => VariableColors;
}

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
  getColors: _getColors,
}) => {
  void _getColors; // Colors handled by CSS, prop kept for API compatibility
  const [isEditing, setIsEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const editableRef = useRef<HTMLSpanElement>(null);
  const chipRef = useRef<HTMLSpanElement>(null);
  const variableValidation = useAtomValue(variableValidationAtom);
  const availableVariables = useAtomValue(availableVariablesAtom);
  const disableAutocomplete = useAtomValue(disableVariablesAutocompleteAtom);

  // Get flattened list of variable suggestions
  const allSuggestions = useMemo(() => {
    if (
      disableAutocomplete ||
      !availableVariables ||
      Object.keys(availableVariables).length === 0
    ) {
      return [];
    }
    return getFlattenedVariables(availableVariables);
  }, [availableVariables, disableAutocomplete]);

  // Filter suggestions based on current query
  const filteredSuggestions = useMemo(() => {
    if (allSuggestions.length === 0) return [];
    if (!query) return allSuggestions;
    return allSuggestions.filter((item) => item.toLowerCase().includes(query.toLowerCase()));
  }, [allSuggestions, query]);

  // Show autocomplete when editing and have suggestions
  const showAutocomplete = isEditing && filteredSuggestions.length > 0;

  // Auto-enter edit mode if id is empty (newly inserted variable)
  useEffect(() => {
    if (variableId === "" && !isEditing) {
      setIsEditing(true);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [variableId, isEditing]);

  // Validate variable against available list on mount/change
  // If variables are provided and the current variable is not in the list, mark as invalid
  useEffect(() => {
    // Skip if empty (will be handled by edit flow), or if already in edit mode
    if (!variableId || isEditing) return;

    // If we have a list of valid variables and the current one is not in it, mark as invalid
    if (allSuggestions.length > 0 && !allSuggestions.includes(variableId)) {
      if (!isInvalid) {
        // Defer the update to avoid flushSync warning during render
        queueMicrotask(() => {
          onUpdateAttributes({ id: variableId, isInvalid: true });
        });
      }
    }
  }, [variableId, allSuggestions, isInvalid, isEditing, onUpdateAttributes]);

  // Focus and place cursor at end when entering edit mode
  useEffect(() => {
    if (isEditing && editableRef.current) {
      const el = editableRef.current;
      // Set initial content (variableId) when entering edit mode
      el.textContent = variableId;
      el.focus();
      // Use requestAnimationFrame to ensure cursor placement happens after DOM update
      requestAnimationFrame(() => {
        // Check if element is still connected to the DOM before manipulating selection
        // This prevents "addRange(): The given range isn't in document" errors
        if (el && el.isConnected) {
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false); // Collapse to end
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      });
    }
  }, [isEditing, variableId]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    // Read directly from DOM instead of React state to avoid cursor issues
    const trimmedValue = (editableRef.current?.textContent || "").trim();

    // If empty, delete the node
    if (trimmedValue === "") {
      onDelete();
      return;
    }

    // Validate the variable name
    // Step 1: Format validation (built-in) - unless overridden
    let isValid = true;

    if (variableValidation?.overrideFormatValidation) {
      // Only use custom validation if overrideFormatValidation is true
      if (variableValidation.validate) {
        isValid = variableValidation.validate(trimmedValue);
      }
    } else {
      // Default: Run format validation first
      isValid = isValidVariableName(trimmedValue);

      // Step 2: Custom validation (only if format passes)
      if (isValid && variableValidation?.validate) {
        isValid = variableValidation.validate(trimmedValue);
      }
    }

    // Step 3: If variables are provided for autocomplete, validate against the list
    // Only if still valid and autocomplete is enabled (not disabled)
    if (isValid && allSuggestions.length > 0) {
      isValid = allSuggestions.includes(trimmedValue);
    }

    // Handle invalid variable based on onInvalid setting
    if (!isValid) {
      const onInvalid = variableValidation?.onInvalid ?? "mark";

      // Show toast if invalidMessage is configured
      if (variableValidation?.invalidMessage) {
        const message =
          typeof variableValidation.invalidMessage === "function"
            ? variableValidation.invalidMessage(trimmedValue)
            : variableValidation.invalidMessage;
        toast.error(message);
      }

      if (onInvalid === "remove") {
        onDelete();
        return;
      }

      // Default: 'mark' - keep the chip with invalid styling
      onUpdateAttributes({
        id: trimmedValue,
        isInvalid: true,
      });
      return;
    }

    // Valid variable
    onUpdateAttributes({
      id: trimmedValue,
      isInvalid: false,
    });
  }, [onDelete, onUpdateAttributes, variableValidation, allSuggestions]);

  // Handle selecting an item from autocomplete
  const handleSelectSuggestion = useCallback(
    (item: string) => {
      // Set the value in the editable span
      if (editableRef.current) {
        editableRef.current.textContent = item;
      }
      setQuery("");
      setIsEditing(false);
      // Update attributes with the selected variable
      onUpdateAttributes({
        id: item,
        isInvalid: false,
      });
    },
    [onUpdateAttributes]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLSpanElement>) => {
      // Handle autocomplete navigation when dropdown is visible
      if (showAutocomplete) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filteredSuggestions.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex(
            (prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length
          );
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          const selected = filteredSuggestions[selectedIndex];
          if (selected) {
            handleSelectSuggestion(selected);
          } else {
            editableRef.current?.blur();
          }
          return;
        }
        if (e.key === "Tab") {
          e.preventDefault();
          const selected = filteredSuggestions[selectedIndex];
          if (selected) {
            handleSelectSuggestion(selected);
          }
          return;
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        editableRef.current?.blur();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        // Revert to original value in DOM
        if (editableRef.current) {
          editableRef.current.textContent = variableId;
        }
        setIsEditing(false);
        setQuery("");
        // If it was a new empty variable, delete it
        if (variableId === "") {
          onDelete();
        }
      }
    },
    [
      variableId,
      onDelete,
      showAutocomplete,
      filteredSuggestions,
      selectedIndex,
      handleSelectSuggestion,
    ]
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
      // Update query for autocomplete filtering
      setQuery(text);
      setSelectedIndex(0);
    }
  }, []);

  // Handle paste to strip formatting and enforce max length
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain").slice(0, MAX_VARIABLE_LENGTH);

      // Use modern Range API instead of deprecated document.execCommand
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);

        // Move cursor to end of inserted text
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);

        // Trigger input event to enforce max length check
        handleInput();
      }
    },
    [handleInput]
  );

  const handleEditTrigger = useCallback(
    (e: React.MouseEvent) => {
      // Stop propagation to prevent TipTap from stealing focus
      e.stopPropagation();
      if (!isEditing) {
        setIsEditing(true);
      }
    },
    [isEditing]
  );

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

  // Update span content when not editing - show displayText (name + value) instead of just name
  useEffect(() => {
    if (editableRef.current && !isEditing) {
      editableRef.current.textContent = displayInfo.displayText;
    }
  }, [displayInfo.displayText, isEditing]);

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
    <>
      <span
        ref={chipRef}
        className={cn(
          "courier-variable-chip",
          !isInvalid && value && "courier-variable-chip-has-value",
          isInvalid && "courier-variable-chip-invalid",
          className
        )}
        style={{ direction: "ltr" }}
        onMouseDown={handleMouseDown}
        {...clickProps}
        title={displayInfo.showTitle ? displayInfo.fullText : undefined}
      >
        <span className="courier-flex-shrink-0 courier-flex courier-items-center courier-pt-0.5">
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
            ...(textColorOverride && { color: textColorOverride }),
            maxWidth: `${MAX_DISPLAY_LENGTH}ch`,
            overflow: "hidden",
            textOverflow: isEditing ? "clip" : "ellipsis",
            whiteSpace: "nowrap",
            direction: "ltr",
            unicodeBidi: "isolate",
          }}
        >
          {/* Don't render children when editing - let DOM manage contentEditable */}
          {!isEditing && displayInfo.displayText}
        </span>
      </span>

      {/* Autocomplete dropdown - rendered via portal to theme container to preserve theming */}
      {showAutocomplete &&
        createPortal(
          <VariableAutocomplete
            items={filteredSuggestions}
            onSelect={handleSelectSuggestion}
            selectedIndex={selectedIndex}
            anchorRef={chipRef}
          />,
          chipRef.current?.closest(".theme-container") || document.body
        )}
    </>
  );
};
