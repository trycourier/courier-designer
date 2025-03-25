import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "courier-peer courier-inline-flex courier-h-5 courier-w-9 courier-shrink-0 courier-cursor-pointer courier-items-center courier-rounded-full courier-border-2 courier-border-transparent courier-shadow-sm courier-transition-colors focus-visible:courier-outline-none focus-visible:courier-ring-2 focus-visible:courier-ring-ring focus-visible:courier-ring-offset-2 focus-visible:courier-ring-offset-background disabled:courier-cursor-not-allowed disabled:courier-opacity-50 data-[state=checked]:courier-bg-accent-foreground data-[state=unchecked]:courier-bg-input",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "courier-pointer-events-none courier-block courier-h-4 courier-w-4 courier-rounded-full courier-bg-background courier-shadow-lg courier-ring-0 courier-transition-transform data-[state=checked]:courier-translate-x-4 data-[state=unchecked]:courier-translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
