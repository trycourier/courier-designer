import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/ui-kit";
import type { Theme } from "@/components/ui-kit/ThemeProvider/ThemeProvider.types";
import { Loader } from "../Loader";
import { forwardRef } from "react";

export interface MainLayoutProps {
  theme?: Theme | string;
  children: React.ReactNode;
  isLoading?: boolean;
  SideBar?: React.ReactNode;
  Header?: React.ReactNode;
}

export const MainLayout = forwardRef<HTMLDivElement, MainLayoutProps>(
  ({ theme, children, isLoading, Header }, ref) => (
    <ThemeProvider theme={theme} ref={ref}>
      <div className="courier-main-layout" data-mode="light">
        {Header && (
          <div className="courier-flex courier-flex-row courier-min-h-12 courier-flex-shrink-0 courier-w-full courier-bg-primary courier-border-b courier-px-4 courier-items-center courier-gap-4">
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
