import { cn } from "@/lib/utils";
import { forwardRef, type HTMLAttributes } from "react";

export const ChannelRootContainer = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & {
    previewMode?: "desktop" | "mobile" | undefined;
    readOnly?: boolean;
  }
>(({ children, previewMode, className, readOnly = false, ...rest }, ref) => (
  <div
    className={cn(
      "courier-flex courier-flex-1 courier-overflow-hidden",
      readOnly && "courier-editor-readonly",
      previewMode && "courier-editor-preview-mode",
      previewMode === "mobile" && "courier-editor-preview-mode-mobile",
      className
    )}
    {...rest}
    ref={ref}
  >
    {children}
  </div>
));

export const EditorSidebar = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & {
    previewMode?: "desktop" | "mobile" | undefined;
  }
>(({ children, className, previewMode, ...rest }, ref) => (
  <div
    style={{ padding: 12 }}
    className={cn(
      "courier-editor-sidebar",
      previewMode
        ? "courier-opacity-0 courier-pointer-events-none courier-translate-x-full courier-w-0 courier-flex-shrink-0"
        : "courier-opacity-100 courier-translate-x-0 courier-w-64 courier-flex-shrink-0",
      className
    )}
    {...rest}
    ref={ref}
  >
    {children}
  </div>
));
