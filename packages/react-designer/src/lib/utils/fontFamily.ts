const DEFAULT_FALLBACK = "sans-serif";
const GENERIC_FAMILIES = new Set(["sans-serif", "serif", "monospace"]);

/**
 * Parse a CSS font-family string into primary font and generic fallback.
 *
 * Handles both legacy 3-part ("Roboto, Arial, sans-serif") and
 * current 2-part ("Roboto, sans-serif") formats. The last recognised
 * generic family in the list is used as the fallback.
 */
export function parseFontFamily(fontFamily: string): {
  primary: string;
  fallback: string;
} {
  const parts = fontFamily.split(",").map((s) => s.trim());
  const generic = [...parts].reverse().find((p) => GENERIC_FAMILIES.has(p));
  return {
    primary: parts[0] ?? "",
    fallback: generic ?? DEFAULT_FALLBACK,
  };
}

/**
 * Build a CSS font-family string: "PrimaryFont, generic-fallback".
 */
export function buildFontFamily(primary: string, fallback: string): string {
  return `${primary}, ${fallback}`;
}
