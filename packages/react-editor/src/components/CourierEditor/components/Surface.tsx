import { cn } from "@/lib";
import type { HTMLProps } from "react";
import { forwardRef } from "react";

export type SurfaceProps = HTMLProps<HTMLDivElement> & {
  withShadow?: boolean;
  withBorder?: boolean;
};

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(
  (
    { children, className, withShadow = true, withBorder = true, ...props },
    ref
  ) => {
    const surfaceClass = cn(
      "bg-white rounded-lg dark:bg-black",
      withShadow ? "shadow-sm" : "",
      withBorder ? "border border-border dark:border-neutral-800" : "",
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
