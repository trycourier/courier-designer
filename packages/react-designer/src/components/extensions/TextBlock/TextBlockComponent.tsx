import { type NodeViewProps, NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { cn } from "@/lib";
import { useSetAtom, useAtomValue } from "jotai";
import React, { useCallback } from "react";
import { SortableItemWrapper } from "../../ui/SortableItemWrapper";
import { setSelectedNodeAtom } from "../../ui/TextMenu/store";
import { safeGetPos, safeGetNodeAtPos } from "../../utils";
import { isDraggingAtom } from "../../TemplateEditor/store";
import type { TextBlockProps } from "./TextBlock.types";

type AllowedTags = "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export const TextBlockComponent: React.FC<
  TextBlockProps & {
    nodeKey?: string;
    selected?: boolean;
    level?: number;
    type?: string;
  }
> = ({
  paddingVertical,
  paddingHorizontal,
  textAlign,
  backgroundColor,
  borderWidth,
  borderColor,
  level,
  type,
}) => {
  const tag = type === "heading" ? (`h${level}` as AllowedTags) : "p";
  const isDragging = useAtomValue(isDraggingAtom);

  return (
    <div className="courier-w-full node-element">
      <div
        style={{
          padding: `${paddingVertical}px ${paddingHorizontal}px`,
          textAlign,
          backgroundColor,
          borderWidth: `${borderWidth}px`,
          borderColor,
          borderStyle: borderWidth > 0 ? "solid" : "none",
        }}
      >
        <div
          style={{
            pointerEvents: isDragging ? "none" : "auto",
          }}
        >
          <NodeViewContent as={tag} />
        </div>
      </div>
    </div>
  );
};

export const TextBlockComponentNode = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);

  const handleSelect = useCallback(() => {
    if (!props.editor.isEditable) {
      return;
    }

    const node = safeGetNodeAtPos(props);
    if (node) {
      setSelectedNode(node);
    }
  }, [props, setSelectedNode]);

  const isEmpty = !props.node.content || props.node.content.size === 0;

  const pos = safeGetPos(props.getPos);
  const $pos = pos !== null ? props.editor.state.doc.resolve(pos) : null;
  const isBlockquote = $pos?.parent.type.name === "blockquote";
  const isListItem = $pos?.parent.type.name === "listItem";

  // For text blocks inside blockquote or list items, don't add selected-element class
  // The parent's SortableItemWrapper handles the selection styling
  if (isBlockquote || isListItem) {
    return (
      <NodeViewWrapper>
        <TextBlockComponent {...(props.node.attrs as TextBlockProps)} type={props.node.type.name} />
      </NodeViewWrapper>
    );
  }

  return (
    <SortableItemWrapper
      id={props.node.attrs.id}
      className={cn(props.node.attrs.isSelected && "selected-element", isEmpty && "is-empty")}
      onClick={handleSelect}
      editor={props.editor}
    >
      <TextBlockComponent {...(props.node.attrs as TextBlockProps)} type={props.node.type.name} />
    </SortableItemWrapper>
  );
};
