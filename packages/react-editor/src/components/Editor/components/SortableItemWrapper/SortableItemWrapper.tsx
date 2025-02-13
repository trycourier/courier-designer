import { NodeViewWrapper, type NodeViewWrapperProps } from "@tiptap/react";
import { useSortable } from "@dnd-kit/sortable";
import { DraggableSyntheticListeners } from "@dnd-kit/core";
import { Transform } from "@dnd-kit/utilities";
import { Handle } from "@/components/Editor/dnd/components/Handle";
import React, { useEffect, useState } from "react";
import { cn } from "@/lib";

export interface SortableItemWrapperProps extends NodeViewWrapperProps {
  children: React.ReactNode;
  id: string;
  className?: string;
}

function useMountStatus() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsMounted(true), 500);

    return () => clearTimeout(timeout);
  }, []);

  return isMounted;
}

export const SortableItemWrapper = ({ children, id, className }: SortableItemWrapperProps) => {
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
    <SortableItem
      ref={setNodeRef}
      id={id}
      transition={transition}
      transform={transform}
      fadeIn={mountedWhileDragging}
      listeners={listeners}
      className={className}
      handleProps={{ ref: setActivatorNodeRef }}
    >
      {children}
    </SortableItem>
  );
};

export interface SortableItemProps {
  children: React.ReactNode;
  id?: string;
  dragOverlay?: boolean;
  color?: string;
  disabled?: boolean;
  dragging?: boolean;
  handle?: boolean;
  handleProps?: any;
  height?: number;
  index?: number;
  fadeIn?: boolean;
  transform?: Transform | null;
  listeners?: DraggableSyntheticListeners;
  sorting?: boolean;
  style?: React.CSSProperties;
  transition?: string | null;
  wrapperStyle?: React.CSSProperties;
  className?: string;
}

export const SortableItem = React.forwardRef<HTMLDivElement, SortableItemProps>(
  ({ children, className, dragOverlay, handleProps, listeners, id }, ref) => {
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
        className={cn(className, 'relative')}
      >
        {children}
        <div className="absolute -left-8 top-0">
          <Handle {...handleProps} {...listeners} />
        </div>
      </NodeViewWrapper>
    );
  });