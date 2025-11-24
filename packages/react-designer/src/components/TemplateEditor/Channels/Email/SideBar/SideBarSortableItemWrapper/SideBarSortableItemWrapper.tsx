import { cn } from "@/lib";
import React, { forwardRef, useEffect, useRef, useState } from "react";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import type { Editor } from "@tiptap/react";

export interface SideBarSortableItemWrapperProps {
  children: React.ReactNode;
  id: string;
  className?: string;
  editor?: Editor;
}

export const SideBarSortableItemWrapper = ({
  children,
  id,
  className,
  editor,
}: SideBarSortableItemWrapperProps) => {
  return (
    <SideBarSortableItem id={id} className={className} editor={editor}>
      {children}
    </SideBarSortableItem>
  );
};

export interface SideBarSortableItemProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
  editor?: Editor;
}

export const SideBarSortableItem = forwardRef<HTMLDivElement, SideBarSortableItemProps>(
  ({ children, className, id, editor }, _ref) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
      const element = elementRef.current;
      if (!element || !id) return;

      return combine(
        draggable({
          element,
          getInitialData: () => ({
            id,
            type: "sidebar",
            dragType: id, // The id is the block type (heading, text, image, etc.)
          }),
          onDragStart: () => {
            setIsDragging(true);
            document.body.style.cursor = "grabbing";

            // Temporarily disable editor to prevent text cursor
            if (editor && editor.isEditable) {
              editor.setEditable(false);
            }
          },
          onDrop: () => {
            setIsDragging(false);
            document.body.style.cursor = "";

            // Re-enable editor
            if (editor) {
              editor.setEditable(true);
            }
          },
        })
      );
    }, [id, editor]);

    return (
      <div
        ref={elementRef}
        data-cypress="draggable-item"
        data-node-view-wrapper
        data-id={id}
        className={cn(
          className,
          "courier-relative",
          isDragging && "courier-opacity-50 courier-cursor-grabbing"
        )}
      >
        <div>{children}</div>
      </div>
    );
  }
);
