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
