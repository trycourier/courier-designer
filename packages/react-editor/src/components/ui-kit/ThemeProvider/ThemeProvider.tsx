import { cn } from "@/lib";
import type { ReactNode } from "react";
import { useContext } from "react";
// import "../../Editor/generated/theme.css";
import { ThemeContext } from "./ThemeContext";
import type { Theme } from "./ThemeProvider.types";
import { defaultTheme } from "./ThemeProvider.types";

interface ThemeProviderProps {
  children: ReactNode;
  theme?: Theme | string;
}

export const ThemeProvider = ({
  children,
  theme = defaultTheme,
}: ThemeProviderProps) => {
  const themeContextProps = typeof theme === "string" ? defaultTheme : { ...defaultTheme, ...theme };

  const cssVars = typeof theme === "string" ? {} : Object.entries(theme).reduce((acc, [key, value]) => {
    const kebabCase = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    return {
      ...acc,
      [`--${kebabCase}`]: value
    };
  }, {});

  return (
    <ThemeContext.Provider value={themeContextProps}>
      <div style={cssVars} className={cn(typeof theme === "string" ? theme : "", 'lightTheme')}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
