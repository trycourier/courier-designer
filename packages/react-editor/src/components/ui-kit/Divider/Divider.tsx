import { cn } from "@/lib";
import { forwardRef } from "react";

export type DividerProps = React.ComponentProps<"hr">;

export const Divider = forwardRef<HTMLHRElement, DividerProps>((props, ref) => (
  <hr
    {...props}
    ref={ref}
    className={cn(
      "my-1 border-neutral-200 dark:border-neutral-800",
      props.className
    )}
  />
));

Divider.displayName = "Divider";
