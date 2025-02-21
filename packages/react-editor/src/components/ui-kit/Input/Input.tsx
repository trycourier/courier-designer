import { cn } from "@/lib";
import * as React from "react";

export interface InputProps extends Omit<React.ComponentProps<"input">, 'startAdornment' | 'endAdornment'> {
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, startAdornment, endAdornment, ...props }, ref) => {
    return (
      <div className="relative flex w-full items-center">
        {startAdornment && (
          <div className="absolute left-2 flex items-center pointer-events-none">
            {startAdornment}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex w-full rounded-md border-none bg-secondary text-secondary-foreground p-1.5 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            startAdornment && "pl-8",
            endAdornment && "pr-8",
            className
          )}
          ref={ref}
          {...props}
        />
        {endAdornment && (
          <div className="absolute right-2 flex items-center pointer-events-none">
            {endAdornment}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
