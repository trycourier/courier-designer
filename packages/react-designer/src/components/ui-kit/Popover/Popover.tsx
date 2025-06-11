import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";

import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
    portalProps?: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Portal>;
  }
>(
  (
    {
      className,
      align = "center",
      side = "bottom",
      sideOffset = 4,
      collisionPadding = 10,
      avoidCollisions = true,
      portalProps,
      ...props
    },
    ref
  ) => (
    <PopoverPrimitive.Portal {...portalProps}>
      <PopoverPrimitive.Content
        ref={ref}
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        avoidCollisions={avoidCollisions}
        className={cn(
          "courier-z-50 courier-w-72 courier-rounded-md courier-border courier-bg-popover courier-p-4 courier-text-popover-foreground courier-shadow-md courier-outline-none data-[state=open]:courier-animate-in data-[state=closed]:courier-animate-out data-[state=closed]:courier-fade-out-0 data-[state=open]:courier-fade-in-0 data-[state=closed]:courier-zoom-out-95 data-[state=open]:courier-zoom-in-95 data-[side=bottom]:courier-slide-in-from-top-2 data-[side=left]:courier-slide-in-from-right-2 data-[side=right]:courier-slide-in-from-left-2 data-[side=top]:courier-slide-in-from-bottom-2",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
);
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger };
