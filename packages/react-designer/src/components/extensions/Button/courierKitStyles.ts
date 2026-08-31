/**
 * What the Inbox actually draws.
 *
 * Mirrored from `@trycourier/courier-ui-core` — `CourierButtonVariants` in
 * `components/courier-button.ts`, the light palette in `utils/courier-colors.ts`, and the
 * mapping in `utils/action-styles.ts`. The designer canvas is a preview of that component, so
 * these are copied deliberately rather than picked to look nice here: a preview that invents
 * its own values is how the outlined button came to be saved as a white-on-white link without
 * anyone noticing.
 *
 * Light mode only. The kit follows the viewer's mode; the designer canvas is always light.
 */

/** `theme.light.colors.primary` — the kit's ink, and its filled button's default fill. */
export const KIT_INK = "#171717";

/** `theme.light.colors.secondary` — the surface an outlined button sits on. */
export const KIT_SURFACE = "#FFFFFF";

/**
 * What `readableTextColor` returns for a label sitting on the ink — the kit's own choice for a
 * filled button, used when the action names no colour of its own.
 */
export const KIT_ON_INK = "#FFFFFF";

/** `theme.light.colors.border` — the outline the kit draws when an action names no colour. */
export const KIT_BORDER = "#E5E5E5";

/** `baseButtonStyles`, shared by every variant. */
export const KIT_BASE = {
  borderRadius: "4px",
  fontSize: "14px",
  padding: "6px 10px",
  fontWeight: "500",
} as const;

/** The padding the sidebar writes onto the action, matching the kit's base. */
export const KIT_PADDING = KIT_BASE.padding;

/** Radius as a number, for the node attribute and the Elemental `border.radius`. */
export const KIT_BORDER_RADIUS = 4;
