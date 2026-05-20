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
  ({ theme, children, isLoading, Header, colorScheme, className, readOnly, ...rest }, ref) => {
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
            <div className="courier-editor-loading">
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
