/**
 * Upper bounds for the authored text metrics, in px, shared by every surface
 * that edits them: the document-level base (Text section), the per-block
 * overrides (TypographyFields) and the per-run size (text bubble menu).
 *
 * Enforced in the commit paths, not just as the inputs' `max` attribute — a
 * `type="number"` input still accepts an out-of-range value when it is typed or
 * pasted, and `max` only blocks the spinner and form validation.
 */
export const MAX_FONT_SIZE = 128;
export const MAX_LINE_HEIGHT = 160;

/** Caps an authored px value, leaving `null` ("inherit") alone. */
export const clampTypographyValue = (value: number | null, max: number): number | null =>
  value === null ? null : Math.min(value, max);
