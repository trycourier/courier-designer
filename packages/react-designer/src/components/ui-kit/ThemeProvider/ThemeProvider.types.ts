export interface Theme {
  colorScheme?: "light" | "dark";
  background?: string;
  foreground?: string;
  muted?: string;
  mutedForeground?: string;
  popover?: string;
  popoverForeground?: string;
  border?: string;
  input?: string;
  card?: string;
  cardForeground?: string;
  primary?: string;
  primaryForeground?: string;
  secondary?: string;
  secondaryForeground?: string;
  accent?: string;
  accentForeground?: string;
  destructive?: string;
  destructiveForeground?: string;
  ring?: string;
  radius?: string;
}

export const defaultTheme: Theme = {
  colorScheme: "light",
  background: "#ffffff",
  foreground: "#404040",
  muted: "#D9D9D9",
  mutedForeground: "#A3A3A3",
  popover: "#ffffff",
  popoverForeground: "#292929",
  border: "#DCDEE4",
  input: "#DCDEE4",
  card: "#FAF9F8",
  cardForeground: "#292929",
  primary: "#ffffff",
  primaryForeground: "#696F8C",
  secondary: "#F5F5F5",
  secondaryForeground: "#171717",
  accent: "#E5F3FF",
  accentForeground: "#1D4ED8",
  destructive: "#292929",
  destructiveForeground: "#FF3363",
  ring: "#80849D",
  radius: "6px",
};

export const lightTheme: Theme = {
  ...defaultTheme,
};

export const darkTheme: Theme = {
  ...defaultTheme,
  colorScheme: "dark",
  foreground: "#d4d4d4",
  background: "#262626",
  card: "#262626",
  primary: "#262626",
};
