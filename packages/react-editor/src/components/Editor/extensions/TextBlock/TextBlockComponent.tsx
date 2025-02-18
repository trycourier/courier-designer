import { cn } from "@/lib";
import { type NodeViewProps, NodeViewContent } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { useCallback } from "react";
import { SortableItemWrapper } from "../../components/SortableItemWrapper";
import { setSelectedNodeAtom } from "../../components/TextMenu/store";
import { TextBlockProps } from "./TextBlock.types";

type AllowedTags = 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export const TextBlockComponent: React.FC<
  TextBlockProps & {
    nodeKey?: string;
    selected?: boolean;
    level?: number;
    type?: string;
  }
> = ({
  padding,
  margin,
  textAlign,
  backgroundColor,
  borderWidth,
  borderRadius,
  borderColor,
  textColor,
  level,
  type,
}) => {
    const tag = type === 'heading' ? `h${level}` as AllowedTags : 'p';
    return (
      <div className="w-full node-element">
        <div
          className={cn(
            !textColor && 'is-empty'
          )}
          style={{
            padding: `${padding}px`,
            margin: `${margin}px 0px`,
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
    const pos = props.getPos();
    const node = props.editor.state.doc.nodeAt(pos);
    if (node) {
      setSelectedNode(node);
    }
  }, [props.editor, props.getPos]);

  const isEmpty = !props.node.content || props.node.content.size === 0;

  return (
    <SortableItemWrapper id={props.node.attrs.id} className={cn(props.node.attrs.isSelected && 'selected-element', isEmpty && 'is-empty')} onClick={handleSelect}>
      <TextBlockComponent
        {...(props.node.attrs as TextBlockProps)}
        type={props.node.type.name}
      />
    </SortableItemWrapper>
  );
};
