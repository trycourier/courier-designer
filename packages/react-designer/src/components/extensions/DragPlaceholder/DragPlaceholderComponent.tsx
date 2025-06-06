import { cn } from "@/lib/utils";
import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import type { Transform } from "@dnd-kit/utilities";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import React, { forwardRef, useEffect, useState } from "react";

function useMountStatus() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsMounted(true), 500);
    return () => clearTimeout(timeout);
  }, []);

  return isMounted;
}

interface SortablePlaceholderProps {
  children: React.ReactNode;
  id: string;
  className?: string;
  dragOverlay?: boolean;
  handleProps?: Record<string, unknown>;
  fadeIn?: boolean;
  transform?: Transform | null;
  listeners?: DraggableSyntheticListeners;
  transition?: string | null;
}

const SortablePlaceholder = forwardRef<HTMLDivElement, SortablePlaceholderProps>(
  ({ children, className, dragOverlay, id }, ref) => {
    useEffect(() => {
      if (!dragOverlay) {
        return;
      }
      document.body.style.cursor = "grabbing";
      return () => {
        document.body.style.cursor = "";
      };
    }, [dragOverlay]);

    return (
      <NodeViewWrapper
        ref={ref}
        data-cypress="draggable-item"
        data-node-view-wrapper
        data-id={id}
        className={cn("courier-flex courier-items-start courier-gap-2 courier-pl-6", className)}
      >
        {children}
      </NodeViewWrapper>
    );
  }
);

export const DragPlaceholderComponent: React.FC<NodeViewProps> = ({ node }) => {
  const type = node.attrs.type;
  const id = node.attrs.id;

  const { setNodeRef, setActivatorNodeRef, listeners, isDragging, transform, transition } =
    useSortable({
      id,
    });

  const mounted = useMountStatus();
  const mountedWhileDragging = isDragging && !mounted;

  return (
    <SortablePlaceholder
      ref={setNodeRef}
      id={id}
      transition={transition}
      transform={transform}
      fadeIn={mountedWhileDragging}
      listeners={listeners}
      handleProps={{ ref: setActivatorNodeRef }}
    >
      <div
        className={cn(
          "courier-relative courier-flex courier-flex-grow courier-items-center courier-px-5 courier-py-[18px] courier-bg-background/50",
          "courier-border-2 courier-border-dashed courier-border-accent-foreground courier-rounded-md"
        )}
      >
        <div className="courier-text-accent-foreground">
          {type === "text"
            ? "Text"
            : type === "heading"
              ? "Heading"
              : type === "spacer"
                ? "Spacer"
                : type === "divider"
                  ? "Divider"
                  : type === "button"
                    ? "Button"
                    : type === "image"
                      ? "Image"
                      : type}
        </div>
      </div>
    </SortablePlaceholder>
  );
};
