import { cn } from "@/lib";
import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import React, { useCallback } from "react";
import type { ButtonProps } from "./Button.types";

export const ButtonComponent: React.FC<
  ButtonProps & {
    nodeKey?: string;
    selected?: boolean;
    draggable?: boolean;
    onSelect?: () => void;
    onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  }
> = ({
  label,
  alignment,
  size,
  backgroundColor,
  textColor,
  borderWidth,
  borderRadius,
  borderColor,
  margin,
  draggable,
  onSelect,
  onDragStart,
}) => {
    return (
      <div className="w-full flex" onClick={onSelect} style={{ marginTop: `${margin}px`, marginBottom: `${margin}px` }}>
        <div
          className={cn(
            "inline-flex justify-center px-4 py-2 cursor-pointer text-base",
            {
              left: "mr-auto",
              center: "mx-auto",
              right: "ml-auto",
            }[alignment],
            size === "full" && "w-full"
          )}
          style={{
            backgroundColor,
            color: textColor,
            borderWidth: `${borderWidth}px`,
            borderRadius: `${borderRadius}px`,
            borderColor,
            borderStyle: borderWidth > 0 ? "solid" : "none",
          }}
          draggable={draggable}
          onDragStart={onDragStart}
        >
          {label}
        </div>
      </div>
    );
  };

export const ButtonComponentNode = (props: NodeViewProps) => {
  const handleSelect = useCallback(() => {
    const pos = props.getPos();
    if (typeof pos === "number") {
      props.editor.commands.setSelectedNode(pos);
    }
  }, [props.editor, props.getPos]);

  return (
    <NodeViewWrapper>
      <ButtonComponent
        {...(props.node.attrs as ButtonProps)}
        onSelect={handleSelect}
      />
    </NodeViewWrapper>
  );
};
