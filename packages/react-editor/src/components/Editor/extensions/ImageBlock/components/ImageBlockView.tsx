import { cn } from "@/lib/utils";
import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
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
  link,
  alt,
  alignment,
  size,
  width,
  borderWidth,
  borderRadius,
  borderColor,
  isUploading,
  draggable,
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
      draggable={draggable}
      onDragStart={onDragStart}
    />
  );

  return (
    <div className="w-full">
      <div className="flex" onClick={onSelect}>
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer">
            {ImageElement}
          </a>
        ) : (
          ImageElement
        )}
      </div>
    </div>
  );
};

export const ImageBlockView = (props: NodeViewProps) => {
  const handleSelect = useCallback(() => {
    const pos = props.getPos();
    if (typeof pos === "number") {
      props.editor.commands.setNodeSelection(pos);
    }
  }, [props.editor, props.getPos]);

  return (
    <NodeViewWrapper>
      <ImageBlockComponent
        {...(props.node.attrs as ImageBlockProps)}
        onSelect={handleSelect}
      />
    </NodeViewWrapper>
  );
};
