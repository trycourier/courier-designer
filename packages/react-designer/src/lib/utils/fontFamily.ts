const DEFAULT_FALLBACK = "sans-serif";

/**
 * Parse a CSS font-family string into primary font and fallback stack.
 *
 * primary  = first comma-separated token
 * fallback = everything after the first token, joined back
 *
 * Examples:
 *   "Roboto, sans-serif"            → { primary: "Roboto",    fallback: "sans-serif" }
 *   "Roboto, Georgia, serif"        → { primary: "Roboto",    fallback: "Georgia, serif" }
 *   "Helvetica, Arial, sans-serif"  → { primary: "Helvetica", fallback: "Arial, sans-serif" }
 */
export function parseFontFamily(fontFamily: string | null | undefined): {
  primary: string;
  fallback: string;
} {
  if (!fontFamily) return { primary: "", fallback: DEFAULT_FALLBACK };
  const parts = fontFamily.split(",").map((s) => s.trim());
  const primary = parts[0] ?? "";
  const fallback = parts.length > 1 ? parts.slice(1).join(", ") : DEFAULT_FALLBACK;
  return { primary, fallback };
}

/**
 * Build a CSS font-family string from a primary font and a fallback stack.
 *
 * Examples:
 *   buildFontFamily("Roboto", "sans-serif")       → "Roboto, sans-serif"
 *   buildFontFamily("Roboto", "Georgia, serif")   → "Roboto, Georgia, serif"
 */
export function buildFontFamily(primary: string, fallback: string): string {
  return `${primary}, ${fallback}`;
}
