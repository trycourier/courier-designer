import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "courier-relative courier-flex courier-w-full courier-touch-none courier-select-none courier-items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="courier-relative courier-h-1.5 courier-w-full courier-grow courier-overflow-hidden courier-rounded-full courier-bg-secondary">
      <SliderPrimitive.Range className="courier-absolute courier-h-full courier-bg-accent-foreground" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="courier-block courier-h-4 courier-w-4 courier-rounded-full courier-bg-accent-foreground courier-shadow courier-transition-colors focus-visible:courier-outline-none focus-visible:courier-ring-1 focus-visible:courier-ring-ring disabled:courier-pointer-events-none disabled:courier-opacity-50" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
