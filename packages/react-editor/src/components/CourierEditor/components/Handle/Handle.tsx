import { cn } from '@/lib';
import { GripVertical } from "lucide-react";
import { forwardRef } from 'react';

export const Handle = forwardRef<HTMLButtonElement, React.HTMLAttributes<HTMLButtonElement>>(
  (props, ref) => {
    return (
      <button
        {...props}
        ref={ref}
        data-cypress="draggable-handle"
        className={cn("flex-shrink-0 p-1 w-7 h-7 rounded-md border border-border flex items-center justify-center shadow-sm bg-background hover:bg-card cursor-grab", props.className)}
      >
        <GripVertical strokeWidth={1} className="w-5 stroke-ring fill-ring" />
      </button>
    );
  }
);