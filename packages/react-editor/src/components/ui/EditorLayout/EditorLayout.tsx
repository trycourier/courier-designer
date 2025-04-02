import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/ui-kit";
import type { Theme } from "@/components/ui-kit/ThemeProvider/ThemeProvider.types";

export interface EditorLayoutProps {
  theme?: Theme | string;
  children: React.ReactNode;
}

export const EditorLayout: React.FC<EditorLayoutProps> = ({
  theme,
  children
}) => (
  <ThemeProvider theme={theme}>
    <div
      className="courier-relative courier-h-full courier-rounded-sm courier-border courier-border-border courier-bg-card courier-flex courier-flex-col courier-text-foreground courier-min-w-[812px] courier-overflow-hidden"
      data-mode="light"
    >
      <Toaster
        position="top-center"
        expand
        visibleToasts={2}
        style={{ position: "absolute", top: "10px", left: "50%", transform: "translateX(-50%)" }}
      />
      {children}
    </div>
  </ThemeProvider>
);
