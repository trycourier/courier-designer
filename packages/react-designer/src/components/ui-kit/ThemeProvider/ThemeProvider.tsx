import { cn } from "@/lib";
import type { ReactNode } from "react";
import { forwardRef, useContext } from "react";
import { ThemeContext } from "./ThemeContext";
import type { Theme } from "./ThemeProvider.types";
import { defaultTheme } from "./ThemeProvider.types";

interface ThemeProviderProps {
  children: ReactNode;
  theme?: Theme | string;
}

export const ThemeProvider = forwardRef<HTMLDivElement, ThemeProviderProps>(
  ({ children, theme = defaultTheme }, ref) => {
    const themeContextProps =
      typeof theme === "string" ? defaultTheme : { ...defaultTheme, ...theme };

    const cssVars =
      typeof theme === "string"
        ? {}
        : Object.entries(theme).reduce((acc, [key, value]) => {
            const kebabCase = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
            return {
              ...acc,
              [`--${kebabCase}`]: value,
            };
          }, {});

    return (
      <ThemeContext.Provider value={themeContextProps}>
        <div
          style={cssVars}
          className={cn(
            "courier-flex courier-flex-col courier-relative",
            typeof theme === "string" ? theme : "",
            "lightTheme"
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
