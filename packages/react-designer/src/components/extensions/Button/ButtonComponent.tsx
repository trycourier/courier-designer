import { cn } from "@/lib";
import { NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { useCallback, useEffect, useState } from "react";
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
    isPreviewMode?: boolean;
    link?: string;
  }
> = ({
  alignment,
  backgroundColor,
  textColor,
  borderRadius,
  padding,
  fontWeight,
  fontStyle,
  children,
  isPreviewMode,
  link,
}) => {
  const style = {
    backgroundColor,
    color: textColor,
    borderRadius: `${borderRadius}px`,
    caretColor: textColor, // Use text color for cursor or default
    fontWeight,
    fontStyle,
    padding: `${Number(padding) + 2}px ${Number(padding) + 10}px`,
  };
  const buttonContent = (
    <div
      className={cn(
        "courier-inline-flex courier-justify-center courier-cursor-text courier-text-sm courier-leading-tight !courier-my-1",
        {
          left: "courier-mr-auto",
          center: "courier-mx-auto",
          right: "courier-ml-auto",
        }[alignment]
      )}
      style={style}
    >
      {children}
    </div>
  );

  // In preview mode with a link, wrap button in an anchor tag
  if (isPreviewMode && link) {
    return (
      <div className="courier-w-full node-element">
        <div className="courier-flex">
          <a
            href={link}
            className={cn(
              "button-link-wrapper courier-no-underline",
              {
                left: "courier-mr-auto",
                center: "courier-mx-auto",
                right: "courier-ml-auto",
              }[alignment]
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div
              className="courier-inline-flex courier-justify-center courier-text-sm courier-leading-tight !courier-my-1"
              style={style}
            >
              {children}
            </div>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="courier-w-full node-element">
      <div className="courier-flex">{buttonContent}</div>
    </div>
  );
};

export const ButtonComponentNode = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);

  // Subscribe to editor editable state changes to re-render when preview mode toggles
  const [isEditable, setIsEditable] = useState(props.editor.isEditable);

  useEffect(() => {
    const updateEditable = () => {
      const currentEditable = props.editor.isEditable;
      setIsEditable((prevEditable) => {
        // Only update if the value actually changed
        if (prevEditable !== currentEditable) {
          return currentEditable;
        }
        return prevEditable;
      });
    };

    // Listen to multiple events to catch editable state changes
    props.editor.on("transaction", updateEditable);
    props.editor.on("update", updateEditable);

    // Initial check
    updateEditable();

    return () => {
      props.editor.off("transaction", updateEditable);
      props.editor.off("update", updateEditable);
    };
  }, [props.editor, props.node.attrs.link]);

  const handleSelect = useCallback(() => {
    if (!isEditable) {
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
  }, [props, setSelectedNode, isEditable]);

  const isPreviewMode = !isEditable;
  const link = props.node.attrs.link as string | undefined;

  return (
    <SortableItemWrapper
      id={props.node.attrs.id}
      className={cn(props.node.attrs.isSelected && "selected-element")}
      onClick={handleSelect}
      editor={props.editor}
      data-node-type="button"
    >
      <ButtonComponent
        {...(props.node.attrs as ButtonProps)}
        isPreviewMode={isPreviewMode}
        link={link}
      >
        <NodeViewContent as="span" />
      </ButtonComponent>
    </SortableItemWrapper>
  );
};
