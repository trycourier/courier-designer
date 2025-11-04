import { cn } from "@/lib";
import { GripVertical } from "lucide-react";
import { forwardRef } from "react";

export const Handle = forwardRef<HTMLButtonElement, React.HTMLAttributes<HTMLButtonElement>>(
  (props, ref) => {
    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Prevent the mousedown from bubbling to TipTap editor to avoid selection
      e.stopPropagation();
      // Call the original onMouseDown if it exists
      props.onMouseDown?.(e);
    };

    return (
      <button
        {...props}
        ref={ref}
        data-cypress="draggable-handle"
        data-drag-handle
        onMouseDown={handleMouseDown}
        className={cn(
          "courier-flex-shrink-0 courier-p-1 courier-w-7 courier-h-7 courier-rounded-md courier-border courier-border-border courier-flex courier-items-center courier-justify-center courier-shadow-sm courier-bg-background hover:courier-bg-card courier-cursor-grab",
          props.className
        )}
      >
        <GripVertical
          strokeWidth={1}
          className="courier-w-5 courier-stroke-ring courier-fill-ring"
        />
      </button>
    );
  }
);
