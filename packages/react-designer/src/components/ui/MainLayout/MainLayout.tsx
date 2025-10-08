import { ThemeProvider } from "@/components/ui-kit";
import type { Theme } from "@/components/ui-kit/ThemeProvider/ThemeProvider.types";
import { cn } from "@/lib/utils";
import { forwardRef, type HTMLAttributes } from "react";
import { Toaster } from "sonner";
import { Loader } from "../Loader";

export interface MainLayoutProps extends HTMLAttributes<HTMLDivElement> {
  theme?: Theme | string;
  children: React.ReactNode;
  isLoading?: boolean;
  SideBar?: React.ReactNode;
  Header?: React.ReactNode;
  dataMode?: "light" | "dark";
}

export const MainLayout = forwardRef<HTMLDivElement, MainLayoutProps>(
  ({ theme, children, isLoading, Header, dataMode = "light", className, ...rest }, ref) => (
    <ThemeProvider theme={theme} ref={ref} dataMode={dataMode}>
      <div
        {...Object.fromEntries(Object.entries(rest).filter(([key]) => key !== "variables"))}
        className={cn("courier-main-layout", className)}
      >
        {Header && (
          <div className="courier-flex courier-flex-row courier-h-12 courier-flex-shrink-0 courier-w-full courier-bg-primary courier-border-b courier-px-4 courier-items-center courier-gap-4 courier-self-stretch dark:courier-bg-primary">
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
