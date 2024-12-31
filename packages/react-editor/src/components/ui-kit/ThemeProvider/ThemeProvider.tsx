import type { ReactNode } from "react";
import React, { useContext } from "react";
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
  const themeValue =
    typeof theme === "string" ? defaultTheme : { ...defaultTheme, ...theme };

  const cssVars = {
    "--background": themeValue.background,
    "--foreground": themeValue.foreground,
    "--muted": themeValue.muted,
    "--muted-foreground": themeValue.mutedForeground,
    "--popover": themeValue.popover,
    "--popover-foreground": themeValue.popoverForeground,
    "--border": themeValue.border,
    "--input": themeValue.input,
    "--card": themeValue.card,
    "--card-foreground": themeValue.cardForeground,
    "--primary": themeValue.primary,
    "--primary-foreground": themeValue.primaryForeground,
    "--secondary": themeValue.secondary,
    "--secondary-foreground": themeValue.secondaryForeground,
    "--accent": themeValue.accent,
    "--accent-foreground": themeValue.accentForeground,
    "--destructive": themeValue.destructive,
    "--destructive-foreground": themeValue.destructiveForeground,
    "--ring": themeValue.ring,
    "--radius": themeValue.radius,
  } as const as React.CSSProperties;

  return (
    <ThemeContext.Provider value={themeValue}>
      <div
        style={typeof theme === "string" ? {} : cssVars}
        className={typeof theme === "string" ? theme : ""}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
