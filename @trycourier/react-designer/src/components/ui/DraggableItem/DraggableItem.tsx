import React, { useEffect, useRef, useState } from "react";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { pointerOutsideOfPreview } from "@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview";
import { cn } from "@/lib/utils";

type UniqueIdentifier = string | number;

interface DraggableItemProps {
  id: UniqueIdentifier;
  children: React.ReactNode;
  dragType?: string;
  type?: "sidebar" | "editor";
  index?: number;
  className?: string;
  disabled?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  renderDragPreview?: () => React.ReactElement;
}

export const DraggableItem = ({
  id,
  children,
  dragType,
  type = "editor",
  index,
  className,
  disabled = false,
  onDragStart,
  onDragEnd,
  renderDragPreview,
}: DraggableItemProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || disabled) return;

    return combine(
      draggable({
        element,
        getInitialData: () => ({
          id,
          type,
          dragType,
          index,
        }),
        onDragStart: () => {
          setIsDragging(true);
          onDragStart?.();
        },
        onDrop: () => {
          setIsDragging(false);
          onDragEnd?.();
        },
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          if (renderDragPreview) {
            setCustomNativeDragPreview({
              nativeSetDragImage,
              getOffset: pointerOutsideOfPreview({
                x: "16px",
                y: "8px",
              }),
              render: ({ container }) => {
                const preview = renderDragPreview();
                const root = document.createElement("div");
                container.appendChild(root);

                // Use React's render API to render the preview
                import("react-dom/client").then(({ createRoot }) => {
                  createRoot(root).render(preview);
                });
              },
            });
          }
        },
      }),
      dropTargetForElements({
        element,
        getData: () => ({
          id,
          type,
          index,
        }),
        canDrop: ({ source }) => {
          // Don't allow dropping on itself
          return source.data.id !== id;
        },
        onDragEnter: () => {
          setIsOver(true);
        },
        onDragLeave: () => {
          setIsOver(false);
        },
        onDrop: () => {
          setIsOver(false);
        },
      })
    );
  }, [id, type, dragType, index, disabled, onDragStart, onDragEnd, renderDragPreview]);

  return (
    <div
      ref={ref}
      className={cn(
        "draggable-item",
        isDragging && "courier-opacity-50",
        isOver && "courier-ring-2 courier-ring-blue-500",
        className
      )}
      data-draggable-id={id}
      data-dragging={isDragging}
    >
      {children}
    </div>
  );
};
