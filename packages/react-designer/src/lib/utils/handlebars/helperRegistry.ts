/**
 * Helpers the renderer registers, mirrored from the backend so the editor flags
 * exactly what would fail at send time — no more, no less.
 *
 * Source of truth: `handlebars/helpers/universal/index.ts` in trycourier/backend
 * (plus its `array`, `math` and `string` sub-indexes). Adding a helper there
 * without adding it here makes the editor flag a working expression, so keep the
 * two in step.
 */
export const UNIVERSAL_HELPERS = [
  "and",
  "capitalize",
  "concat",
  "condition",
  "conditional",
  "contains",
  "courier-block",
  "courier-partial",
  "datetime-format",
  "default",
  "each",
  "filter",
  "format",
  "get-link-tracking",
  "get-href",
  "get-list-items",
  "inc",
  "inline-var",
  "json-parse",
  "link-context",
  "line-break",
  "not",
  "or",
  "params",
  "parse-string",
  "partial-block-indent-fix",
  "path",
  "prerender",
  "replace-all",
  "set",
  "swu_datetimeformat",
  "swu_iso8601_to_time",
  "swu_timestamp_to_time",
  "text-direction",
  "translate",
  "t",
  "trim",
  "trim-left",
  "trim-one-char-right",
  "trim-right",
  "truncate",
  "var",
  "with",
  // array
  "range",
  // math
  "abs",
  "add",
  "ceil",
  "divide",
  "floor",
  "mod",
  "multiply",
  "product",
  "round",
  "sub",
  "subtract",
  // string
  "split",
  // handlebars-intl, registered globally (backend `handlebars/handlebars.ts`)
  "intl",
  "intlGet",
  "formatDate",
  "formatTime",
  "formatRelative",
  "formatNumber",
  "formatMessage",
  "formatHTMLMessage",
  "intlDate",
  "intlTime",
  "intlNumber",
  "intlMessage",
  "intlHTMLMessage",
] as const;

/**
 * Helpers registered ALONGSIDE author-written content, per channel.
 *
 * Which set a template gets depends on the render path, and only these reach
 * content an author writes: elemental blocks get `helpers/elemental`, in-app
 * gets `helpers/in-app`, Slack gets `helpers/slack`, MSTeams gets
 * `helpers/markdown` and `helpers/msteams`, and a single-value field such as a
 * subject gets the universal set alone.
 *
 * `helpers/email` is deliberately absent. It is registered by
 * `handlebars/template/email.ts`, which compiles the renderer's own email
 * LAYOUT — not the author's blocks — so `{{markdown data.name}}` in an email
 * text block is `Missing helper: "markdown"` and kills the send. Reading the
 * family names off the backend tree rather than the registration sites put
 * `markdown` in here and stopped that being reported.
 *
 * `markdown` is left out for the same reason even though Slack and MSTeams do
 * register it: this check has no channel, and the measured failure is the email
 * one.
 */
/**
 * The block helpers the renderer registers for an author's TEXT, on every
 * channel.
 *
 * `handlebars/template/{slack,msteams}.ts` register more, but those sets apply
 * to the channel's own BLOCK TEMPLATE, not to the text an author writes inside
 * it — the same trap `helpers/email` set earlier. Measured on dev, read from
 * `/messages/{id}/history`: Slack `{{markdown data.s}}` is
 * `Missing helper: "markdown"`, as are `{{jsonnet "1+1"}}` and
 * `{{markdown-quote data.s}}`; Teams `{{javascript "1+1"}}` and
 * `{{markdown-quote data.s}}` the same; and `{{markdown-quote data.s}}` fails
 * on email too. So author text gets universal + elemental, everywhere.
 *
 * The lesson, twice learned: read the REGISTRATION SITE for the path the text
 * actually compiles on, never a family's name.
 */
const AUTHOR_TEXT_HELPERS = [
  "elemental-action-block",
  "elemental-text-block",
  "markdown-mark",
] as const;

/**
 * Names the renderer owns that an author should never be offered, whichever
 * channel registers them. Wider than what is KNOWN: a Slack block helper is not
 * callable from author text, and it is still not something to suggest.
 */
