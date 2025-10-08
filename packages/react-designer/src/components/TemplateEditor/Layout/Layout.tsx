import { cn } from "@/lib/utils";
import { forwardRef, type HTMLAttributes } from "react";
import { useSetAtom } from "jotai";
import { isSidebarExpandedAtom } from "../store";

export const ChannelRootContainer = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & {
    previewMode: "desktop" | "mobile" | undefined;
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
    previewMode: "desktop" | "mobile" | undefined;
    isExpanded?: boolean;
  }
>(({ children, className, previewMode, isExpanded = false, ...rest }, ref) => {
  const setIsSidebarExpanded = useSetAtom(isSidebarExpandedAtom);

  return (
    <div
      className={cn(
        "courier-editor-sidebar-container courier-flex-shrink-0 courier-self-stretch",
        previewMode ? "courier-w-0" : "courier-w-64"
      )}
    >
      {/* Backdrop mask - only visible when expanded */}
      {isExpanded && !previewMode && (
        <div
          className="courier-absolute courier-inset-0 courier-bg-black/50 courier-z-[9] courier-transition-opacity courier-duration-300 courier-cursor-pointer"
          onClick={() => setIsSidebarExpanded(false)}
          aria-hidden="true"
        />
      )}

      <div
        style={{
          padding: 12,
          width: isExpanded ? "80vw" : "16rem",
          maxWidth: isExpanded ? "56rem" : "16rem", // 56rem = 896px = 4xl
        }}
        className={cn(
          "courier-editor-sidebar courier-absolute courier-right-0 courier-top-0 courier-bottom-0 courier-z-10",
          "courier-transition-all courier-duration-300 courier-ease-in-out courier-h-full courier-overflow-y-auto",
          previewMode
            ? "courier-opacity-0 courier-pointer-events-none courier-translate-x-full"
            : isExpanded
              ? "courier-shadow-xl"
              : "courier-shadow-none",
          className
        )}
        {...rest}
        ref={ref}
      >
        {children}
      </div>
    </div>
  );
});
