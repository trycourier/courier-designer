import type { CSSProperties } from "react";
import type { IActionButtonStyle } from "@/types/elemental.types";
import { KIT_BASE, KIT_INK, KIT_ON_INK, KIT_SURFACE } from "./courierKitStyles";

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
 * - `tertiary` — the quietest button: no fill and no outline, just the label in the accent. It
 *   keeps its padding and a transparent border, so it still reads as a button and lines up with
 *   a filled or outlined sibling beside it.
 * - `link` — the `isLink` branch returns early with no button chrome: transparent, no border,
 *   underlined, in the kit's ink. It keeps its padding, though. The variant default is `0px`,
 *   but `CourierButton` resolves `props.padding ?? defaults.padding` and the link branch passes
 *   `action.padding` straight through, so the padding the sidebar stamps on every action wins.
 *   Drawing an unpadded link here would show a link narrower than the one that gets delivered.
 *
 * Every style but `link` keeps a border box so a mixed row lines up — the kit's own
 * `TRANSPARENT_BORDER` exists for exactly that.
 *
 * The filled case also keeps a legibility guard that predates the styles: a white fill draws a
 * hairline rather than a transparent border, or it vanishes against the editor's own light
 * surface. That guard was never Inbox-specific — a white email button relies on it too — so it
 * tests the same exact `#ffffff` it always has, and no existing button changes because of it.
 */

/** The one fill the legibility guard has ever tested for. */
const isWhiteFill = (value: string | undefined): boolean =>
  typeof value === "string" && value.toLowerCase() === "#ffffff";
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
      return {
        ...base,
        backgroundColor: KIT_SURFACE,
        color: resolvedAccent,
        border: `1px solid ${resolvedAccent}`,
      };
    case "tertiary":
      return {
        ...base,
        backgroundColor: "transparent",
        color: resolvedAccent,
        border: "1px solid transparent",
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
        // An Inbox action carries no colour of its own, so the label falls back the way the kit
        // falls back — `readableTextColor(fill)` on a dark accent is white.
        color: labelColor ?? KIT_ON_INK,
        border: `1px solid ${isWhiteFill(accent) ? (labelColor ?? "#000000") : "transparent"}`,
      };
  }
};
