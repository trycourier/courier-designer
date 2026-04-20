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
 * Returns true when the given background color represents the outlined
 * Inbox button style. The comparison is case-insensitive so values read
 * from HTML attributes (which lower-case hex strings) still match.
 */
export const isOutlinedInboxBackground = (bg: unknown): boolean =>
  typeof bg === "string" && bg.toLowerCase() === INBOX_OUTLINED.backgroundColor;

/**
 * Map a UI style ("filled" | "outlined") to the Elemental `action.style`
 * value accepted by the backend schema.
 */
export const inboxStyleToElementalStyle = (style: InboxButtonStyle): "button" | "link" =>
  style === "outlined" ? "link" : "button";

/**
 * Derive the Elemental `action.style` from a button's background color.
 * Used when converting ProseMirror nodes (which don't persist `style`)
 * back to Elemental so round-trips keep the backend-visible style in sync.
 */
export const inboxStyleFromBackground = (bg: unknown): "button" | "link" =>
  isOutlinedInboxBackground(bg) ? "link" : "button";
