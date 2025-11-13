import { cn } from "@/lib";
import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import type { Transform } from "@dnd-kit/utilities";
import React, { forwardRef, useEffect, useState } from "react";
import { useDndRef } from "@/components/TemplateEditor/hooks/useDndRef";

export interface SideBarSortableItemWrapperProps {
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

export const SideBarSortableItemWrapper = ({
  children,
  id,
  className,
}: SideBarSortableItemWrapperProps) => {
  const { setNodeRef, setActivatorNodeRef, listeners, isDragging, transform, transition } =
    useSortable({
      id,
    });
  const mounted = useMountStatus();
  const mountedWhileDragging = isDragging && !mounted;

  // React 19 compatibility: wrap refs in callback refs
  const sortableRef = useDndRef(setNodeRef);
  const activatorRef = useDndRef(setActivatorNodeRef);

  return (
    <SideBarSortableItem
      ref={sortableRef}
      id={id}
      transition={transition}
      transform={transform}
      fadeIn={mountedWhileDragging}
      listeners={listeners}
      className={className}
      handleProps={{ ref: activatorRef }}
    >
      {children}
    </SideBarSortableItem>
  );
};

export interface SideBarSortableItemProps {
  children: React.ReactNode;
  id?: string;
  dragOverlay?: boolean;
  color?: string;
  disabled?: boolean;
  dragging?: boolean;
  handle?: boolean;
  handleProps?: Record<string, unknown>;
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

export const SideBarSortableItem = forwardRef<HTMLDivElement, SideBarSortableItemProps>(
  ({ children, className, dragOverlay, handleProps, listeners, id }, ref) => {
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
      <div
        ref={ref}
        data-cypress="draggable-item"
        data-node-view-wrapper
        data-id={id}
        className={cn(className, "courier-relative")}
      >
        <div {...handleProps} {...listeners}>
          {children}
        </div>
      </div>
    );
  }
);
