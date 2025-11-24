import { ThemeProvider } from "@/components/ui-kit";
import type { Theme } from "@/components/ui-kit/ThemeProvider/ThemeProvider.types";
import { forwardRef, type HTMLAttributes } from "react";
import { Toaster } from "sonner";
import { Loader } from "../Loader";

export interface MainLayoutProps extends HTMLAttributes<HTMLDivElement> {
  theme?: Theme | string;
  children: React.ReactNode;
  isLoading?: boolean;
  SideBar?: React.ReactNode;
  Header?: React.ReactNode;
  colorScheme?: "light" | "dark";
}

export const MainLayout = forwardRef<HTMLDivElement, MainLayoutProps>(
  ({ theme, children, isLoading, Header, colorScheme, className, ...rest }, ref) => (
    <ThemeProvider theme={theme} ref={ref} colorScheme={colorScheme} className={className}>
      <div
        {...Object.fromEntries(
          Object.entries(rest).filter(([key]) => key !== "variables" && key !== "brandEditor")
        )}
        className="courier-main-layout"
      >
        {Header && (
          <div className="courier-flex courier-flex-row courier-h-12 courier-flex-shrink-0 courier-w-full courier-bg-primary courier-border-b courier-px-4 courier-items-center courier-gap-4 courier-self-stretch dark:courier-bg-background">
            {Header}
          </div>
        )}
        {isLoading && (
          <div className="courier-editor-loading">
            <Loader />
          </div>
        )}
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
        {children}
      </div>
    </ThemeProvider>
  )
);
