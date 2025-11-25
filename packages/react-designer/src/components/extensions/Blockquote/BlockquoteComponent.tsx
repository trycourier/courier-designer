import { SortableItemWrapper } from "@/components/ui/SortableItemWrapper";
import { cn } from "@/lib";
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { useCallback, useEffect, useRef } from "react";
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
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Select the blockquote whenever it receives any click (including on inner text)
  const selectBlockquote = useCallback(() => {
    if (!props.editor.isEditable) {
      return;
    }

    const node = safeGetNodeAtPos(props);
    if (node) {
      setSelectedNode(node);
      props.editor.commands.updateSelectionState(node);
    }
  }, [props, setSelectedNode]);

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

      // Don't intercept clicks on contenteditable areas - let ProseMirror handle them
      if (target.closest('[contenteditable="true"]')) {
        selectBlockquote();
        return;
      }

      // For clicks on the blockquote container (not on text), prevent default
      // to avoid ProseMirror moving the cursor
      event.preventDefault();
      event.stopPropagation();

      // Focus the editor and select the blockquote
      props.editor.commands.focus();
      selectBlockquote();
    };

    // Use capture phase to get the event before it bubbles
    wrapper.addEventListener("click", handleClick, true);

    return () => {
      wrapper.removeEventListener("click", handleClick, true);
    };
  }, [selectBlockquote, props.editor.commands]);

  const isEmpty = !props.node.content || props.node.content.size === 0;

  return (
    <NodeViewWrapper ref={wrapperRef}>
      <SortableItemWrapper
        id={props.node.attrs.id}
        className={cn(props.node.attrs.isSelected && "selected-element", isEmpty && "is-empty")}
        editor={props.editor}
      >
        <BlockquoteComponent {...(props.node.attrs as BlockquoteProps)} />
      </SortableItemWrapper>
    </NodeViewWrapper>
  );
};
