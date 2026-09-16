/**
 * The Inbox channel's action-button styles.
 *
 * The vocabulary here is Elemental's own: `button`, `secondary`, `tertiary`, `link` are the
 * values `action.style` carries, and the sidebar names them rather than inventing a parallel
 * set. There used to be a translation layer — a UI "filled"/"outlined" pair mapped onto
 * Elemental on the way out — and it was where the encoding drifted from what the renderers
 * read.
 *
 * ## `background_color` is the accent, not the fill
 *
 * It is also the only color that reaches a renderer. The send pipeline builds its block config
 * without `textColor` (see `elementalActionNodeToBlockWire`), so `action.color` is dropped
 * before delivery and lives on only in the designer's own canvas.
 *
 * What the surviving color means depends on the style, and both renderers agree:
 *
 * - `button` — the fill.
 * - `secondary` — the border and the label (`border="1px solid {bg}" color="{bg}"` in email;
 *   `1px solid ${fill}` in the inbox kit).
 * - `tertiary` — the underline and the label.
 * - `link` — nothing; a link draws no chrome of its own.
 *
 * So an outlined button asks for `background_color: "#000000"`, not white. Saving white — as
 * the old encoding did, to mark "this one is outlined" — asks both renderers for a white border
 * and a white label, which is invisible on the surfaces they draw on.
 *
 * ## The old encoding
 *
 * Before `secondary` was accepted, outlined was saved as `link` carrying a white background,
 * and read back the same way. Templates saved that way are still opened every day, so
 * `isLegacyOutlinedBackground` still decodes them and re-saving migrates them. Nothing writes
 * that encoding any more.
 */

import type { IActionButtonStyle } from "@/types/elemental.types";
import { KIT_INK, KIT_SURFACE } from "./courierKitStyles";

/** The Inbox sidebar speaks Elemental's vocabulary directly — there is no separate UI style. */
export type InboxButtonStyle = IActionButtonStyle;

/** Segment order in the sidebar: most chrome to least. */
export const INBOX_BUTTON_STYLES: readonly InboxButtonStyle[] = [
  "button",
  "secondary",
  "tertiary",
  "link",
];

/**
 * The one color every Inbox preset is built from, and the label that sits on top of it.
 *
 * These are the kit's own values rather than pure black and white, so an untouched Inbox button
 * from the designer is the same color as one the kit draws for itself. See `courierKitStyles`.
 */
export const INBOX_ACCENT = KIT_INK;
export const INBOX_ON_ACCENT = KIT_SURFACE;

export interface InboxButtonPreset {
  /**
   * Elemental `background_color` — the accent, whose meaning depends on the style.
   *
   * Every style carries one, `link` included. No renderer reads it for a link, but the sidebar
   * and the canvas converter both emit these actions, and a field one path sets and the other
   * omits is how the encoding drifted last time. Uniform is cheaper than conditional.
   */
  backgroundColor: string;
  /**
   * The label color the canvas draws. Dropped before delivery, so it is a preview concern
   * only — a renderer never sees it.
   */
  textColor: string;
  /** Whether the canvas draws a border box for this style. */
  bordered: boolean;
}

export const INBOX_BUTTON_PRESETS: Record<InboxButtonStyle, InboxButtonPreset> = {
  button: { backgroundColor: INBOX_ACCENT, textColor: INBOX_ON_ACCENT, bordered: false },
  secondary: { backgroundColor: INBOX_ACCENT, textColor: INBOX_ACCENT, bordered: true },
  tertiary: { backgroundColor: INBOX_ACCENT, textColor: INBOX_ACCENT, bordered: false },
  link: { backgroundColor: INBOX_ACCENT, textColor: INBOX_ACCENT, bordered: false },
};

/**
 * The color pairs the old encoding wrote — pure black and white, before the presets moved onto
 * the kit's own near-black ink.
 *
 * These are frozen literals, deliberately not derived from the presets. They describe what is
 * already stored in customers' templates, so they must not move when the presets do; writing
 * them in terms of `INBOX_ACCENT` would silently stop recognizing every template out there the
 * moment the accent changed.
 */
export const INBOX_LEGACY_OUTLINED = {
  backgroundColor: "#ffffff",
  textColor: "#000000",
} as const;

export const INBOX_LEGACY_FILLED = {
  backgroundColor: "#000000",
  textColor: "#ffffff",
} as const;

/**
 * Case-insensitive equality against a sentinel hex. Values read back from HTML attributes are
 * typically lower-cased by the browser, an Elemental payload carries whatever was written, and
 * the kit's own palette is upper-case — so neither side can be assumed normalized.
 */
const matchesHex = (value: unknown, expected: string): boolean =>
  typeof value === "string" && value.toLowerCase() === expected.toLowerCase();

/**
 * True when a background is the white the old encoding used to mark an outlined button. No
 * current preset writes white, so this only ever matches a template saved under that encoding.
 */
export const isLegacyOutlinedBackground = (bg: unknown): boolean =>
  matchesHex(bg, INBOX_LEGACY_OUTLINED.backgroundColor);

/**
 * Recover the style from a saved action.
 *
 * `secondary` and `tertiary` say what they are. A `link` needs the background checked, because
 * the old encoding used `link` plus white to mean outlined — a `link` without that white was
 * always a real link and stays one. Anything else, including an action with no style at all,
 * is the filled default.
 */
export const inboxStyleFromElementalStyle = (
  style: unknown,
  backgroundColor: unknown
): InboxButtonStyle => {
  if (style === "secondary" || style === "tertiary") return style;
  if (style === "link") return isLegacyOutlinedBackground(backgroundColor) ? "secondary" : "link";
  return "button";
};

/**
 * Last-resort style recovery for a canvas node saved before buttons carried their style as an
 * attribute. Only the two pairs that encoding could produce are recognized; `undefined` means
 * "this was not an Inbox button", and the caller emits no style rather than guessing.
 */
export const inboxStyleFromColors = (
  bg: unknown,
  color: unknown
): IActionButtonStyle | undefined => {
  if (
    matchesHex(bg, INBOX_LEGACY_OUTLINED.backgroundColor) &&
    matchesHex(color, INBOX_LEGACY_OUTLINED.textColor)
  ) {
    return "secondary";
  }
  if (
    matchesHex(bg, INBOX_LEGACY_FILLED.backgroundColor) &&
    matchesHex(color, INBOX_LEGACY_FILLED.textColor)
  ) {
    return "button";
  }
  return undefined;
};
