import type { CSSProperties } from "react";
import type { IActionButtonStyle } from "@/types/elemental.types";
import { KIT_BASE, KIT_INK, KIT_SURFACE } from "./courierKitStyles";

/**
 * The CSS the canvas draws for an action, matching what the Inbox will render for it.
 *
 * Worked through `courierActionButtonProps` in `@trycourier/courier-ui-core`, which is where an
 * Elemental action turns into `CourierButton` props, then through the variant defaults that
 * fill in whatever the action left unsaid:
 *
 * - `button` — the accent is the fill, and the label is `readableTextColor(fill)`, so a dark
 *   accent takes a white label.
 * - `secondary` — no fill from the action; the kit's own surface shows through, and the accent
 *   becomes `1px solid {accent}` plus the label colour.
 * - `tertiary` — the kit maps it through the same `outlined` branch as `secondary`
 *   (`outlinedByStyle = style === 'secondary' || style === 'tertiary'`), so it renders
 *   identically in the Inbox. Email is the only place the two differ, where `tertiary` is an
 *   underline. Drawing a difference here that the Inbox does not draw would be a lie.
 * - `link` — the `isLink` branch returns early with no button chrome: transparent, no border,
 *   underlined, in the kit's ink. It keeps its padding, though. The variant default is `0px`,
 *   but `CourierButton` resolves `props.padding ?? defaults.padding` and the link branch passes
 *   `action.padding` straight through, so the padding the sidebar stamps on every action wins.
 *   Drawing an unpadded link here would show a link narrower than the one that gets delivered.
 *
 * Every style but `link` keeps a border box so a mixed row lines up — the kit's own
 * `TRANSPARENT_BORDER` exists for exactly that.
 */
export const actionLookFromStyle = (
  actionStyle: IActionButtonStyle | undefined,
  accent: string | undefined,
  labelColor: string | undefined
): CSSProperties => {
  const resolvedAccent = accent || KIT_INK;
  const base: CSSProperties = {
    fontWeight: KIT_BASE.fontWeight,
  };

  switch (actionStyle) {
    case "secondary":
    case "tertiary":
      return {
        ...base,
        backgroundColor: KIT_SURFACE,
        color: resolvedAccent,
        border: `1px solid ${resolvedAccent}`,
      };
    case "link":
      return {
        ...base,
        backgroundColor: "transparent",
        color: labelColor || KIT_INK,
        border: "none",
        textDecoration: "underline",
      };
    default:
      return {
        ...base,
        backgroundColor: resolvedAccent,
        color: labelColor,
        border: "1px solid transparent",
      };
  }
};
