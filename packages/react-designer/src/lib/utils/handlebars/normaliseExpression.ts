/**
 * Collapse whitespace runs outside quoted strings, and trim.
 *
 * A helper picked from autocomplete is inserted as `{{capitalize }}` so the
 * caret lands where the argument goes; an author who types their own space
 * produced `{{capitalize  data.name}}`. Quoted arguments are left alone —
 * `{{t "two  spaces"}}` is the author's string, not spacing.
 */
export function normaliseExpressionSpacing(inner: string): string {
  // A comment is prose; its spacing is the author's.
  if (/^\s*!/.test(inner)) return inner.trim();

  let out = "";
  let quote: string | null = null;
  let pendingSpace = false;

  for (const char of inner) {
    if (quote) {
      out += char;
      if (char === quote) quote = null;
      continue;
    }
    if (/\s/.test(char)) {
      pendingSpace = true;
      continue;
    }
    if (pendingSpace && out) out += " ";
    pendingSpace = false;
    out += char;
    if (char === '"' || char === "'") quote = char;
  }

  return out;
}
