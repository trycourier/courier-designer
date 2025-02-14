import React, { forwardRef, CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from "class-variance-authority";

const actionVariants = cva(
  [
    "flex w-3 py-1 px-3 items-center justify-center flex-none touch-none outline-none appearance-none bg-transparent",
    "rounded-md border-none touch-transparent",
    "[&>svg]:flex-none [&>svg]:m-auto [&>svg]:h-full [&>svg]:overflow-visible [&>svg]:fill-[#919eab]",
    "hover:bg-black/5 hover:[&>svg]:fill-[#6f7b88]",
    "active:bg-[var(--background,rgba(0,0,0,0.05))] active:[&>svg]:fill-[var(--fill,#788491)]",
    "focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(255,255,255,0),0_0_0_2px_#4c9ffe]"
  ],
  {
    variants: {
      variant: {
        default: "",
      }
    }
  }
);

export interface ActionProps extends React.HTMLAttributes<HTMLButtonElement>, VariantProps<typeof actionVariants> {
  active?: {
    fill: string;
    background: string;
  };
  cursor?: CSSProperties['cursor'];
}

export const Action = forwardRef<HTMLButtonElement, ActionProps>(
  ({ active, className, cursor, style, ...props }, ref) => {
    return (
      <button
        ref={ref}
        {...props}
        className={cn(actionVariants(), className)}
        tabIndex={0}
        style={
          {
            ...style,
            cursor: cursor || 'pointer',
            '--fill': active?.fill,
            '--background': active?.background,
          } as CSSProperties
        }
      />
    );
  }
);

Action.displayName = "Action";