import { cn } from "@/lib";
import { GripVertical } from "lucide-react";
import { forwardRef } from "react";

export const Handle = forwardRef<HTMLButtonElement, React.HTMLAttributes<HTMLButtonElement>>(
  (props, ref) => {
    return (
      <button
        {...props}
        ref={ref}
        data-cypress="draggable-handle"
        data-drag-handle
        className={cn(
          "courier-flex-shrink-0 courier-p-1 courier-w-7 courier-h-7 courier-rounded-md courier-border courier-border-border courier-flex courier-items-center courier-justify-center courier-shadow-sm courier-bg-background hover:courier-bg-card courier-cursor-grab courier-select-none courier-z-10 courier-touch-none",
          props.className
        )}
        style={
          {
            WebkitUserSelect: "none",
            userSelect: "none",
            touchAction: "none",
          } as React.CSSProperties
        }
      >
        <GripVertical
          strokeWidth={1}
          className="courier-w-5 courier-stroke-neutral-400 courier-fill-neutral-400 courier-pointer-events-none"
        />
      </button>
    );
  }
);
