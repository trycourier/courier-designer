import { SortableItemWrapper } from "@/components/ui/SortableItemWrapper";
import { cn } from "@/lib";
import { NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { useCallback } from "react";
import { setSelectedNodeAtom } from "../../ui/TextMenu/store";
import type { BlockquoteProps } from "./Blockquote.types";
import { safeGetNodeAtPos } from "../../utils";

export const BlockquoteComponent: React.FC<BlockquoteProps> = ({
  paddingHorizontal,
  paddingVertical,
  backgroundColor,
  borderLeftWidth,
  borderColor,
}) => (
  <div className="courier-w-full node-element">
    <div
      style={{
        zIndex: -15,
        position: "relative",
        padding: `${paddingVertical}px ${paddingHorizontal}px`,
        backgroundColor,
        borderLeftWidth: `${borderLeftWidth}px`,
        borderColor,
        borderStyle: borderLeftWidth > 0 ? "solid" : "none",
        whiteSpace: "pre-wrap",
      }}
    >
      <NodeViewContent />
    </div>
  </div>
);

export const BlockquoteComponentNode = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);

  const handleSelect = useCallback(
    (event: React.MouseEvent) => {
      if (!props.editor.isEditable) {
        return;
      }

      // Check if the click was on the blockquote container itself (not on the editable content)
      const target = event.target as HTMLElement;
      const isClickOnContent = target.closest('[contenteditable="true"]');

      // Only blur and select if clicking on the container/border, not the content
      if (!isClickOnContent) {
        const node = safeGetNodeAtPos(props);
        if (node) {
          props.editor.commands.blur();
          setSelectedNode(node);
        }
      }
      // If clicking on content, let the editor handle focus naturally
    },
    [props, setSelectedNode]
  );

  const isEmpty = !props.node.content || props.node.content.size === 0;

  return (
    <SortableItemWrapper
      id={props.node.attrs.id}
      className={cn(props.node.attrs.isSelected && "selected-element", isEmpty && "is-empty")}
      onClick={handleSelect}
      editor={props.editor}
    >
      <BlockquoteComponent {...(props.node.attrs as BlockquoteProps)} />
    </SortableItemWrapper>
  );
};
