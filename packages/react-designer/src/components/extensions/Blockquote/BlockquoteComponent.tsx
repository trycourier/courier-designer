import { SortableItemWrapper } from "@/components/ui/SortableItemWrapper";
import { cn } from "@/lib";
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useSetAtom, useAtomValue } from "jotai";
import React, { useCallback, useEffect, useRef } from "react";
import { setSelectedNodeAtom, selectedNodeAtom } from "../../ui/TextMenu/store";
import type { BlockquoteProps } from "./Blockquote.types";

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
  const selectedNode = useAtomValue(selectedNodeAtom);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Check if this blockquote is selected by comparing with the selected node atom
  const isSelected =
    selectedNode?.type?.name === "blockquote" &&
    (selectedNode?.attrs?.id === props.node.attrs.id ||
      (!selectedNode?.attrs?.id && !props.node.attrs.id && selectedNode === props.node));

  // Select the blockquote whenever it receives any click (including on inner text)
  const selectBlockquote = useCallback(() => {
    if (!props.editor.isEditable) {
      return;
    }

    // Use props.node directly since it's the blockquote node from TipTap
    const node = props.node;
    if (node) {
      setSelectedNode(node);
      props.editor.commands.updateSelectionState(node);
    }
  }, [props.editor.isEditable, props.node, props.editor.commands, setSelectedNode]);

  // Use native event listener to capture clicks before React/ProseMirror
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Don't intercept clicks on action panel buttons or drag handles
      if (target.closest(".courier-actions-panel") || target.closest("[data-no-drag-preview]")) {
        return;
      }

      // Always select the blockquote on any click inside it
      selectBlockquote();
    };

    // Use capture phase to get the event before it bubbles
    wrapper.addEventListener("click", handleClick, true);

    return () => {
      wrapper.removeEventListener("click", handleClick, true);
    };
  }, [selectBlockquote]);

  const isEmpty = !props.node.content || props.node.content.size === 0;

  return (
    <NodeViewWrapper>
      <div ref={wrapperRef}>
        <SortableItemWrapper
          id={props.node.attrs.id}
          className={cn(isSelected && "selected-element", isEmpty && "is-empty")}
          editor={props.editor}
        >
          <BlockquoteComponent {...(props.node.attrs as BlockquoteProps)} />
        </SortableItemWrapper>
      </div>
    </NodeViewWrapper>
  );
};
