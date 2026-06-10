import { cn } from "@/lib";
import type { HTMLProps } from "react";
import { forwardRef } from "react";

export type SurfaceProps = HTMLProps<HTMLDivElement> & {
  withShadow?: boolean;
  withBorder?: boolean;
};

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(
  ({ children, className, withShadow = true, withBorder = true, style, ...props }, ref) => {
    const surfaceClass = cn(
      "courier-bg-popover courier-rounded-lg courier-text-popover-foreground",
      withShadow ? "courier-shadow-sm" : "",
      withBorder ? "courier-border courier-border-border" : "",
      className
    );

    return (
      <div
        className={surfaceClass}
        {...props}
        style={{
          backgroundColor: "var(--popover)",
          color: "var(--popover-foreground)",
          borderColor: "var(--border)",
          ...style,
        }}
        ref={ref}
      >
        {children}
      </div>
    );
  }
);

Surface.displayName = "Surface";
