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
import { actionLookClassName, actionLookFromStyle } from "./actionLook";

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
  // Only an Inbox action carries a style, and only it takes the kit's look and sizing. An email
  // button keeps the colors, radius and padding its author set.
  const isInboxAction = actionStyle !== undefined;
  const lookClass = isInboxAction ? actionLookClassName(actionStyle) : undefined;

  // An Inbox action takes no color from the node at all. The node still carries the Button
  // schema's defaults — `#0085FF`, the email button's fill — and an inline value beats the
  // class, so passing them through painted every Inbox button blue. The style decides the look,
  // which is the whole point of not saving colors in the first place.
  //
  // For an email button the color is the author's: `background_color` is the accent, and the
  // style says whether it is the fill, the outline or the underline.
  const look = isInboxAction
    ? {}
    : actionLookFromStyle(
        actionStyle,
        backgroundColor ? resolvedBg : undefined,
        textColor ? resolvedText : undefined
      );
  const style = {
    // Omitted for an Inbox action so the kit's own radius and padding apply from the class —
    // an inline value here would win over it, and the node's defaults are the email button's.
    ...(isInboxAction
      ? {}
      : {
          borderRadius: `${borderRadius}px`,
          padding: `${Number(paddingVertical)}px ${Number(paddingHorizontal)}px`,
        }),
    // Label size: this button's own override, else the document base font size
    // (set as a CSS var on the email editor container), else the renderer's 14px.
    fontSize: fontSize
      ? `${fontSize}px`
      : `var(${EMAIL_EDITOR_ACTION_FONT_SIZE_VAR}, ${EMAIL_EDITOR_ACTION_FONT_SIZE_FALLBACK})`,
    // Spread last so the style's own rules win — a link overrides the padding to none.
    ...look,
    caretColor: look.color,
  };
  const buttonContent = (
    <div
      className={cn(
        "courier-inline-flex courier-justify-center courier-cursor-text courier-text-sm courier-leading-tight !courier-my-1",
        lookClass,
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
