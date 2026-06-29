/**
 * Regex source for a whole Liquid `{% ... %}` tag, capturing the inner text in
 * one group. The inner matcher is quote-aware: a `%}` that appears inside a
 * single- or double-quoted argument (e.g. `{% assign x = s | split: '%}' %}`)
 * is consumed as part of the quoted string and does not end the tag.
 *
 * Inner = any run of: a char that is not `%`/quote, OR a `%` not followed by `}`,
 * OR a single-quoted string, OR a double-quoted string.
 */
export const LIQUID_TAG_TOKEN_SOURCE = "\\{%((?:[^%'\"]|%(?!\\})|'[^']*'|\"[^\"]*\")*)%\\}";
