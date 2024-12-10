// import { cn } from "@/lib";
import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import React, { useCallback } from "react";
import type { SpacerProps } from "./Spacer.types";

export const SpacerComponent: React.FC<
  SpacerProps & {
    nodeKey?: string;
    selected?: boolean;
    draggable?: boolean;
    onSelect?: () => void;
    onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  }
> = ({
  margin,
  //   size,
  color,
  width,
  radius,
  draggable,
  onSelect,
  onDragStart,
}) => {
  return (
    // <div className="w-full flex" onClick={onSelect}>
    //   <div
    //     className={cn("w-full my-2", size === "full" && "w-full")}
    //     style={{
    //       marginTop: `${margin}px`,
    //       marginBottom: `${margin}px`,
    //     }}
    //     draggable={draggable}
    //     onDragStart={onDragStart}
    //   >
    <hr
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onSelect}
      style={{
        marginTop: `${margin}px`,
        marginBottom: `${margin}px`,
        backgroundColor: color,
        height: `${width}px`,
        borderRadius: `${radius}px`,
        border: "none",
      }}
    />
    //   </div>
    // </div>
  );
};

export const SpacerComponentNode = (props: NodeViewProps) => {
  const handleSelect = useCallback(() => {
    const pos = props.getPos();
    if (typeof pos === "number") {
      props.editor.commands.setNodeSelection(pos);
    }
  }, [props.editor, props.getPos]);

  return (
    <NodeViewWrapper>
      <SpacerComponent
        {...(props.node.attrs as SpacerProps)}
        onSelect={handleSelect}
      />
    </NodeViewWrapper>
  );
};
