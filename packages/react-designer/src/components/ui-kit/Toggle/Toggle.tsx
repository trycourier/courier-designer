import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "courier-inline-flex courier-items-center courier-justify-center courier-gap-2 courier-rounded-md courier-text-sm courier-font-medium courier-transition-colors hover:courier-bg-secondary hover:courier-text-foreground focus-visible:courier-outline-none focus-visible:courier-ring-1 focus-visible:courier-ring-ring disabled:courier-pointer-events-none disabled:courier-opacity-50 data-[state=on]:courier-bg-accent data-[state=on]:courier-text-accent-foreground data-[state=on]:dark:courier-text-white [&_svg]:courier-pointer-events-none [&_svg]:courier-size-[16px] [&_svg]:courier-shrink-0",
  {
    variants: {
      variant: {
        default: "courier-bg-transparent",
        outline:
          "courier-border courier-border-input courier-bg-transparent courier-shadow-sm hover:courier-bg-accent hover:courier-text-accent-foreground",
      },
      size: {
        default: "courier-h-9 courier-min-w-9",
        sm: "courier-h-8 courier-px-1.5 courier-min-w-8",
        lg: "courier-h-10 courier-px-2.5 courier-min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