export const CHANNEL_HELPERS: string[] = [
  ...AUTHOR_TEXT_HELPERS,
  "get-action-id",
  "in-app-action-block",
  "in-app-text-block",
  "javascript",
  "jsonnet",
  "markdown",
  "markdown-quote",
  "slack-action-block",
  "slack-divider-block",
  "slack-image-block",
  "slack-text-block",
].sort();

/** Block helpers built into Handlebars itself, which the renderer never re-registers. */
export const BUILTIN_HELPERS = ["if", "unless", "each", "with", "lookup", "log"] as const;

const ALWAYS_KNOWN = new Set<string>([...UNIVERSAL_HELPERS, ...BUILTIN_HELPERS]);

/**
 * Whether the renderer would find this helper in an author's text.
 *
 * `channel` is still taken, and still means what it says — the channel the text
 * will render on — but the answer no longer varies by it: every channel
 * compiles author text with universal + elemental. See `AUTHOR_TEXT_HELPERS`
 * for the sends that settled it.
 */
export function isKnownHelper(name: string, _channel?: string): boolean {
  return ALWAYS_KNOWN.has(name) || (AUTHOR_TEXT_HELPERS as readonly string[]).includes(name);
}

/** Operators accepted by the `condition` helper (backend `condition.ts`). */
export const CONDITION_OPERATORS = ["==", "===", "<", "<=", ">", ">=", "!=", "!=="] as const;

/**
 * `filter` uses a different vocabulary from `condition` — uppercase words, not
 * symbols (`lib/conditional-filter.ts`). Passing `">"` throws
 * `Invalid Operator: >` at render and the message is undeliverable, so the two
 * lists must never be conflated.
 */
export const FILTER_OPERATORS = [
  "EQUALS",
  "NOT_EQUALS",
  "CONTAINS",
  "NOT_CONTAINS",
  "GREATER_THAN",
  "LESS_THAN",
  "GREATER_THAN_EQUALS",
  "LESS_THAN_EQUALS",
  "IS_EMPTY",
  "NOT_EMPTY",
] as const;

export function isValidFilterOperator(op: string): boolean {
  return (FILTER_OPERATORS as readonly string[]).includes(op);
}

export function isValidConditionOperator(op: string): boolean {
  return (CONDITION_OPERATORS as readonly string[]).includes(op);
}

/**
 * Helpers the renderer knows but authors should not be offered.
 *
 * `isKnownHelper` still accepts them — a template using one is valid and must
 * not be flagged — this only keeps them out of the suggestion lists. Kept as
 * one constant so both lists cannot drift.
 */
/**
 * The helpers documented at courier.com/docs/design/templates/variables, which
 * are the only ones offered to an author.
 *
 * An allowlist rather than a hide-list: the renderer registers plenty of
 * internal, deprecated and intl helpers that work but are not for authors to
 * discover. Everything outside this list stays valid — `isKnownHelper` and
 * validation are unchanged — it is simply not suggested.
 */
export const SUGGESTED_HELPERS = [
  "abs",
  "add",
  "and",
  "capitalize",
  "ceil",
  "concat",
  "condition",
  "conditional",
  "contains",
  "datetime-format",
  "default",
  "divide",
  "each",
  "filter",
  "floor",
  "format",
  "if",
  "inc",
  "json-parse",
  "line-break",
  "mod",
  "multiply",
  "not",
  "or",
  "params",
  "parse-string",
  "path",
  "product",
  "range",
  "replace-all",
  "round",
  "set",
  "split",
  "sub",
  "subtract",
  "swu_datetimeformat",
  "swu_iso8601_to_time",
  "swu_timestamp_to_time",
  "t",
  "text-direction",
  "trim",
  "trim-left",
  "trim-right",
  "truncate",
  "var",
  "with",
] as const;

const SUGGESTED = new Set<string>(SUGGESTED_HELPERS);

export function isSuggestableHelper(name: string): boolean {
  return SUGGESTED.has(name);
}

/**
 * The suggestion list, sorted and with each name once. It used to be the two
 * helper arrays concatenated, which listed `each` and `with` twice — duplicate
 * React keys in the autocomplete.
 */
export const SUGGESTABLE_HELPERS: string[] = [...SUGGESTED].sort();
