import { SortableItemWrapper } from "@/components/Editor/components/SortableItemWrapper/SortableItemWrapper";
import { setSelectedNodeAtom } from "@/components/Editor/components/TextMenu/store";
import { cn } from "@/lib/utils";
import { type NodeViewProps } from "@tiptap/react";
import { useSetAtom } from "jotai";
import React, { useCallback, useState } from "react";
import { v4 as uuidv4 } from 'uuid';
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
      <div className="w-full node-element">
        <div className="flex" style={{ marginTop: `${margin}px`, marginBottom: `${margin}px` }}>
          {ImageElement}
        </div>
      </div>
    );
  };

export const ImageBlockView = (props: NodeViewProps) => {
  const setSelectedNode = useSetAtom(setSelectedNodeAtom);
  const [uniqueId] = useState(() => `node-${uuidv4()}`);

  const handleSelect = useCallback(() => {
    const pos = props.getPos();
    const node = props.editor.state.doc.nodeAt(pos);
    if (node) {
      props.editor.commands.blur()
      setSelectedNode(node);
    }
  }, [props.editor, props.getPos]);

  return (
    <SortableItemWrapper id={uniqueId} className={cn(props.node.attrs.isSelected && 'selected-element')} onClick={handleSelect}>
      <ImageBlockComponent
        {...(props.node.attrs as ImageBlockProps)}
      />
    </SortableItemWrapper>
  );
};
