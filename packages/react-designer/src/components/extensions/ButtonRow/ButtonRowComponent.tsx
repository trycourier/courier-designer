import { cn } from "@/lib";
import { type NodeViewProps } from "@tiptap/react";
import { useAtomValue, useSetAtom } from "jotai";
import React, {
  useCallback,
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  type KeyboardEvent,
} from "react";
import { variableValuesAtom } from "../../TemplateEditor/store";
import { SortableItemWrapper } from "../../ui/SortableItemWrapper";
import { setSelectedNodeAtom } from "../../ui/TextMenu/store";
import { safeGetNodeAtPos } from "../../utils";
import { isValidVariableName } from "../../utils/validateVariableName";
import { VariableChipIcon } from "../../ui/VariableEditor/shared";
import { actionLookClassName } from "../Button/actionLook";
import type { IActionButtonStyle } from "@/types/elemental.types";
import type { ButtonRowProps } from "./ButtonRow.types";

type LabelPart = { type: "text"; content: string } | { type: "variable"; name: string };

const parseLabel = (label: string): LabelPart[] => {
  if (!label) return [];

  const parts: LabelPart[] = [];
  const variableRegex = /\{\{([^}]+)\}\}/g;
  let lastIndex = 0;
  let match;

  variableRegex.lastIndex = 0;

  while ((match = variableRegex.exec(label)) !== null) {
    if (!match[0].startsWith("{{") || !match[0].endsWith("}}")) {
      continue;
    }

    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: label.substring(lastIndex, match.index),
      });
    }

    const variableName = match[1].trim();
    if (isValidVariableName(variableName)) {
      parts.push({
        type: "variable",
        name: variableName,
      });
    } else {
      parts.push({
        type: "text",
        content: match[0],
      });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < label.length) {
    parts.push({
      type: "text",
      content: label.substring(lastIndex),
    });
  }

  return parts;
};

const ButtonLabelDisplay: React.FC<{ parts: LabelPart[] }> = ({ parts }) => {
  const variableValues = useAtomValue(variableValuesAtom);

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <span key={index}>{part.content}</span>;
        }

        const value = variableValues[part.name];
        const bgColor = value ? "#EFF6FF" : "#FFFBEB";
        const borderColor = value ? "#BFDBFE" : "#FDE68A";
        const iconColor = value ? undefined : "#B45309";

        return (
          <span
            key={index}
            className="courier-inline-flex courier-items-center courier-gap-0.5 courier-rounded courier-border courier-px-2 courier-py-px courier-text-sm courier-variable-node courier-max-w-full courier-variable-in-button"
            style={{
              backgroundColor: bgColor,
              borderColor: borderColor,
              color: "#000000",
            }}
          >
            <VariableChipIcon color={iconColor} />
            <span className="courier-truncate courier-min-w-0" style={{ color: "#000000" }}>
              {part.name}
              {value ? `="${value}"` : ""}
            </span>
          </span>
        );
      })}
    </>
  );
};

interface EditableButtonProps {
  label: string;
  /** Elemental `action.style`. Decides whether the colour is a fill, an outline, or a rule. */
  actionStyle?: IActionButtonStyle;
  onLabelChange: (newLabel: string) => void;
  editable: boolean;
}

