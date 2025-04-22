import { cn } from "@/lib";
import * as React from "react";

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "startAdornment" | "endAdornment"> {
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, startAdornment, endAdornment, ...props }, ref) => {
    return (
      <div className="courier-relative courier-flex courier-w-full courier-items-center">
        {startAdornment && (
          <div className="courier-absolute courier-left-2 courier-flex courier-items-center courier-pointer-events-none">
            {startAdornment}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "courier-flex courier-w-full courier-rounded-md courier-border-none courier-bg-secondary courier-text-secondary-foreground courier-p-1.5 courier-text-base file:courier-border-0 file:courier-bg-transparent file:courier-text-sm file:courier-font-medium file:courier-text-foreground placeholder:courier-text-muted-foreground focus-visible:courier-outline-none disabled:courier-cursor-not-allowed disabled:courier-opacity-50 md:courier-text-sm",
            startAdornment && "courier-pl-8",
            endAdornment && "courier-pr-8",
            className
          )}
          ref={ref}
          {...props}
        />
        {endAdornment && (
          <div className="courier-absolute courier-right-2 courier-flex courier-items-center courier-pointer-events-none">
            {endAdornment}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
