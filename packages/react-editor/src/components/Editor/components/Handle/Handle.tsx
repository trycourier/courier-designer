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
        className={cn("flex-shrink-0 px-1 pb-2", props.className)}
      >
        <GripVertical strokeWidth={1} className="w-3 h-3 -mb-1 stroke-ring" />
      </button>
    );
  }
);