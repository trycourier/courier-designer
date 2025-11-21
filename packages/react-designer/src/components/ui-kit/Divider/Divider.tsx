import { cn } from "@/lib";
import { forwardRef } from "react";

export type DividerProps = React.ComponentProps<"hr">;

export const Divider = forwardRef<HTMLHRElement, DividerProps>((props, ref) => (
  <hr
    {...props}
    ref={ref}
    className={cn(
      "courier-my-1 courier-border-border dark:courier-border-neutral-800 courier-w-full",
      props.className
    )}
  />
));

Divider.displayName = "Divider";
