import { createContext } from "react";
import type { Theme } from "./ThemeProvider.types";
import { defaultTheme } from "./ThemeProvider.types";

export const ThemeContext = createContext<Theme>(defaultTheme);
