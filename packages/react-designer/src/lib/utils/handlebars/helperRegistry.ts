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

/** Block helpers built into Handlebars itself, which the renderer never re-registers. */
export const BUILTIN_HELPERS = ["if", "unless", "each", "with", "lookup", "log"] as const;

const KNOWN = new Set<string>([...UNIVERSAL_HELPERS, ...BUILTIN_HELPERS]);

export function isKnownHelper(name: string): boolean {
  return KNOWN.has(name);
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
export const HIDDEN_FROM_SUGGESTIONS = ["courier-block", "courier-partial"] as const;

const HIDDEN = new Set<string>(HIDDEN_FROM_SUGGESTIONS);

export function isSuggestableHelper(name: string): boolean {
  return !HIDDEN.has(name);
}
