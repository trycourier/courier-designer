/**
 * The chip glyphs, defined once.
 *
 * A chip is drawn twice in this package — as a React node view on the canvas,
 * and as an HTML string for surfaces that cannot mount React. The two had
 * drifted to different artwork, which is visible on one page: a subject chip
 * and a body chip showing different icons is how a host first noticed the
 * renderers were not one component.
 */

/**
 * lucide's `braces`, which is what the React chip renders via `<Braces />` and
 * what the rest of the product uses for a template reference. Copied as path
 * data because the HTML-string chip cannot mount a component; a test asserts it
 * still matches the installed icon, so an upgrade cannot silently split them.
 */
export const VARIABLE_ICON_PATHS = [
  "M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1",
  "M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1",
] as const;

export const VARIABLE_ICON_VIEWBOX = "0 0 24 24";

/** A branch, for control flow: `#if`, `else`, `/if`, helper calls. */
export const EXPRESSION_ICON_PATHS = [
  "M4 2v4.5A2.5 2.5 0 0 0 6.5 9H12",
  "M4 9v1.5A2.5 2.5 0 0 0 6.5 13H12",
] as const;

export const EXPRESSION_ICON_DOTS = [
  { cx: 4, cy: 2 },
  { cx: 12.4, cy: 9 },
  { cx: 12.4, cy: 13 },
] as const;

export const EXPRESSION_ICON_VIEWBOX = "0 0 16 16";

/** The variable glyph as markup, for the HTML-string chip. */
export function variableIconSvg(color: string): string {
  return [
    `<svg width="14" height="14" viewBox="${VARIABLE_ICON_VIEWBOX}" fill="none"`,
    ` xmlns="http://www.w3.org/2000/svg" class="courier-flex-shrink-0">`,
    ...VARIABLE_ICON_PATHS.map(
      (d) =>
        `<path d="${d}" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
    ),
    `</svg>`,
  ].join("");
}

/** The control-flow glyph as markup, for the HTML-string chip. */
export function expressionIconSvg(color: string): string {
  return [
    `<svg width="14" height="14" viewBox="${EXPRESSION_ICON_VIEWBOX}" fill="none"`,
    ` xmlns="http://www.w3.org/2000/svg" class="courier-flex-shrink-0">`,
    ...EXPRESSION_ICON_PATHS.map(
      (d) =>
        `<path d="${d}" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
    ),
    ...EXPRESSION_ICON_DOTS.map(
      ({ cx, cy }) => `<circle cx="${cx}" cy="${cy}" r="1.4" fill="${color}"/>`
    ),
    `</svg>`,
  ].join("");
}
