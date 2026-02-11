import { cn } from "@/lib/utils";
import { forwardRef, type HTMLAttributes } from "react";
import { useAtom } from "jotai";
import { isSidebarExpandedAtom } from "../store";

export const ChannelRootContainer = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & {
    previewMode?: "desktop" | "mobile" | undefined;
    readOnly?: boolean;
  }
>(({ children, previewMode, className, readOnly = false, ...rest }, ref) => (
  <div
    className={cn(
      "courier-flex courier-flex-1 courier-overflow-hidden courier-root-container courier-relative",
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
    skipExpanded?: boolean;
    width?: string;
  }
>(({ children, className, previewMode, skipExpanded = false, width, ...rest }, ref) => {
  const [isExpanded, setIsSidebarExpanded] = useAtom(isSidebarExpandedAtom);
  const isExpandedState = skipExpanded ? false : isExpanded;
  const sidebarWidth = width || "courier-w-64";

  if (previewMode) {
    return null;
  }

  return (
    <>
      {/* Backdrop mask - only visible when expanded */}
      {isExpandedState && (
        <div
          className="courier-absolute courier-inset-0 courier-bg-black/50 courier-z-[40] courier-transition-opacity courier-duration-300 courier-cursor-pointer"
          onClick={() => setIsSidebarExpanded(false)}
          aria-hidden="true"
        />
      )}

      {/* Static sidebar container - maintains layout space */}
      <div
        className={cn(
          "courier-editor-sidebar-container courier-flex-shrink-0 courier-self-stretch",
          !isExpandedState && "courier-relative",
          sidebarWidth,
          className
        )}
      >
        {/* Actual sidebar - always absolute, slides and resizes */}
        <div
          className={cn(
            "courier-editor-sidebar courier-absolute courier-top-0 courier-bottom-0 courier-right-0 courier-p-4 courier-h-full courier-overflow-y-auto",
            "courier-transition-all courier-duration-300 courier-ease-in-out",
            isExpandedState
              ? "courier-w-[85%] courier-z-[50] courier-shadow-xl courier-bg-background"
              : sidebarWidth
          )}
          {...rest}
          ref={ref}
        >
          {children}
        </div>
      </div>
    </>
  );
});
