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
import { isAcceptedVariable, isRejectedVariable } from "@/lib/utils/handlebars/variableRules";
import { classifyExpression } from "@/lib/utils/handlebars/classifyExpression";
import { isVariableLike } from "@/lib/utils/handlebars/segmentText";
import { VariableAutocomplete } from "./VariableAutocomplete";
import { SUGGESTABLE_HELPERS } from "@/lib/utils/handlebars/helperRegistry";
import { formatSignature, getHelperSignature } from "@/lib/utils/handlebars/helperSignatures";
import { useAutoEdit } from "@/components/extensions/chipEditing";
import { applyChipSuggestion, filterChipSuggestions } from "@/lib/utils/handlebars/chipQuery";

const HELPER_NAMES = SUGGESTABLE_HELPERS;
const HELPER_SET = new Set<string>(HELPER_NAMES);

export const MAX_VARIABLE_LENGTH = 50;

/**
 * A chip being typed can hold a whole handlebars expression before it is
 * converted, and those are routinely longer than a variable name.
 * `{{#if (condition data.order.status "==" "shipped")}}` is already 48
 * characters of body. Clamping those to 50 silently truncated pasted content.
 */
export const MAX_EXPRESSION_LENGTH = 500;

/**
 * The cap that applies to this content: expressions get the long one, plain
 * variable names keep the short one.
 */
