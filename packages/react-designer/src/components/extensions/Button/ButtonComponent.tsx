import { cn } from "@/lib";
import { NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { useCallback } from "react";
import { SortableItemWrapper } from "../../ui/SortableItemWrapper";
import { setSelectedNodeAtom } from "../../ui/TextMenu/store";
import { safeGetNodeAtPos } from "../../utils";
import type { ButtonProps } from "./Button.types";

export const ButtonComponent: React.FC<
  ButtonProps & {
    nodeKey?: string;
    selected?: boolean;
    fontWeight?: string;
    isUnderline?: boolean;
    isStrike?: boolean;
    children?: React.ReactNode;
  }
> = ({
  alignment,
  size,
  backgroundColor,
  textColor,
  borderWidth,
  borderRadius,
  borderColor,
  padding,
  fontWeight,
  fontStyle,
  children,
}) => {
  return (
    <div className="courier-w-full node-element">
      <div
        className="courier-flex"
        style={{ marginTop: `${padding}px`, marginBottom: `${padding}px` }}
      >
        <div
          className={cn(
            "courier-inline-flex courier-justify-center courier-px-4 courier-py-2 courier-cursor-text courier-text-base",
            {
              left: "courier-mr-auto",
              center: "courier-mx-auto",
              right: "courier-ml-auto",
            }[alignment],
            size === "full" && "courier-w-full"
          )}
          style={{
            backgroundColor,
            color: textColor,
            borderWidth: `${borderWidth}px`,
            borderRadius: `${borderRadius}px`,
            borderColor,
            borderStyle: borderWidth > 0 ? "solid" : "none",
            caretColor: textColor, // Use text color for cursor or default
            fontWeight,
            fontStyle,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export const ButtonComponentNode = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);

  const handleSelect = useCallback(() => {
    if (!props.editor.isEditable) {
      return;
    }

    const node = safeGetNodeAtPos(props);
    if (node) {
      // Don't blur if we are clicking inside to edit text
      // props.editor.commands.blur();
      const nodeId = node.attrs.id;
      props.editor.state.doc.descendants((currentNode) => {
        if (currentNode.type.name === "button" && currentNode.attrs.id === nodeId) {
          setSelectedNode(currentNode);
          return false; // Stop traversal
        }
        return true; // Continue traversal
      });
    }
  }, [props, setSelectedNode]);

  return (
    <SortableItemWrapper
      id={props.node.attrs.id}
      className={cn(props.node.attrs.isSelected && "selected-element")}
      onClick={handleSelect}
      editor={props.editor}
      data-node-type="button"
    >
      <ButtonComponent {...(props.node.attrs as ButtonProps)}>
        <NodeViewContent as="span" />
      </ButtonComponent>
    </SortableItemWrapper>
  );
};
