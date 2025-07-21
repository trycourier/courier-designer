import { cn } from "@/lib/utils/index";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as React from "react";
import { buttonVariants } from "../Button";
import { useCallback } from "react";

const AlertDialog = AlertDialogPrimitive.Root;

const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <div className="courier-absolute courier-inset-0 courier-z-50 courier-bg-[#0a0a0a52] data-[state=open]:courier-animate-in data-[state=closed]:courier-animate-out data-[state=closed]:courier-fade-out-0 data-[state=open]:courier-fade-in-0">
    <AlertDialogPrimitive.Overlay
      asChild
      className={cn(
        "courier-fixed courier-inset-0 courier-z-50 courier-bg-black/80 data-[state=open]:courier-animate-in data-[state=closed]:courier-animate-out data-[state=closed]:courier-fade-out-0 data-[state=open]:courier-fade-in-0",
        className
      )}
      {...props}
      ref={ref}
    />
  </div>
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => {
  const findThemeContainer = useCallback(() => {
    // Find the closest element with lightTheme class
    let element = (ref as React.RefObject<HTMLDivElement>)?.current?.parentElement;
    while (element) {
      if (element.classList.contains("lightTheme")) {
        return element;
      }
      element = element.parentElement;
    }
    // Fallback to document body if no theme container found
    return document.body;
  }, [ref]);

  return (
    <AlertDialogPortal container={typeof window !== "undefined" ? findThemeContainer() : undefined}>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        className={cn(
          "courier-fixed courier-left-[50%] courier-top-[50%] courier-z-50 courier-grid courier-w-full courier-max-w-lg courier-translate-x-[-50%] courier-translate-y-[-50%] courier-gap-4 courier-border courier-bg-background courier-p-6 courier-shadow-lg courier-duration-200 data-[state=open]:courier-animate-in data-[state=closed]:courier-animate-out data-[state=closed]:courier-fade-out-0 data-[state=open]:courier-fade-in-0 data-[state=closed]:courier-zoom-out-95 data-[state=open]:courier-zoom-in-95 data-[state=closed]:courier-slide-out-to-left-1/2 data-[state=closed]:courier-slide-out-to-top-[48%] data-[state=open]:courier-slide-in-from-left-1/2 data-[state=open]:courier-slide-in-from-top-[48%] sm:courier-rounded-lg",
          className
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
});
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "courier-flex courier-flex-col courier-space-y-2 courier-text-center sm:courier-text-left",
      className
    )}
    {...props}
  />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "courier-flex courier-flex-col-reverse sm:courier-flex-row sm:courier-justify-end sm:courier-space-x-2",
      className
    )}
    {...props}
  />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("courier-text-lg courier-font-semibold", className)}
    {...props}
  />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("courier-text-sm courier-text-muted-foreground", className)}
    {...props}
  />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants(), className)} {...props} />
));
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      buttonVariants({ variant: "outline" }),
      "courier-mt-2 sm:courier-mt-0",
      className
    )}
    {...props}
  />
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
