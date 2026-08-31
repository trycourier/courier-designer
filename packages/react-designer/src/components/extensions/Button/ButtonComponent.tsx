import { cn } from "@/lib";
import { NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { useCallback, useEffect, useState } from "react";
import { SortableItemWrapper } from "../../ui/SortableItemWrapper";
import { setSelectedNodeAtom } from "../../ui/TextMenu/store";
import { safeGetNodeAtPos } from "../../utils";
import { useBrandColorResolver } from "@/lib/utils/brandColors";
import {
  EMAIL_EDITOR_ACTION_FONT_SIZE_FALLBACK,
  EMAIL_EDITOR_ACTION_FONT_SIZE_VAR,
} from "@/lib/constants/email-editor-tiptap-styles";
import type { ButtonProps } from "./Button.types";
import { actionLookFromStyle } from "./actionLook";

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
  fontSize,
  actionStyle,
  children,
  isPreviewMode,
  link,
}) => {
  const resolveColor = useBrandColorResolver();
  const resolvedBg = resolveColor(backgroundColor);
  const resolvedText = textColor ? resolveColor(textColor) : textColor;
  // Draw what the renderers draw: `background_color` is the accent, and the style says whether
  // that accent is the fill, the outline, or the underline. Every style keeps a 1px border box
  // — transparent where it draws none — so a lone button matches the height of a paired row.
  const look = actionLookFromStyle(actionStyle, resolvedBg, resolvedText);
  const style = {
    ...look,
    borderRadius: `${borderRadius}px`,
    caretColor: look.color,
    padding: `${Number(paddingVertical)}px ${Number(paddingHorizontal)}px`,
    // Label size: this button's own override, else the document base font size
    // (set as a CSS var on the email editor container), else the renderer's 14px.
    fontSize: fontSize
      ? `${fontSize}px`
      : `var(${EMAIL_EDITOR_ACTION_FONT_SIZE_VAR}, ${EMAIL_EDITOR_ACTION_FONT_SIZE_FALLBACK})`,
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
      <div className="courier-w-full node-element c--block c--block-action">
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
    <div className="courier-w-full node-element c--block c--block-action">
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
