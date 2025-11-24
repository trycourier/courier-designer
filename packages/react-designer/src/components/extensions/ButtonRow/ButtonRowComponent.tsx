import { cn } from "@/lib";
import { type NodeViewProps } from "@tiptap/react";
import { useAtomValue, useSetAtom } from "jotai";
import React, { useCallback } from "react";
import { variableValuesAtom } from "../../TemplateEditor/store";
import { SortableItemWrapper } from "../../ui/SortableItemWrapper";
import { setSelectedNodeAtom } from "../../ui/TextMenu/store";
import { safeGetNodeAtPos } from "../../utils";
import { isValidVariableName } from "../../utils/validateVariableName";
import { VariableIcon } from "../Variable/VariableIcon";
import type { ButtonRowProps } from "./ButtonRow.types";

type LabelPart = { type: "text"; content: string } | { type: "variable"; name: string };

const ButtonLabel: React.FC<{ label: string }> = ({ label }) => {
  const variableValues = useAtomValue(variableValuesAtom);

  if (!label) return null;

  const parts: LabelPart[] = [];
  const variableRegex = /\{\{([^}]+)\}\}/g;
  let lastIndex = 0;
  let match;

  // Reset regex
  variableRegex.lastIndex = 0;

  while ((match = variableRegex.exec(label)) !== null) {
    // Ensure we have a complete match with both opening and closing braces
    if (!match[0].startsWith("{{") || !match[0].endsWith("}}")) {
      continue;
    }

    // Add text before the variable if it exists
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

  // Add remaining text
  if (lastIndex < label.length) {
    parts.push({
      type: "text",
      content: label.substring(lastIndex),
    });
  }

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

export const ButtonRowComponent: React.FC<ButtonRowProps> = ({
  button1Label,
  button1Link: _button1Link,
  button1BackgroundColor,
  button1TextColor,
  button2Label,
  button2Link: _button2Link,
  button2BackgroundColor,
  button2TextColor,
  padding = 6,
}) => {
  return (
    <div className="node-element">
      <div
        className="courier-flex courier-gap-1 courier-justify-start"
        style={{ marginTop: `${padding}px`, marginBottom: `${padding}px` }}
      >
        <div
          className={cn(
            "courier-inline-flex courier-justify-start courier-px-2 courier-py-1 courier-cursor-pointer courier-text-sm courier-rounded-sm courier-border courier-border-border"
          )}
          style={{
            backgroundColor: button1BackgroundColor,
            color: button1TextColor,
            borderColor: "#000000",
            borderRadius: "4px",
          }}
        >
          <ButtonLabel label={button1Label} />
        </div>
        <div
          className={cn(
            "courier-inline-flex courier-justify-start courier-px-2 courier-py-1 courier-cursor-pointer courier-text-sm courier-rounded-sm courier-border courier-border-border"
          )}
          style={{
            backgroundColor: button2BackgroundColor,
            color: button2TextColor,
            borderColor: "#000000",
            borderRadius: "4px",
          }}
        >
          <ButtonLabel label={button2Label} />
        </div>
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
      props.editor.commands.blur();
      setSelectedNode(node);
    }
  }, [props, setSelectedNode]);

  return (
    <SortableItemWrapper
      id={props.node.attrs.id}
      className={cn(props.node.attrs.isSelected && "selected-element")}
      onClick={handleSelect}
      editor={props.editor}
      data-node-type="buttonRow"
    >
      <ButtonRowComponent {...(props.node.attrs as ButtonRowProps)} />
    </SortableItemWrapper>
  );
};
