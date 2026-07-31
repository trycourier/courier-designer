/**
 * Helpers for the CSS-valued Elemental properties (`font_size`, `line_height`,
 * document `padding`).
 *
 * The backend validates these at save/render time and silently drops anything
 * that doesn't match — see `api/send/validation/schema/css-values.ts` in the
 * backend repo. The regexes here mirror that contract so the designer never
 * writes a value the renderer will throw away:
 *
 *   font_size    px only                        "18px"
 *   line_height  px or unitless multiplier      "24px" | "1.5"
 *   padding      1-4 space-separated lengths,   "8px 30px" | "0 30px"
 *                each a bare 0 or a px value
 *
 * Internally the designer stores font size / line height as plain px numbers,
 * because every editor control for them is a px number input. A unitless
 * `line_height` coming from an API-authored template is therefore resolved
 * against the effective font size on import (see `lineHeightToPx`).
 */

/** px only — matches the backend CSS_PX_REGEX. */
export const CSS_PX_REGEX = /^\s*\d+(\.\d+)?px\s*$/;

/** px length or unitless multiplier — matches the backend CSS_LINE_HEIGHT_REGEX. */
export const CSS_LINE_HEIGHT_REGEX = /^\s*\d+(\.\d+)?(px)?\s*$/;

const CSS_PADDING_LENGTH = "(0|\\d+(\\.\\d+)?px)";
/** 1-4 space-separated lengths, each a bare `0` or a px value. */
export const CSS_PADDING_REGEX = new RegExp(
  `^\\s*${CSS_PADDING_LENGTH}(\\s+${CSS_PADDING_LENGTH}){0,3}\\s*$`
);

/**
 * Parse an Elemental px value (e.g. "18px") into a number.
 * Returns undefined for anything the backend would reject.
 */
export const parsePxValue = (value?: string | null): number | undefined => {
  if (typeof value !== "string" || !CSS_PX_REGEX.test(value)) return undefined;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Largest value we serialize. 10,000px is already two orders of magnitude past
 * any real type size or body inset, so anything above it is a typo or a bad
 * import rather than an intent — and rejecting it is safer than writing a value
 * that renders as an unusable wall of text.
 *
 * A ceiling is needed at all because serialization is not total: past 1e21
 * JavaScript switches to exponential notation (`${1e21}` is `"1e+21"`), which
 * fails CSS_PX_REGEX and would be dropped at render time with no feedback. This
 * limit sits far below that, so the exponential case can never be reached.
 */
const MAX_PX_VALUE = 10_000;

/** Serialize a px number back to Elemental form. Drops non-positive/invalid input. */
export const formatPxValue = (value?: number | null): string | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
  if (value > MAX_PX_VALUE) return undefined;
  return `${value}px`;
};

/**
 * Resolve an Elemental `line_height` to px.
 *
 * A unitless multiplier is only meaningful relative to a font size, so it is
 * multiplied by `effectiveFontSize` (the block's own `font_size` when set,
 * otherwise the tier preset). Keeps the editor's px control honest and
 * round-trips as px, which is also what the renderer prefers — Outlook
 * mishandles unitless line-heights.
 */
export const lineHeightToPx = (
  value: string | undefined | null,
  effectiveFontSize: number
): number | undefined => {
  if (typeof value !== "string" || !CSS_LINE_HEIGHT_REGEX.test(value)) return undefined;
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  if (value.includes("px")) return parsed;
  return Math.round(parsed * effectiveFontSize);
};

export interface PaddingSides {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Expand a CSS padding shorthand into its four sides, following the standard
 * 1/2/3/4-value rules. Returns undefined when the value isn't a shorthand the
 * backend accepts.
 */
export const parsePaddingShorthand = (value?: string | null): PaddingSides | undefined => {
  if (typeof value !== "string" || !CSS_PADDING_REGEX.test(value)) return undefined;

  const parts = value.trim().split(/\s+/).map(parseFloat);
  if (parts.some((n) => !Number.isFinite(n))) return undefined;

  switch (parts.length) {
    case 1:
      return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
    case 2:
      return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
    case 3:
      return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
    default:
      return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
  }
};

/**
 * Collapse a padding shorthand to the vertical/horizontal pair the simplified
 * Frame control exposes. Asymmetric 3/4-value shorthands (authored via API or
 * the advanced view) fall back to their top/left sides for display.
 */
export const paddingShorthandToVH = (
  value?: string | null
): { vertical: number; horizontal: number } | undefined => {
  const sides = parsePaddingShorthand(value);
  if (!sides) return undefined;
  return { vertical: sides.top, horizontal: sides.left };
};

/** Build the `vertical horizontal` shorthand the Frame control writes. */
export const formatPaddingVH = (vertical: number, horizontal: number): string => {
  const clamp = (n: number) => Math.min(MAX_PX_VALUE, Math.max(0, Number.isFinite(n) ? n : 0));
  return `${clamp(vertical)}px ${clamp(horizontal)}px`;
};
