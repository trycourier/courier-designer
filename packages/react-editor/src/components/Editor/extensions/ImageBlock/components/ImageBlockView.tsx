import { cn } from "@/lib/utils";
import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import React, { useCallback } from "react";
import type { ImageBlockProps } from "../ImageBlock.types";

export const ImageBlockComponent: React.FC<
  ImageBlockProps & {
    nodeKey?: string;
    selected?: boolean;
    draggable?: boolean;
    onSelect?: () => void;
    onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
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
  // draggable,
  onSelect,
  onDragStart,
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
        onDragStart={onDragStart}
      />
    );

    return (
      <div className="w-full" style={{ marginTop: `${margin}px`, marginBottom: `${margin}px` }}>
        <div className="flex" onClick={onSelect}>
          {ImageElement}
        </div>
      </div>
    );
  };

export const ImageBlockView = (props: NodeViewProps) => {
  const handleSelect = useCallback(() => {
    const pos = props.getPos();
    if (typeof pos === "number") {
      props.editor.commands.setSelectedNode(pos);
    }
  }, [props.editor, props.getPos]);

  return (
    <NodeViewWrapper onClick={handleSelect}>
      <ImageBlockComponent
        {...(props.node.attrs as ImageBlockProps)}
      />
    </NodeViewWrapper>
  );
};
