import { ThemeProvider } from "@/components/ui-kit";
import type { Theme } from "@/components/ui-kit/ThemeProvider/ThemeProvider.types";
import { cn } from "@/lib/utils";
import { forwardRef, type HTMLAttributes } from "react";
import { useAtomValue } from "jotai";
import { Toaster } from "sonner";
import { Loader } from "../Loader";
import { brandColorsAtom, renderToasterAtom } from "@/components/Providers/store";
import { brandColorsToCSSVars } from "@/lib/utils/brandColors";

export interface MainLayoutProps extends HTMLAttributes<HTMLDivElement> {
  theme?: Theme | string;
  children: React.ReactNode;
  isLoading?: boolean;
  /**
   * Start the loading overlay below the toolbar instead of covering it.
   *
   * Off by default, because during the editor's own load the toolbar has
   * nothing real to show — the title reads "Untitled", the brand and routing
   * dropdowns are empty and every button is enabled — so covering it is the
   * honest state.
   *
   * Turn it on for a gate held *after* the editor has loaded, where the toolbar
   * is populated and the overlay would otherwise take away the very control the
   * user just used (the brand selector being the case in point).
   */
  preserveHeaderWhileLoading?: boolean;
  SideBar?: React.ReactNode;
  Header?: React.ReactNode;
  colorScheme?: "light" | "dark";
  readOnly?: boolean;
}

const BrandColorVarsWrapper = ({
  children,
  className: _className,
  readOnly,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  readOnly?: boolean;
} & Record<string, unknown>) => {
  const brandColors = useAtomValue(brandColorsAtom);
  const cssVars = brandColorsToCSSVars(brandColors);

  return (
    <div
      {...Object.fromEntries(
        Object.entries(rest).filter(([key]) => key !== "variables" && key !== "brandEditor")
      )}
      className={cn("courier-main-layout", readOnly && "courier-editor-readonly")}
      style={cssVars as React.CSSProperties}
    >
      {children}
    </div>
  );
};

export const MainLayout = forwardRef<HTMLDivElement, MainLayoutProps>(
  (
    {
      theme,
      children,
      isLoading,
      preserveHeaderWhileLoading,
      Header,
      colorScheme,
      className,
      readOnly,
      ...rest
    },
    ref
  ) => {
    const showToaster = useAtomValue(renderToasterAtom);

    return (
      <ThemeProvider theme={theme} ref={ref} colorScheme={colorScheme} className={className}>
        <BrandColorVarsWrapper readOnly={readOnly} {...rest}>
          {Header && (
            <div className="courier-main-header courier-flex courier-flex-row courier-h-12 courier-flex-shrink-0 courier-w-full courier-bg-primary courier-border-b courier-px-4 courier-items-center courier-gap-4 courier-self-stretch dark:courier-bg-background">
              {Header}
            </div>
          )}
          {isLoading && (
            <div
              className={cn(
                "courier-editor-loading",
                Header && preserveHeaderWhileLoading && "courier-editor-loading-below-header"
              )}
            >
              <Loader />
            </div>
          )}
          {showToaster && (
            <Toaster
              position="top-center"
              expand
              visibleToasts={2}
              style={{
                position: "absolute",
                top: "10px",
                left: "50%",
                transform: "translateX(-50%)",
              }}
            />
          )}
          {children}
        </BrandColorVarsWrapper>
      </ThemeProvider>
    );
  }
);
