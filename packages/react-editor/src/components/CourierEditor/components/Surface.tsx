import { cn } from "@/lib";
import type { HTMLProps } from "react";
import { forwardRef } from "react";

export type SurfaceProps = HTMLProps<HTMLDivElement> & {
  withShadow?: boolean;
  withBorder?: boolean;
};

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(
  ({ children, className, withShadow = true, withBorder = true, ...props }, ref) => {
    const surfaceClass = cn(
      "courier-bg-white courier-rounded-lg dark:courier-bg-black",
      withShadow ? "courier-shadow-sm" : "",
      withBorder ? "courier-border courier-border-border dark:courier-border-neutral-800" : "",
      className
    );

    return (
      <div className={surfaceClass} {...props} ref={ref}>
        {children}
      </div>
    );
  }
);

Surface.displayName = "Surface";
