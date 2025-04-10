import { cn } from "@/lib";
import { type NodeViewProps, NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { useCallback } from "react";
import { SortableItemWrapper } from "../../ui/SortableItemWrapper";
import { setSelectedNodeAtom } from "../../ui/TextMenu/store";
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
  borderRadius,
  borderColor,
  textColor,
  level,
  type,
}) => {
  const tag = type === "heading" ? (`h${level}` as AllowedTags) : "p";
  return (
    <div className="courier-w-full node-element">
      <div
        className={cn(!textColor && "is-empty")}
        style={{
          padding: `${paddingVertical}px ${paddingHorizontal}px`,
          textAlign,
          backgroundColor,
          borderWidth: `${borderWidth}px`,
          borderRadius: `${borderRadius}px`,
          borderColor,
          borderStyle: borderWidth > 0 ? "solid" : "none",
          color: textColor,
        }}
      >
        <NodeViewContent as={tag} />
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

    const pos = props.getPos();
    const node = props.editor.state.doc.nodeAt(pos);
    if (node) {
      setSelectedNode(node);
    }
  }, [props, setSelectedNode]);

  const isEmpty = !props.node.content || props.node.content.size === 0;

  const $pos = props.editor.state.doc.resolve(props.getPos());
  const isBlockquote = $pos.parent.type.name === "blockquote";

  if (isBlockquote) {
    return (
      <NodeViewWrapper
        className={cn(props.node.attrs.isSelected && "selected-element")}
        onClick={handleSelect}
      >
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
