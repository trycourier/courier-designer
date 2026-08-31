import type { CSSProperties } from "react";
import type { IActionButtonStyle } from "@/types/elemental.types";

/** The one fill the legibility guard has ever tested for. */
const isWhiteFill = (value: string | undefined): boolean =>
  typeof value === "string" && value.toLowerCase() === "#ffffff";

/**
 * The class that draws an action the way the Inbox draws it.
 *
 * The rules live in `styles.css` rather than here because hover, active and dark mode cannot be
 * expressed as inline styles, and matching the delivered button means matching its pointer
 * states too. See that block for the mapping back to `CourierButtonVariants`.
 */
export const actionLookClassName = (actionStyle: IActionButtonStyle | undefined): string =>
  `courier-inbox-action courier-inbox-action--${actionStyle ?? "button"}`;

/**
 * The inline overrides for an action that carries colours of its own.
 *
 * Only a template that named a colour gets any, so a default Inbox action stays entirely on the
 * kit's own styling — including its light and dark palettes, which a stamped value cannot
 * follow. What the colour means depends on the style, exactly as in the renderers: the fill for
 * `button`, the outline and the label for `secondary` and `tertiary`, the label for `link`.
 */
export const actionLookFromStyle = (
  actionStyle: IActionButtonStyle | undefined,
  accent: string | undefined,
  labelColor: string | undefined
): CSSProperties => {
  if (!accent && !labelColor) return {};

  switch (actionStyle) {
    case "secondary":
      return accent ? { color: accent, border: `1px solid ${accent}` } : {};
    case "tertiary":
      return accent ? { color: accent } : {};
    case "link":
      return labelColor || accent ? { color: labelColor || accent } : {};
    default:
      return {
        ...(accent ? { backgroundColor: accent } : {}),
        ...(labelColor ? { color: labelColor } : {}),
        // Predates the styles and was never Inbox-specific: a white email button relies on this
        // hairline, and without it that button vanishes against the editor's own light surface.
        ...(isWhiteFill(accent) ? { border: `1px solid ${labelColor ?? "#000000"}` } : {}),
      };
  }
};
