/**
 * What the Inbox actually draws, for both modes.
 *
 * Mirrored from `@trycourier/courier-ui-core` — `CourierButtonVariants` in
 * `components/courier-button.ts`, the palette in `utils/courier-colors.ts`, the light/dark
 * themes in `utils/theme.ts`, and the style→variant mapping in `utils/action-styles.ts`. The
 * designer canvas is a preview of that component, so these are copied deliberately rather than
 * picked to look right here: a preview that invents its own values is how the outlined button
 * came to be saved as a white-on-white link without anyone noticing.
 *
 * The values live here as constants and are rendered as CSS in `styles.css`, because hover,
 * active and dark mode cannot be expressed as inline styles.
 */

/** `CourierColors`. */
export const KIT_COLORS = {
  black500: "#171717",
  black500_10: "#1717171A",
  black500_20: "#17171733",
  gray200: "#F5F5F5",
  gray400: "#3A3A3A",
  gray500: "#E5E5E5",
  gray700: "#454545",
  gray800: "#2E2E2E",
  white500: "#FFFFFF",
  white500_10: "#FFFFFF1A",
  white500_20: "#FFFFFF33",
  blue400: "#60A5FA",
  blue500: "#2563EB",
} as const;

/** `theme.light.colors` / `theme.dark.colors`. */
export const KIT_THEME = {
  light: {
    primary: KIT_COLORS.black500,
    secondary: KIT_COLORS.white500,
    border: KIT_COLORS.gray500,
    link: KIT_COLORS.blue500,
  },
  dark: {
    primary: KIT_COLORS.white500,
    secondary: KIT_COLORS.black500,
    border: KIT_COLORS.gray400,
    link: KIT_COLORS.blue400,
  },
} as const;

/** `baseButtonStyles`, shared by every variant. */
export const KIT_BASE = {
  borderRadius: "4px",
  fontSize: "14px",
  padding: "6px 10px",
  fontWeight: "500",
} as const;

/** The ink an action falls back to when it names no color of its own (light mode). */
export const KIT_INK = KIT_THEME.light.primary;

/** The label the kit puts on a dark fill — `readableTextColor` of the ink. */
export const KIT_ON_INK = KIT_COLORS.white500;

/** `theme.light.colors.secondary` — the surface an outlined button sits on. */
export const KIT_SURFACE = KIT_THEME.light.secondary;

/** Radius as a number, for a node attribute that wants one. */
export const KIT_BORDER_RADIUS = 4;
