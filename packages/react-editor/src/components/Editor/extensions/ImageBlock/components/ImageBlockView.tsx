import { setSelectedNodeAtom } from "@/components/Editor/components/TextMenu/store";
import { cn } from "@/lib/utils";
import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { useCallback } from "react";
import type { ImageBlockProps } from "../ImageBlock.types";

export const ImageBlockComponent: React.FC<
  ImageBlockProps & {
    nodeKey?: string;
    selected?: boolean;
    draggable?: boolean;
  }
> = ({
  sourcePath,
  alt,
  alignment,
  size,
  width,
  borderWidth,
  borderRadius,
  borderColor,
  margin,
  isUploading,
}) => {
    const ImageElement = (
      <img
        src={sourcePath}
        alt={alt}
        className={cn(
          "max-w-full h-auto",
          {
            left: "mr-auto",
            center: "mx-auto",
            right: "ml-auto",
          }[alignment],
          size === "full" && "object-cover",
          isUploading && "opacity-50"
        )}
        style={{
          width: size === "full" ? "100%" : `${width}px`,
          borderWidth: `${borderWidth}px`,
          borderRadius: `${borderRadius}px`,
          borderColor,
          borderStyle: borderWidth > 0 ? "solid" : "none",
        }}
        draggable={false}
      />
    );

    return (
      <div className="w-full" style={{ marginTop: `${margin}px`, marginBottom: `${margin}px` }}>
        <div className="flex">
          {ImageElement}
        </div>
      </div>
    );
  };

export const ImageBlockView = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);

  const handleSelect = useCallback(() => {
    const pos = props.getPos();
    const node = props.editor.state.doc.nodeAt(pos);
    if (node) {
      props.editor.commands.blur()
      setSelectedNode(node);
    }
  }, [props.editor, props.getPos]);

  return (
    <NodeViewWrapper className={cn(props.node.attrs.isSelected && 'selected-element')} onClick={handleSelect}>
      <ImageBlockComponent
        {...(props.node.attrs as ImageBlockProps)}
      />
    </NodeViewWrapper>
  );
};
