import { cn } from "@/lib/utils";
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
  fadeIn?: boolean;
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
        data-placeholder="true"
        className={cn("courier-flex courier-items-start courier-gap-2 courier-pl-6", className)}
      >
        {children}
      </NodeViewWrapper>
    );
  }
);

const getPlaceholderLabel = (type: string) => {
  switch (type) {
    case "text":
      return "Text";
    case "heading":
      return "Heading";
    case "spacer":
      return "Spacer";
    case "divider":
      return "Divider";
    case "button":
      return "Button";
    case "image":
      return "Image";
    case "list":
      return "List";
    case "customCode":
      return "Custom code";
    case "column":
      return "Column layout";
    default:
      return type;
  }
};

export const DragPlaceholderComponent: React.FC<NodeViewProps> = ({ node }) => {
  const type = node.attrs.type;
  const id = node.attrs.id;

  const mounted = useMountStatus();

  return (
    <SortablePlaceholder id={id} fadeIn={!mounted}>
      <div
        className={cn(
          "courier-relative courier-flex courier-flex-grow courier-items-center courier-px-5 courier-py-[18px] courier-bg-background/50",
          "courier-border-2 courier-border-dashed courier-border-accent-foreground courier-rounded-md"
        )}
      >
        <div className="courier-text-accent-foreground">{getPlaceholderLabel(type)}</div>
      </div>
    </SortablePlaceholder>
  );
};
