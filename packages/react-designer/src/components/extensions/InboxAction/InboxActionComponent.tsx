import { cn } from "@/lib";
import { NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { useCallback, useEffect, useState } from "react";
import { SortableItemWrapper } from "../../ui/SortableItemWrapper";
import { setSelectedNodeAtom } from "../../ui/TextMenu/store";
import { safeGetNodeAtPos } from "../../utils";
import { actionLookClassName } from "../Button/actionLook";
import type { InboxActionProps } from "./InboxAction.types";

/**
 * An Inbox action on the canvas.
 *
 * Carries no colour, padding or radius of its own — the look comes entirely from
 * `courier-inbox-action--<style>` in `styles.css`, which mirrors `CourierButtonVariants` in
 * `@trycourier/courier-ui-core` for both modes and for hover and active. So what an author sees
 * here is what the Inbox draws for a message that named no colour, which is what now gets sent.
 */
export const InboxActionComponent: React.FC<
  InboxActionProps & {
    children?: React.ReactNode;
    isPreviewMode?: boolean;
  }
> = ({ align = "left", actionStyle, link, children, isPreviewMode }) => {
  const content = (
    <div
      className={cn(
        "courier-inline-flex courier-justify-center courier-cursor-text",
        actionLookClassName(actionStyle),
        { left: "courier-mr-auto", center: "courier-mx-auto", right: "courier-ml-auto" }[align]
      )}
    >
      {children}
    </div>
  );

  if (isPreviewMode && link) {
    return (
      <div className="courier-w-full node-element c--block c--block-action">
        <div className="courier-inbox-actions">
          <a
            href={link}
            className={cn(
              "button-link-wrapper courier-no-underline",
              { left: "courier-mr-auto", center: "courier-mx-auto", right: "courier-ml-auto" }[
                align
              ]
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            {content}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="courier-w-full node-element c--block c--block-action">
      <div className="courier-inbox-actions">{content}</div>
    </div>
  );
};

export const InboxActionComponentNode = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);
  const [isEditable, setIsEditable] = useState(props.editor.isEditable);

  useEffect(() => {
    const updateEditable = () => {
      const current = props.editor.isEditable;
      setIsEditable((prev) => (prev !== current ? current : prev));
    };
    props.editor.on("transaction", updateEditable);
    props.editor.on("update", updateEditable);
    updateEditable();
    return () => {
      props.editor.off("transaction", updateEditable);
      props.editor.off("update", updateEditable);
    };
  }, [props.editor, props.node.attrs.link]);

  const handleSelect = useCallback(() => {
    if (!isEditable) return;
    const node = safeGetNodeAtPos(props);
    if (!node) return;
    const nodeId = node.attrs.id;
    props.editor.state.doc.descendants((currentNode) => {
      if (currentNode.type.name === "inboxAction" && currentNode.attrs.id === nodeId) {
        setSelectedNode(currentNode);
        return false;
      }
      return true;
    });
  }, [props, setSelectedNode, isEditable]);

  return (
    <SortableItemWrapper
      id={props.node.attrs.id}
      className={cn(props.node.attrs.isSelected && "selected-element")}
      onClick={handleSelect}
      editor={props.editor}
      data-node-type="inboxAction"
    >
      <InboxActionComponent {...(props.node.attrs as InboxActionProps)} isPreviewMode={!isEditable}>
        <NodeViewContent as="span" />
      </InboxActionComponent>
    </SortableItemWrapper>
  );
};