export function maxChipLength(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return MAX_VARIABLE_LENGTH;
  if (/^[#/^>!]/.test(trimmed)) return MAX_EXPRESSION_LENGTH;
  return isVariableLike(classifyExpression(trimmed), false)
    ? MAX_VARIABLE_LENGTH
    : MAX_EXPRESSION_LENGTH;
}
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
  /** Whether the chip is read-only (prevents editing) */
  readOnly?: boolean;
  /** Formatting styles derived from TipTap marks (bold, italic, underline, strikethrough) */
  formattingStyle?: React.CSSProperties;
  /** Whether the chip is within the current text selection */
  isSelected?: boolean;
  /** Called when the chip is clicked for selection (not editing) */
  onSelect?: () => void;
  /** Called after editing is committed (suggestion selected or blur confirmed) to restore editor focus */
  onCommit?: () => void;
  /** Whether this variable chip is inside a list node with a loop configured */
  isInsideLoop?: boolean;
  /**
   * Called when the author picks a helper rather than a variable. The chip
   * cannot represent a helper call, so the host swaps the node for a handlebars
   * expression. Omit to keep the chip variable-only.
   */
  onSelectHelper?: (helperName: string) => void;
  /**
   * Skip checking the name against the host's variable list. Set for a chip
   * inside an open `{{#each}}`/`{{#with}}`, where the name resolves against the
   * block's scope and the host list cannot know it.
   */
  skipListValidation?: boolean;
  /** Open for editing as soon as it renders — see `autoEditAttribute`. */
  autoEdit?: boolean;
  /** Clear the host node's `autoEdit` once this chip has acted on it. */
  onAutoEditConsumed?: () => void;
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
  readOnly = false,
  formattingStyle,
  isSelected = false,
  onSelect,
  onCommit,
  isInsideLoop = false,
  onSelectHelper,
  skipListValidation = false,
  autoEdit = false,
  onAutoEditConsumed,
}) => {
  void _getColors; // Colors handled by CSS, prop kept for API compatibility
  const [isEditing, setIsEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  // A pick answers the question the list was asking, so it closes until the
  // author types something else.
  const [pickedSuggestion, setPickedSuggestion] = useState(false);
  const editableRef = useRef<HTMLSpanElement>(null);
  const chipRef = useRef<HTMLSpanElement>(null);
  const variableValidation = useAtomValue(variableValidationAtom);
  const availableVariables = useAtomValue(availableVariablesAtom);
  const disableAutocomplete = useAtomValue(disableVariablesAutocompleteAtom);

  // Get flattened list of variable suggestions
  const allSuggestions = useMemo(() => {
    const loopVars = isInsideLoop ? ["$.item", "$.index"] : [];

    if (
      disableAutocomplete ||
      !availableVariables ||
      Object.keys(availableVariables).length === 0
    ) {
      return loopVars;
    }
    return [...loopVars, ...getFlattenedVariables(availableVariables)];
  }, [availableVariables, disableAutocomplete, isInsideLoop]);

  // Filter on the token under the caret, not the whole chip: a chip holding
  // `#if data.us` matched nothing when compared whole, so the list emptied as
  // soon as an author typed a sigil. Helpers are only offered when the host can
  // act on the choice, since the variable chip cannot hold a helper call itself.
  const filteredSuggestions = useMemo(
    () => filterChipSuggestions(query, allSuggestions, onSelectHelper ? HELPER_NAMES : []),
    [allSuggestions, query, onSelectHelper]
  );

  // Show autocomplete when editing and have suggestions
  const showAutocomplete = isEditing && !pickedSuggestion && filteredSuggestions.length > 0;

  // Auto-enter edit mode if id is empty (newly inserted variable)
  useEffect(() => {
    // Don't auto-enter edit mode in readonly mode
    if (readOnly) return;
    if (variableId === "" && !isEditing) {
      setIsEditing(true);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [variableId, isEditing, readOnly]);

  // Enter on the selected chip opens it, the same as on an expression chip.
  useAutoEdit({
    autoEdit,
    isEditing,
    open: () => {
      setIsEditing(true);
      setQuery(variableId);
      setSelectedIndex(0);
    },
    clear: () => onAutoEditConsumed?.(),
  });

  // Validate variable against custom validator or available list on mount/change
  useEffect(() => {
    if (!variableId || isEditing) return;

    const isValid = isAcceptedVariable(
      variableId,
      { available: allSuggestions, inBlockScope: skipListValidation, inLoop: isInsideLoop },
      variableValidation?.validate
    );

    if (!isValid && !isInvalid) {
      queueMicrotask(() => {
        onUpdateAttributes({ id: variableId, isInvalid: true });
      });
    } else if (isValid && isInvalid) {
      queueMicrotask(() => {
        onUpdateAttributes({ id: variableId, isInvalid: false });
      });
    }
  }, [
    variableId,
    allSuggestions,
    isInvalid,
    isEditing,
    onUpdateAttributes,
    variableValidation,
    isInsideLoop,
    skipListValidation,
  ]);

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
    let isValid = true;
    let customValidationFailed = false;

    const context = { isInsideLoop };

    if (variableValidation?.overrideFormatValidation) {
      if (variableValidation.validate) {
        isValid = variableValidation.validate(trimmedValue, context);
        if (!isValid) customValidationFailed = true;
      }
    } else {
      // Shape, scope and membership all come from the shared rules, so a
      // standalone chip and a helper argument are judged identically.
      isValid = !isRejectedVariable(trimmedValue, {
        available: allSuggestions,
        inBlockScope: skipListValidation,
        inLoop: isInsideLoop,
      });

      // Custom validation only if the built-in rules pass
      if (isValid && variableValidation?.validate) {
        isValid = variableValidation.validate(trimmedValue, context);
        if (!isValid) customValidationFailed = true;
      }
    }

    if (!isValid) {
      const onInvalid = variableValidation?.onInvalid ?? "mark";

      // Only show custom invalidMessage when the custom validator failed
      if (customValidationFailed && variableValidation?.invalidMessage) {
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
    onCommit?.();
  }, [
    onDelete,
    onUpdateAttributes,
    variableValidation,
    allSuggestions,
    onCommit,
    isInsideLoop,
    skipListValidation,
  ]);

  // Handle selecting an item from autocomplete
  /** Put the chip's text back and leave the caret at its end, still editing. */
  const continueEditing = useCallback((text: string) => {
    if (!editableRef.current) return;
    setPickedSuggestion(true);
    editableRef.current.textContent = text;
    setQuery(text);
    setSelectedIndex(0);
    requestAnimationFrame(() => {
      const el = editableRef.current;
      if (!el?.isConnected) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
  }, []);

  const handleSelectSuggestion = useCallback(
    (item: string) => {
      // Mid-expression: the suggestion replaces the token under the caret and
      // the author keeps typing. Committing `item` alone here threw away the
      // `#if ` in front of it, and delegating to `onSelectHelper` would have
      // replaced the whole chip with a fresh helper.
      const spliced = applyChipSuggestion(query, item);
      if (spliced !== item) {
        continueEditing(spliced);
        return;
      }

      if (onSelectHelper && HELPER_SET.has(item) && !allSuggestions.includes(item)) {
        setIsEditing(false);
        setQuery("");
        onSelectHelper(item);
        return;
      }

      if (item === "$.item" && editableRef.current) {
        const expanded = "$.item.";
        editableRef.current.textContent = expanded;
        setQuery(expanded);
        setSelectedIndex(0);
        // Place caret at the end of "$.item."
        requestAnimationFrame(() => {
          const el = editableRef.current;
          if (el?.isConnected) {
            el.focus();
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        });
        return;
      }

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
      // Restore focus to the editor after exiting edit mode
      onCommit?.();
    },
    [onUpdateAttributes, onCommit, onSelectHelper, allSuggestions, query, continueEditing]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLSpanElement>) => {
      // Block formatting shortcuts (Cmd/Ctrl+B, I, U, etc.) from reaching TipTap
      // while editing the variable name. Allow standard text-editing shortcuts through.
      if (e.metaKey || e.ctrlKey) {
        const key = e.key.toLowerCase();
        const allowedKeys = new Set(["a", "c", "v", "x", "z"]);
        if (!allowedKeys.has(key)) {
          e.stopPropagation();
          e.preventDefault();
          return;
        }
      }

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

      // Delete the chip on Backspace when the editable content is empty
      if (e.key === "Backspace") {
        const text = editableRef.current?.textContent || "";
        if (text === "") {
          e.preventDefault();
          setIsEditing(false);
          onDelete();
          return;
        }
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
    setPickedSuggestion(false);
    if (editableRef.current) {
      let text = editableRef.current.textContent || "";
      // Enforce max length
      // Typing `}}` closes the chip. The in-progress text lives only in this
      // contenteditable until blur — it is not in the ProseMirror doc — so the
      // document-level `}}` handler cannot see it, and an unclosed chip is
      // dropped by serialization (`!node.attrs.id`). Without this an author can
      // type an expression, be unable to close it, and lose it on reload.
      if (text.endsWith("}}")) {
        const body = text.slice(0, -2);
        if (editableRef.current) {
          editableRef.current.textContent = body;
          setQuery(body);
          // blur commits through handleBlur, which reads the DOM text.
          editableRef.current.blur();
        }
        return;
      }

      const limit = maxChipLength(text);
      if (text.length > limit) {
        text = text.slice(0, limit);
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
      const pasted = e.clipboardData.getData("text/plain");
      const existing = editableRef.current?.textContent ?? "";
      // Judge the limit on the combined content — pasting an expression into a
      // chip that already holds one must not be clamped to a variable's length.
      const text = pasted.slice(0, Math.max(0, maxChipLength(existing + pasted) - existing.length));

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
      // Don't allow editing in readonly mode
      if (readOnly) return;
      if (!isEditing) {
        setIsEditing(true);
      }
    },
    [isEditing, readOnly]
  );

  // Truncate display text and prepare title for tooltip
  const displayInfo = useMemo(() => {
    // The chip shows the NAME only. Its value belongs in preview, not stamped
    // onto the label — `data.user.name="Ada"` reads as part of the template.
    // The full text, value included, stays on the title for a hover.
    const name = variableId;
    const valueStr = value ? `="${value}"` : "";
    // No JS cut: the label wraps and is clamped by the stylesheet, so slicing
    // here would throw away text the chip now has room to show, and no CSS
    // could bring it back.
    const isLong = name.length > MAX_DISPLAY_LENGTH;

    return {
      displayText: name,
      fullText: `${name}${valueStr}`,
      showTitle: isLong || Boolean(valueStr),
    };
  }, [variableId, value]);

  // Update span content when not editing.
  useEffect(() => {
    if (editableRef.current && !isEditing) {
      editableRef.current.textContent = displayInfo.displayText;
    }
  }, [displayInfo.displayText, isEditing]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isEditing && onSelect) {
        onSelect();
      }
    },
    [isEditing, onSelect]
  );

  /**
   * In read-only preview a long name is truncated and the only way to read it
   * in full is the native title, which needs a hover and never appears on
   * touch. A click expands the chip in place instead.
   */
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (readOnly && displayInfo.showTitle) setIsExpanded((wasExpanded) => !wasExpanded);
    },
    [readOnly, displayInfo.showTitle]
  );

  const clickProps = singleClickToEdit
    ? { onClick: handleEditTrigger }
    : { onClick: handleClick, onDoubleClick: handleEditTrigger };

  return (
    <>
      <span
        ref={chipRef}
        className={cn(
          "courier-variable-chip",
          isExpanded && "courier-variable-chip-expanded",
          readOnly && displayInfo.showTitle && "courier-cursor-pointer",
          !isInvalid && value && "courier-variable-chip-has-value",
          isInvalid && "courier-variable-chip-invalid",
          isSelected && "courier-variable-chip-selected",
          className
        )}
        style={{ direction: "ltr" }}
        onMouseDown={handleMouseDown}
        {...clickProps}
        title={displayInfo.showTitle ? displayInfo.fullText : undefined}
      >
        <span className="courier-flex-shrink-0 courier-flex courier-items-center">{icon}</span>
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
            ...formattingStyle,
            ...(formattingStyle?.fontStyle === "italic" && { paddingRight: "0.15em" }),
            // Everything else lives on `.courier-variable-chip > span:last-child`
            // in styles.css, so the HTML-string chip gets the same treatment.
            // Only the editing override is stateful.
            ...(isEditing && { textOverflow: "clip" as const }),
          }}
        >
          {/* Don't render children when editing - let DOM manage contentEditable */}
          {!isEditing && (isExpanded ? displayInfo.fullText : displayInfo.displayText)}
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
            isHelper={(item) => HELPER_SET.has(item) && !allSuggestions.includes(item)}
            hintFor={(item) => {
              const sig = getHelperSignature(item);
              return sig ? formatSignature(item, sig) : undefined;
            }}
          />,
          chipRef.current?.closest(".theme-container") || document.body
        )}
    </>
  );
};
