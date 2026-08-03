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
          // z-30 so the handle stays clickable while the block is being edited.
          // A selected block's `.node-element` is raised to z-20 (so its outline
          // is not overlapped by neighbours), which at z-10 painted the text layer
          // over the handle and swallowed the click — visible but unusable as soon
          // as the caret was in the block. Reproduced when the handle briefly
          // overlapped block content; it now sits clear of it either way (the
          // email gutter, or the row's `courier-pl-10` elsewhere), but the stacking
          // fix is independent of that and stays. Still below the panel's z-50.
          "courier-flex-shrink-0 courier-p-1 courier-w-7 courier-h-7 courier-rounded-md courier-border courier-border-border courier-flex courier-items-center courier-justify-center courier-shadow-sm courier-bg-background hover:courier-bg-card courier-cursor-grab courier-select-none courier-z-30 courier-touch-none",
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
