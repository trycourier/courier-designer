import { cn } from "@/lib";
import { type NodeViewProps } from "@tiptap/react";
import { useAtomValue, useSetAtom } from "jotai";
import React, { useCallback, useRef, useEffect, type KeyboardEvent } from "react";
import { variableValuesAtom } from "../../TemplateEditor/store";
import { SortableItemWrapper } from "../../ui/SortableItemWrapper";
import { setSelectedNodeAtom } from "../../ui/TextMenu/store";
import { safeGetNodeAtPos } from "../../utils";
import { isValidVariableName } from "../../utils/validateVariableName";
import { VariableIcon } from "../Variable/VariableIcon";
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
            className="courier-inline-flex courier-items-center courier-gap-0.5 courier-rounded courier-border courier-px-1.5 courier-pl-1 courier-py-[1px] courier-text-sm courier-variable-node courier-font-mono courier-max-w-full courier-tracking-[0.64px] courier-variable-in-button"
            style={{
              backgroundColor: bgColor,
              borderColor: borderColor,
              color: "#000000",
            }}
          >
            <VariableIcon color={iconColor} />
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
  backgroundColor: string;
  textColor: string;
  onLabelChange: (newLabel: string) => void;
  editable: boolean;
}

const EditableButton: React.FC<EditableButtonProps> = ({
  label,
  backgroundColor,
  textColor,
  onLabelChange,
  editable,
}) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const lastLabelRef = useRef(label);
  const isUserEditingRef = useRef(false);
  const parts = parseLabel(label);
  const hasVariables = parts.some((p) => p.type === "variable");

  // Initialize content and sync from external changes only
  useEffect(() => {
    if (!buttonRef.current || hasVariables) return;

    // Only update if label changed externally (not from user typing)
    if (!isUserEditingRef.current && label !== lastLabelRef.current) {
      buttonRef.current.textContent = label;
    }
    lastLabelRef.current = label;
  }, [label, hasVariables]);

  // Set initial content
  useEffect(() => {
    if (buttonRef.current && !hasVariables && editable) {
      buttonRef.current.textContent = label;
    }
  }, [hasVariables, editable]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInput = useCallback(() => {
    if (buttonRef.current && !hasVariables) {
      isUserEditingRef.current = true;
      const newLabel = buttonRef.current.textContent || "";
      lastLabelRef.current = newLabel;
      onLabelChange(newLabel);
      // Reset the flag after a short delay to allow for state updates
      requestAnimationFrame(() => {
        isUserEditingRef.current = false;
      });
    }
  }, [onLabelChange, hasVariables]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
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
  }, []);

  // Track pointer to constrain selection within button
  const handlePointerDown = useCallback(
    (_e: React.PointerEvent<HTMLDivElement>) => {
      if (!editable || hasVariables) return;

      const buttonElement = buttonRef.current;
      if (!buttonElement) return;

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
    [editable, hasVariables]
  );

  // For non-editable or variable content, render normally
  // For editable content without variables, use empty div (content set via ref)
  const content = hasVariables ? <ButtonLabelDisplay parts={parts} /> : editable ? null : label;

  return (
    <div
      ref={buttonRef}
      contentEditable={editable && !hasVariables}
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      className={cn(
        "courier-inline-flex courier-justify-start courier-px-2 courier-py-1 courier-text-sm courier-rounded-sm courier-border courier-border-border courier-outline-none",
        editable && !hasVariables && "courier-cursor-text"
      )}
      style={{
        backgroundColor,
        color: textColor,
        borderColor: "#000000",
        borderRadius: "4px",
        caretColor: textColor,
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
  button1BackgroundColor,
  button1TextColor,
  button2Label,
  button2Link: _button2Link,
  button2BackgroundColor,
  button2TextColor,
  padding = 6,
  onButton1LabelChange,
  onButton2LabelChange,
  editable = false,
}) => {
  return (
    <div className="node-element" style={{ userSelect: "none", WebkitUserSelect: "none" }}>
      <div
        className="courier-flex courier-gap-1 courier-justify-start"
        style={{ marginTop: `${padding}px`, marginBottom: `${padding}px` }}
      >
        <EditableButton
          label={button1Label}
          backgroundColor={button1BackgroundColor}
          textColor={button1TextColor}
          onLabelChange={onButton1LabelChange || (() => {})}
          editable={editable}
        />
        <EditableButton
          label={button2Label}
          backgroundColor={button2BackgroundColor}
          textColor={button2TextColor}
          onLabelChange={onButton2LabelChange || (() => {})}
          editable={editable}
        />
      </div>
    </div>
  );
};

export const ButtonRowComponentNode = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);
  const debounceTimerRef = useRef<{ button1?: NodeJS.Timeout; button2?: NodeJS.Timeout }>({});
  const pendingLabelsRef = useRef<{ button1?: string; button2?: string }>({});

  const handleSelect = useCallback(() => {
    if (!props.editor.isEditable) {
      return;
    }

    const node = safeGetNodeAtPos(props);
    if (node) {
      setSelectedNode(node);
    }
  }, [props, setSelectedNode]);

  // Debounced update to TipTap - only sync after user stops typing
  const handleButton1LabelChange = useCallback(
    (newLabel: string) => {
      pendingLabelsRef.current.button1 = newLabel;

      if (debounceTimerRef.current.button1) {
        clearTimeout(debounceTimerRef.current.button1);
      }

      debounceTimerRef.current.button1 = setTimeout(() => {
        if (pendingLabelsRef.current.button1 !== undefined) {
          props.updateAttributes({ button1Label: pendingLabelsRef.current.button1 });
        }
      }, 300);
    },
    [props]
  );

  const handleButton2LabelChange = useCallback(
    (newLabel: string) => {
      pendingLabelsRef.current.button2 = newLabel;

      if (debounceTimerRef.current.button2) {
        clearTimeout(debounceTimerRef.current.button2);
      }

      debounceTimerRef.current.button2 = setTimeout(() => {
        if (pendingLabelsRef.current.button2 !== undefined) {
          props.updateAttributes({ button2Label: pendingLabelsRef.current.button2 });
        }
      }, 300);
    },
    [props]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = debounceTimerRef.current;
    return () => {
      if (timers.button1) {
        clearTimeout(timers.button1);
      }
      if (timers.button2) {
        clearTimeout(timers.button2);
      }
    };
  }, []);

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
