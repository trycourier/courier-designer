import { cn } from "@/lib";
import { Slot } from "@radix-ui/react-slot";
import { forwardRef } from "react";
import { Surface } from "../Surface";

export type PanelProps = {
  spacing?: "medium" | "small";
  noShadow?: boolean;
  asChild?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ asChild, className, children, spacing, noShadow, ...rest }, ref) => {
    const panelClass = cn("courier-p-2", spacing === "small" && "courier-p-[0.2rem]", className);

    const Comp = asChild ? Slot : "div";

    return (
      <Comp ref={ref} {...rest}>
        <Surface className={panelClass} withShadow={!noShadow}>
          {children}
        </Surface>
      </Comp>
    );
  }
);

Panel.displayName = "Panel";

export const PanelDivider = forwardRef<
  HTMLDivElement,
  { asChild?: boolean } & React.HTMLAttributes<HTMLDivElement>
>(({ asChild, className, children, ...rest }, ref) => {
  const dividerClass = cn(
    "courier-border-b courier-border-b-black/10 courier-mb-2 courier-pb-2",
    className
  );

  const Comp = asChild ? Slot : "div";

  return (
    <Comp className={dividerClass} {...rest} ref={ref}>
      {children}
    </Comp>
  );
});

PanelDivider.displayName = "PanelDivider";

export const PanelHeader = forwardRef<
  HTMLDivElement,
  { asChild?: boolean } & React.HTMLAttributes<HTMLDivElement>
>(({ asChild, className, children, ...rest }, ref) => {
  const headerClass = cn(
    "courier-border-b courier-border-b-black/10 courier-text-sm courier-mb-2 courier-pb-2",
    className
  );

  const Comp = asChild ? Slot : "div";

  return (
    <Comp className={headerClass} {...rest} ref={ref}>
      {children}
    </Comp>
  );
});

PanelHeader.displayName = "PanelHeader";

export const PanelSection = forwardRef<
  HTMLDivElement,
  { asChild?: boolean } & React.HTMLAttributes<HTMLDivElement>
>(({ asChild, className, children, ...rest }, ref) => {
  const sectionClass = cn("courier-mt-4 first:courier-mt-1", className);

  const Comp = asChild ? Slot : "div";

  return (
    <Comp className={sectionClass} {...rest} ref={ref}>
      {children}
    </Comp>
  );
});

PanelSection.displayName = "PanelSection";

export const PanelHeadline = forwardRef<
  HTMLDivElement,
  { asChild?: boolean } & React.HTMLAttributes<HTMLDivElement>
>(({ asChild, className, children, ...rest }, ref) => {
  const headlineClass = cn(
    "courier-text-foreground/80 dark:courier-text-white/80 courier-text-xs courier-font-medium courier-mb-2 courier-ml-1.5",
    className
  );

  const Comp = asChild ? Slot : "div";

  return (
    <Comp className={headlineClass} {...rest} ref={ref}>
      {children}
    </Comp>
  );
});

PanelHeadline.displayName = "PanelHeadline";

export const PanelFooter = forwardRef<
  HTMLDivElement,
  { asChild?: boolean } & React.HTMLAttributes<HTMLDivElement>
>(({ asChild, className, children, ...rest }, ref) => {
  const footerClass = cn(
    "courier-border-t courier-border-black/10 courier-text-sm courier-mt-2 courier-pt-2",
    className
  );

  const Comp = asChild ? Slot : "div";

  return (
    <Comp className={footerClass} {...rest} ref={ref}>
      {children}
    </Comp>
  );
});

PanelFooter.displayName = "PanelFooter";
