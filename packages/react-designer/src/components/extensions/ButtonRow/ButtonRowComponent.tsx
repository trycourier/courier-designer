import { cn } from "@/lib";
import { type NodeViewProps } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { useCallback } from "react";
import { SortableItemWrapper } from "../../ui/SortableItemWrapper";
import { setSelectedNodeAtom } from "../../ui/TextMenu/store";
import type { ButtonRowProps } from "./ButtonRow.types";
import { safeGetNodeAtPos } from "../../utils";

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
          {button1Label}
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
          {button2Label}
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