const EditableButton: React.FC<EditableButtonProps> = ({
  label,
  actionStyle,
  onLabelChange,
  editable,
}) => {
  // Same rules the renderers apply: the colour is a fill, an outline, or a rule depending on
  // A row is Inbox-only, so it takes no colour from the node — not the schema's defaults, and
  // not a colour a previous version of the designer wrote into the template either. The style
  // alone decides the look, drawn the way the Inbox draws it, so what an author sees here is
  // what a device shows for a message that never named a colour.
  const lookClass = actionLookClassName(actionStyle);
  const buttonRef = useRef<HTMLDivElement>(null);
  const lastLabelRef = useRef(label);
  const isUserEditingRef = useRef(false);
  const [isFocused, setIsFocused] = useState(false);
  const parts = parseLabel(label);
  const hasVariables = parts.some((p) => p.type === "variable");

  // Only show variable chips when not focused - allow editing while focused
  const showVariableChips = hasVariables && !isFocused;

  // Clear leftover text nodes synchronously when switching to variable chip mode
  // useLayoutEffect runs before browser paint, preventing visual flicker
  useLayoutEffect(() => {
    if (!buttonRef.current || !showVariableChips) return;

    // Clear any leftover text from when it was contentEditable
    const textNodes = Array.from(buttonRef.current.childNodes).filter(
      (node) => node.nodeType === Node.TEXT_NODE
    );
    textNodes.forEach((node) => node.remove());
  }, [showVariableChips, label]);

  // Track previous showVariableChips to detect mode changes
  const prevShowVariableChipsRef = useRef(showVariableChips);
  const isInitialMountRef = useRef(true);

  // Initialize content and sync from external changes only
  useEffect(() => {
    if (!buttonRef.current || showVariableChips) {
      prevShowVariableChipsRef.current = showVariableChips;
      return;
    }

    // Detect if we just switched from chip mode to edit mode
    const justSwitchedToEditMode = prevShowVariableChipsRef.current && !showVariableChips;
    prevShowVariableChipsRef.current = showVariableChips;

    // Only update textContent if:
    // 1. Initial mount (first render in edit mode), OR
    // 2. We just switched from chip mode to edit mode, OR
    // 3. Label changed externally (not from user typing)
    const shouldSetContent =
      isInitialMountRef.current ||
      justSwitchedToEditMode ||
      (!isUserEditingRef.current && label !== lastLabelRef.current);

    if (shouldSetContent) {
      buttonRef.current.textContent = label;
    }

    isInitialMountRef.current = false;
    lastLabelRef.current = label;
  }, [label, showVariableChips]);

  const handleInput = useCallback(() => {
    // Allow input when not showing variable chips (i.e., when focused or no variables)
    if (buttonRef.current && !showVariableChips) {
      isUserEditingRef.current = true;
      const newLabel = buttonRef.current.textContent || "";
      lastLabelRef.current = newLabel;
      onLabelChange(newLabel);
      // Reset the flag after a short delay to allow for state updates
      requestAnimationFrame(() => {
        isUserEditingRef.current = false;
      });
    }
  }, [onLabelChange, showVariableChips]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      // When showing variable chips (not focused), block keyboard input
      // This prevents TipTap from replacing the node when typing
      if (showVariableChips) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        buttonRef.current?.blur();
      }
      // Handle Cmd+A / Ctrl+A to select only content within this button
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        e.preventDefault();
        e.stopPropagation();
        if (buttonRef.current) {
          const range = document.createRange();
          range.selectNodeContents(buttonRef.current);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }
    },
    [showVariableChips]
  );

  // Handle focus to track when user is editing
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // Track pointer to constrain selection within button
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const buttonElement = buttonRef.current;
      if (!buttonElement) return;

      // When showing variable chips, focus the button to enable editing
      // This will switch to contentEditable mode
      if (showVariableChips && editable) {
        e.stopPropagation();
        // Don't prevent default - we want the focus to happen naturally
        // The focus will trigger setIsFocused(true) which will switch to edit mode
        setTimeout(() => {
          buttonElement.focus();
          // Place cursor at end of text
          const range = document.createRange();
          range.selectNodeContents(buttonElement);
          range.collapse(false);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }, 0);
        return;
      }

      if (!editable) return;

      const checkAndConstrainSelection = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const startInButton = buttonElement.contains(range.startContainer);
        const endInButton = buttonElement.contains(range.endContainer);

        // If selection extends outside button, select all text within button instead
        if (startInButton && !endInButton) {
          const newRange = document.createRange();
          newRange.selectNodeContents(buttonElement);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        // Check if mouseup is outside the button
        const rect = buttonElement.getBoundingClientRect();
        const isOutside =
          upEvent.clientX < rect.left ||
          upEvent.clientX > rect.right ||
          upEvent.clientY < rect.top ||
          upEvent.clientY > rect.bottom;

        if (isOutside) {
          checkAndConstrainSelection();
        }

        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mouseup", handleMouseUp);
    },
    [editable, showVariableChips]
  );

  // When showing variable chips, render ButtonLabelDisplay
  // When editing (focused or no variables), content is set via textContent
  const content = showVariableChips ? (
    <ButtonLabelDisplay parts={parts} />
  ) : editable ? null : (
    label
  );

  // Handle click to also stop propagation when showing variable chips
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (showVariableChips && editable) {
        e.stopPropagation();
      }
    },
    [showVariableChips, editable]
  );

  return (
    <div
      ref={buttonRef}
      contentEditable={editable && !showVariableChips}
      suppressContentEditableWarning
      // Make focusable even when showing variable chips so clicking enables edit mode
      tabIndex={editable && showVariableChips ? 0 : undefined}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={cn(
        // px-2.5 / py-1.5 is the kit's own 10px/6px base padding. A link overrides it to none
        // through the inline style below, which wins over the class.
        "courier-inline-flex courier-justify-start courier-outline-none courier-button-label-editable",
        lookClass,
        editable && !showVariableChips && "courier-cursor-text"
      )}
      style={{
        borderRadius: "4px",
        WebkitUserSelect: "text",
        userSelect: "text",
      }}
    >
      {content}
    </div>
  );
};

