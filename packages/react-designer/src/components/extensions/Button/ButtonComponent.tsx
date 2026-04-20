import { cn } from "@/lib";
import { NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { useCallback, useEffect, useState } from "react";
import { SortableItemWrapper } from "../../ui/SortableItemWrapper";
import { setSelectedNodeAtom } from "../../ui/TextMenu/store";
import { safeGetNodeAtPos } from "../../utils";
import { useBrandColorResolver } from "@/lib/utils/brandColors";
import type { ButtonProps } from "./Button.types";
import { isOutlinedInboxBackground } from "./inboxButtonStyle";

export const ButtonComponent: React.FC<
  ButtonProps & {
    nodeKey?: string;
    selected?: boolean;
    children?: React.ReactNode;
    isPreviewMode?: boolean;
    link?: string;
  }
> = ({
  alignment,
  backgroundColor,
  textColor,
  borderRadius,
  paddingVertical,
  paddingHorizontal,
  children,
  isPreviewMode,
  link,
}) => {
  const resolveColor = useBrandColorResolver();
  const resolvedBg = resolveColor(backgroundColor);
  const resolvedText = textColor ? resolveColor(textColor) : textColor;
  // Outlined style (white background) needs a visible border so the button
  // doesn't disappear against light editor/email surfaces. Keep a 1px border
  // for the filled case as well (transparent) so the overall box size matches
  // ButtonRow's EditableButton, which always renders a 1px border — otherwise
  // a lone inbox button ends up 2px smaller than the paired buttons.
  const isOutlinedStyle = isOutlinedInboxBackground(backgroundColor);
  const style = {
    backgroundColor: resolvedBg,
    color: resolvedText,
    borderRadius: `${borderRadius}px`,
    caretColor: resolvedText,
    padding: `${Number(paddingVertical)}px ${Number(paddingHorizontal)}px`,
    border: `1px solid ${isOutlinedStyle ? (resolvedText ?? "#000000") : "transparent"}`,
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
