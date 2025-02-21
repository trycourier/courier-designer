export interface Theme {
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
  background: "#ffffff",
  foreground: "#292929",
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
  destructive: "#ffffff",
  destructiveForeground: "#FF3363",
  ring: "#80849D",
  radius: "6px",
};
