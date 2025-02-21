import { NodeViewWrapper, type NodeViewWrapperProps } from "@tiptap/react";
import { useSortable } from "@dnd-kit/sortable";
import { DraggableSyntheticListeners } from "@dnd-kit/core";
import { Transform } from "@dnd-kit/utilities";
import React, { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib";
import { Handle } from "../Handle";
import { BinIcon } from "@/components/ui-kit/Icon";
import { Editor } from "@tiptap/react";
import { useData } from "../ContentItemMenu/hooks/useData";
export interface SortableItemWrapperProps extends NodeViewWrapperProps {
  children: React.ReactNode;
  id: string;
  className?: string;
  editor: Editor
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
  editor: Editor
}

export const SortableItem = React.forwardRef<HTMLDivElement, SortableItemProps>(
  ({ children, className, dragOverlay, handleProps, listeners, id, transition, transform, fadeIn, editor, ...props }, ref) => {
    useEffect(() => {
      if (!dragOverlay) {
        return;
      }

      document.body.style.cursor = 'grabbing';

      return () => {
        document.body.style.cursor = '';
      };
    }, [dragOverlay]);

    const data = useData()
    const currentNodePos = data.currentNodePos

    const deleteNode = useCallback(() => {
      editor?.chain().setMeta('hideDragHandle', true).setNodeSelection(currentNodePos).deleteSelection().run()
    }, [editor, currentNodePos])

    return (
      <NodeViewWrapper
        ref={ref}
        data-cypress="draggable-item"
        data-node-view-wrapper
        data-id={id}
        className={cn(
          'flex items-center justify-center gap-2 pl-6',
          className,
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
        <Handle className="absolute -left-5" {...handleProps} {...listeners} />
        {children}
        <div className="actions-panel absolute -right-[50px] rounded-md border border-border bg-background shadow-sm flex items-center justify-center hidden">
          <button className="w-8 h-8 flex items-center justify-center" onClick={deleteNode}>
            <BinIcon />
          </button>
        </div>
      </NodeViewWrapper>
    );
  });