export const ButtonRowComponent: React.FC<
  ButtonRowProps & {
    onButton1LabelChange?: (label: string) => void;
    onButton2LabelChange?: (label: string) => void;
    editable?: boolean;
  }
> = ({
  button1Label,
  button1Link: _button1Link,
  button1ActionStyle,
  button2Label,
  button2Link: _button2Link,
  button2ActionStyle,
  onButton1LabelChange,
  onButton2LabelChange,
  editable = false,
}) => {
  return (
    <div className="node-element">
      {/* The kit's own row spacing — see `.courier-inbox-actions`. Matching it is what keeps a
          single action and a pair in the same place when the second is toggled. */}
      <div className="courier-inbox-actions">
        <EditableButton
          key="button1"
          label={button1Label}
          actionStyle={button1ActionStyle}
          onLabelChange={onButton1LabelChange || (() => {})}
          editable={editable}
        />
        <EditableButton
          key="button2"
          label={button2Label}
          actionStyle={button2ActionStyle}
          onLabelChange={onButton2LabelChange || (() => {})}
          editable={editable}
        />
      </div>
    </div>
  );
};

export const ButtonRowComponentNode = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);

  const handleSelect = useCallback(() => {
    if (!props.editor.isEditable) {
      return;
    }

    const node = safeGetNodeAtPos(props);
    if (node) {
      setSelectedNode(node);
    }
  }, [props, setSelectedNode]);

  const handleButton1LabelChange = useCallback(
    (newLabel: string) => {
      props.updateAttributes({ button1Label: newLabel });
    },
    [props]
  );

  const handleButton2LabelChange = useCallback(
    (newLabel: string) => {
      props.updateAttributes({ button2Label: newLabel });
    },
    [props]
  );

  return (
    <SortableItemWrapper
      id={props.node.attrs.id}
      className={cn(props.node.attrs.isSelected && "selected-element")}
      onClick={handleSelect}
      editor={props.editor}
      data-node-type="buttonRow"
    >
      <ButtonRowComponent
        {...(props.node.attrs as ButtonRowProps)}
        onButton1LabelChange={handleButton1LabelChange}
        onButton2LabelChange={handleButton2LabelChange}
        editable={props.editor.isEditable}
      />
    </SortableItemWrapper>
  );
};
