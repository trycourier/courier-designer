/**
 * Sentinel values that define the Inbox channel's two action-button styles.
 *
 * These hex values are NOT design tokens — they are checked across several
 * layers (sidebar form, ProseMirror node attrs, Elemental converters, node
 * view components) to decide whether a given action is rendered as a filled
 * or outlined button. Changing them in one place without updating the others
 * will silently break that detection, so every consumer should import from
 * this module instead of inlining the literals.
 */

export type InboxButtonStyle = "filled" | "outlined";

export const INBOX_FILLED = {
  backgroundColor: "#000000",
  textColor: "#ffffff",
} as const;

export const INBOX_OUTLINED = {
  backgroundColor: "#ffffff",
  textColor: "#000000",
} as const;

export const INBOX_BUTTON_COLORS: Record<
  InboxButtonStyle,
  { backgroundColor: string; textColor: string }
> = {
  filled: INBOX_FILLED,
  outlined: INBOX_OUTLINED,
};

/**
 * Case-insensitive equality check against a sentinel hex string. Hex values
 * read from HTML attributes are typically lower-cased by the browser, but
 * elemental payloads may carry whatever the author wrote.
 */
const matchesHex = (value: unknown, expected: string): boolean =>
  typeof value === "string" && value.toLowerCase() === expected;

/**
 * Returns true when the given background color matches the outlined Inbox
 * sentinel. Most callers should prefer `matchesOutlinedSentinel` (which also
 * checks the text color) when emitting backend-visible fields, since a lone
 * white background can occur outside the Inbox contract.
 */
export const isOutlinedInboxBackground = (bg: unknown): boolean =>
  matchesHex(bg, INBOX_OUTLINED.backgroundColor);

/**
 * Returns true only when both the background AND text color match the
 * outlined Inbox sentinel pair. This is stricter than
 * `isOutlinedInboxBackground` and should be used wherever an accidental
 * match outside the Inbox channel would leak into a backend-visible field
 * (e.g. when emitting `action.style: "link"` from a `buttonRow` that has
 * no channel context at the call site).
 */
export const matchesOutlinedSentinel = (bg: unknown, color: unknown): boolean =>
  matchesHex(bg, INBOX_OUTLINED.backgroundColor) && matchesHex(color, INBOX_OUTLINED.textColor);

/**
 * Returns true only when both the background AND text color match the
 * filled Inbox sentinel pair. Symmetric counterpart to
 * `matchesOutlinedSentinel`.
 */
export const matchesFilledSentinel = (bg: unknown, color: unknown): boolean =>
  matchesHex(bg, INBOX_FILLED.backgroundColor) && matchesHex(color, INBOX_FILLED.textColor);

/**
 * Map a UI style ("filled" | "outlined") to the Elemental `action.style`
 * value accepted by the backend schema.
 */
export const inboxStyleToElementalStyle = (style: InboxButtonStyle): "button" | "link" =>
  style === "outlined" ? "link" : "button";

/**
 * Derive the Elemental `action.style` from a button's background color
 * alone. Kept for backward compatibility; new callers that emit to the
 * backend should use `inboxStyleFromColors` so a non-Inbox button that
 * happens to have a #ffffff background doesn't get tagged as a link.
 */
export const inboxStyleFromBackground = (bg: unknown): "button" | "link" =>
  isOutlinedInboxBackground(bg) ? "link" : "button";

/**
 * Derive the Elemental `action.style` from a button's color pair. Returns
 * `"link"` only when both bg and text color match the outlined sentinel,
 * `"button"` only when both match the filled sentinel, and `undefined`
 * otherwise — signalling to the caller that the button is not part of the
 * Inbox Filled/Outlined contract and no `style` should be emitted.
 */
export const inboxStyleFromColors = (
  bg: unknown,
  color: unknown
): "button" | "link" | undefined => {
  if (matchesOutlinedSentinel(bg, color)) return "link";
  if (matchesFilledSentinel(bg, color)) return "button";
  return undefined;
};
