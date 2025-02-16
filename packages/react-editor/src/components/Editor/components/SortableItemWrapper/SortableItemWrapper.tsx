import { NodeViewWrapper, type NodeViewWrapperProps } from "@tiptap/react";
import { useSortable } from "@dnd-kit/sortable";
import { DraggableSyntheticListeners } from "@dnd-kit/core";
import { Transform } from "@dnd-kit/utilities";
// import { Handle } from "@/components/Editor/dnd/components/Handle";
import React, { useEffect, useState } from "react";
import { cn } from "@/lib";
import { Handle } from "../Handle";
// import { cva } from "class-variance-authority";

// const itemWrapperVariants = cva(
//   "flex box-border touch-manipulation origin-[0_0]",
//   {
//     variants: {
//       isDragOverlay: {
//         true: "z-[999] [--scale:1.05] [--box-shadow-picked-up:0_0_0_calc(1px/var(--scale-x,1))_rgba(63,63,68,0.05),-1px_0_15px_0_rgba(34,33,81,0.01),0px_15px_15px_0_rgba(34,33,81,0.25)]",
//       },
//       isFadeIn: {
//         true: "animate-fadeIn",
//       }
//     }
//   }
// );

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

export const SortableItemWrapper = ({ children, id, className, ...props }: SortableItemWrapperProps) => {
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
      {...props}
    >
      {children}
    </SortableItem>
  );
};

export interface SortableItemProps {
  children: React.ReactNode;
  id?: string;
  dragOverlay?: boolean;
  disabled?: boolean;
  dragging?: boolean;
  handleProps?: any;
  fadeIn?: boolean;
  transform?: Transform | null;
  listeners?: DraggableSyntheticListeners;
  transition?: string | null;
  className?: string;
}

export const SortableItem = React.forwardRef<HTMLDivElement, SortableItemProps>(
  ({ children, className, dragOverlay, handleProps, listeners, id, transition, transform, fadeIn, ...props }, ref) => {
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
        // className={cn(className, 'relative flex')}
        className={cn(
          'flex items-start gap-2 pl-6',
          className,
          // itemWrapperVariants({
          //   isDragOverlay: dragOverlay,
          //   isFadeIn: fadeIn
          // })
        )}
        style={
          {
            transition: [transition]
              .filter(Boolean)
              .join(', '),
            '--translate-x': transform
              ? `${Math.round(transform.x)}px`
              : undefined,
            '--translate-y': transform
              ? `${Math.round(transform.y)}px`
              : undefined,
            '--scale-x': transform?.scaleX
              ? `${transform.scaleX}`
              : undefined,
            '--scale-y': transform?.scaleY
              ? `${transform.scaleY}`
              : undefined,
            transform: `translate3d(var(--translate-x, 0), var(--translate-y, 0), 0) scaleX(var(--scale-x, 1)) scaleY(var(--scale-y, 1))`
          } as React.CSSProperties
        }
        {...props}
      >
        <Handle className="absolute top-0 left-0" {...handleProps} {...listeners} />
        {children}
      </NodeViewWrapper>
    );
  });