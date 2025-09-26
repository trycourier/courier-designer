import { cn } from "@/lib";
import type { ReactNode } from "react";
import { forwardRef, useContext } from "react";
import { ThemeContext } from "./ThemeContext";
import type { Theme } from "./ThemeProvider.types";
import { lightTheme, darkTheme } from "./ThemeProvider.types";

interface ThemeProviderProps {
  children: ReactNode;
  theme?: Theme | string;
  dataMode?: "light" | "dark";
}

export const ThemeProvider = forwardRef<HTMLDivElement, ThemeProviderProps>(
  ({ children, theme, dataMode = "light" }, ref) => {
    const defaultTheme = dataMode === "light" ? lightTheme : darkTheme;

    let themeContextProps: Theme | string = defaultTheme;
    if (theme) {
      themeContextProps = typeof theme === "string" ? theme : { ...defaultTheme, ...theme };
    }

    const cssVars =
      typeof theme === "string"
        ? {}
        : Object.entries(themeContextProps).reduce((acc, [key, value]) => {
            const kebabCase = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
            return {
              ...acc,
              [`--${kebabCase}`]: value,
            };
          }, {});

    return (
      <ThemeContext.Provider value={typeof themeContextProps === "object" ? themeContextProps : {}}>
        <div
          style={cssVars}
          className={cn(
            "courier-flex courier-flex-col courier-relative",
            typeof theme === "string" ? theme : "",
            "theme-container"
          )}
          ref={ref}
        >
          {children}
        </div>
      </ThemeContext.Provider>
    );
  }
);

export const useTheme = () => useContext(ThemeContext);
