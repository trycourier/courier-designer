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
  ({ theme, children, isLoading, Header }, ref) => {
    return (
      <ThemeProvider theme={theme} ref={ref}>
        <div
          className="courier-relative courier-h-full courier-rounded-sm courier-border courier-border-border courier-bg-card courier-flex courier-flex-col courier-text-foreground courier-min-w-[812px] courier-min-h-[600px] courier-overflow-hidden"
          data-mode="light"
        >
          {Header && (
            <div className="courier-flex courier-flex-row courier-h-12 courier-flex-shrink-0 courier-w-full courier-bg-primary courier-border-b courier-px-4 courier-items-center courier-gap-4">
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
    );
  }
);
