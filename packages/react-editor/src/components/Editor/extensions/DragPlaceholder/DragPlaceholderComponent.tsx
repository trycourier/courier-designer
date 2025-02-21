import { cn } from "@/lib/utils";
import { DraggableSyntheticListeners } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { Transform } from "@dnd-kit/utilities";
import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import React, { useEffect, useState } from "react";

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
  handleProps?: any;
  fadeIn?: boolean;
  transform?: Transform | null;
  listeners?: DraggableSyntheticListeners;
  transition?: string | null;
}

const SortablePlaceholder = React.forwardRef<HTMLDivElement, SortablePlaceholderProps>(
  ({ children, className, dragOverlay, id }, ref) => {
    useEffect(() => {
      if (!dragOverlay) {
        return;
      }
      document.body.style.cursor = 'grabbing';
      return () => {
        document.body.style.cursor = '';
      };
    }, [dragOverlay]);

    return (
      <NodeViewWrapper
        ref={ref}
        data-cypress="draggable-item"
        data-node-view-wrapper
        data-id={id}
        className={cn(
          'flex items-start gap-2 pl-6',
          className
        )}
      >
        {children}
      </NodeViewWrapper>
    );
  }
);

export const DragPlaceholderComponent: React.FC<NodeViewProps> = ({
  node,
}) => {
  const type = node.attrs.type;
  const id = node.attrs.id;

  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    isDragging,
    transform,
    transition,
  } = useSortable({
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
          "relative flex flex-grow items-center px-5 py-[18px] bg-background/50",
          "border-2 border-dashed border-primary/30 rounded-md",
          "animate-pulse"
        )}
      >
        <div className="text-muted-foreground">
          {type === 'text' ? 'Text' :
            type === 'heading' ? 'Heading' :
              type === 'divider' ? 'Divider' :
                type === 'button' ? 'Button' :
                  type === 'image' ? 'Image' : type}
        </div>
      </div>
    </SortablePlaceholder>
  );
}; 