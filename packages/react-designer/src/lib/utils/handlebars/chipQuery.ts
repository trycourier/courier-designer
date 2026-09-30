/**
 * What the caret is currently typing inside a chip, and therefore what to
 * suggest.
 *
 * Lives here rather than beside the expression view because the variable chip
 * needs the same reading: a chip holding `#if data.us` was matched whole
 * against every suggestion, so the list emptied the moment an author typed a
 * sigil.
 */
export interface ChipQuery {
  /** `helper` while the caret is on the name, `argument` once past it. */
  mode: "helper" | "argument";
  /** The partial token under the caret. */
  query: string;
}

/**
 * The first token of the expression — or of a `(sub expression)` — is a helper
 * name. Everything after it is an argument, and an argument is usually a
 * variable path, so that is what gets offered there.
 */
export function chipQuery(inner: string): ChipQuery | null {
  const openParen = inner.lastIndexOf("(");
  const scope = openParen === -1 ? inner : inner.slice(openParen + 1);
  const head = scope.replace(/^[#^/]/, "");

  if (!/\s/.test(head)) {
    // A dotted or `$`-prefixed token is a variable path, not a helper name —
    // which is what an emptied chip retyped as `data.na` looks like.
    if (/[.$[\]]/.test(head)) {
      return /^[a-zA-Z0-9_$.[\]-]*$/.test(head) ? { mode: "argument", query: head } : null;
    }
    return /^[a-zA-Z0-9_-]*$/.test(head) ? { mode: "helper", query: head } : null;
  }

  // Past the name: the token under the caret is an argument.
  const token = scope.slice(scope.lastIndexOf(" ") + 1).replace(/^["']/, "");
  if (!/^[a-zA-Z0-9_$.[\]-]*$/.test(token)) return null;
  return { mode: "argument", query: token };
}

/** Back-compat shim for callers that only care about the helper position. */
export function helperQuery(inner: string): string | null {
  const result = chipQuery(inner);
  return result?.mode === "helper" ? result.query : null;
}

/**
 * The suggestions to offer for a chip whose whole contents are `inner`.
 *
 * Matching is against the token under the caret, never the whole chip, and
 * helpers are only offered where a helper can go.
 */
export function filterChipSuggestions(
  inner: string,
  variables: readonly string[],
  helpers: readonly string[] = []
): string[] {
  const parsed = chipQuery(inner);
  if (!parsed) return [];

  const { mode, query } = parsed;
  const lower = query.toLowerCase();
  const matched = query
    ? variables.filter((name) => name.toLowerCase().includes(lower))
    : [...variables];

  if (mode !== "helper") return matched;
  return [
    ...matched,
    ...(query ? helpers.filter((name) => name.toLowerCase().startsWith(lower)) : helpers),
  ];
}

/**
 * Where the token under the caret starts, or null when the chip does not parse.
 */
function chipTokenStart(inner: string): number | null {
  if (!chipQuery(inner)) return null;

  const openParen = inner.lastIndexOf("(");
  const scopeStart = openParen === -1 ? 0 : openParen + 1;
  const scope = inner.slice(scopeStart);
  const sigil = /^[#^/]/.test(scope) ? 1 : 0;
  const head = scope.slice(sigil);

  if (!/\s/.test(head)) return scopeStart + sigil;

  const afterSpace = scope.lastIndexOf(" ") + 1;
  const quote = /^["']/.test(scope.slice(afterSpace)) ? 1 : 0;
  return scopeStart + afterSpace + quote;
}

/**
 * The chip's new contents once a suggestion is chosen.
 *
 * Only the token under the caret is replaced: committing the suggestion over
 * the whole chip turned `#if data.us` into a variable named `data.user.name`
 * and lost the block opener.
 */
export function applyChipSuggestion(inner: string, item: string): string {
  const start = chipTokenStart(inner);
  return start === null ? item : inner.slice(0, start) + item;
}
