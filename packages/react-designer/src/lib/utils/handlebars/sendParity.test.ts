import { beforeEach, describe, expect, it } from "vitest";
import { renderHandlebarsPreview, resetPreviewEnv } from "./renderPreview";

/**
 * Preview output pinned to what a real dev `/send` rendered for the same
 * expression and data (audit run 20260923-111034). `error` is a substring of the
 * send's failure; the preview must fail too.
 */
interface ParityCase {
  expr: string;
  data: Record<string, unknown>;
  text?: string;
  error?: string;
  /** Helpers the preview must flag as approximate for this expression. */
  approximated?: string[];
}

const F010_DATA = {
  iso: "2026-09-23T10:00:00Z",
  n: 42,
  s: "hello world",
  e: "",
  ms: 1790157600000,
  f: 1.5,
  isooff: "2026-09-23T10:00:00-0300",
};

const F012_DATA = { u: "https://example.com", tags: ["beta", "vip"], n: 42, o: {} };

const cases: [string, ParityCase][] = [
  // F-003: the send drops null-valued keys, so math helpers see `undefined`.
  ...(
    [
      "[{{add data.v 8}}]",
      "[{{subtract data.v 8}}]",
      "[{{sub data.v 8}}]",
      "[{{multiply data.v 8}}]",
      "[{{product data.v 8}}]",
      "[{{divide data.v 8}}]",
      "[{{mod data.v 8}}]",
      "[{{abs data.v}}]",
      "[{{ceil data.v}}]",
      "[{{floor data.v}}]",
      "[{{round data.v}}]",
    ] as const
  ).map((expr): [string, ParityCase] => [
    `F-003 ${expr} on null`,
    { expr, data: { v: null }, error: "undefined is NaN" },
  ]),
  [
    "F-003 a null key nested in an object is dropped",
    { expr: "{{#each data.o}}{{@key}},{{/each}}", data: { o: { v: null, w: 1 } }, text: "w," },
  ],
  [
    "F-003 a null array element is kept",
    {
      expr: "{{#each data.v}}[{{trim this}}]{{/each}}",
      data: { v: [null, "x"] },
      text: "[null][x]",
    },
  ],
  [
    "F-003 a null key of an object inside an array is kept",
    {
      expr: "{{#each data.v}}[{{trim this.a}}]{{/each}}",
      data: { v: [{ a: null }] },
      text: "[null]",
    },
  ],
  // F-011: `inc` does not assert, and a null key arrives as `undefined`.
  ...(
    [
      ["a string", { v: "hello world" }],
      ["a missing key", {}],
      ["null", { v: null }],
      ["an array", { v: ["a", "b"] }],
    ] as const
  ).map(([label, data]): [string, ParityCase] => [
    `F-011 inc on ${label}`,
    { expr: "[{{inc data.v}}]", data, text: "[NaN]" },
  ]),
  // F-004: `split` asserts both arguments are strings. Called with one argument
  // the options hash lands in the delimiter.
  [
    "F-004 split a missing path",
    {
      expr: '{{#each (split data.v ",")}}[{{this}}]{{/each}}',
      data: {},
      error: "undefined:undefined is not a string",
    },
  ],
  [
    "F-004 split a number",
    {
      expr: '{{#each (split data.v ",")}}[{{this}}]{{/each}}',
      data: { v: 42 },
      error: "42:number is not a string",
    },
  ],
  [
    "F-004 split an array",
    {
      expr: '{{#each (split data.v ",")}}[{{this}}]{{/each}}',
      data: { v: ["a", "b"] },
      error: "a,b:object is not a string",
    },
  ],
  [
    "F-004 split with no delimiter",
    {
      expr: "{{#each (split data.v)}}[{{this}}]{{/each}}",
      data: { v: "ab" },
      error: "[object Object]:object is not a string",
    },
  ],
  [
    "F-004 split a string",
    { expr: '{{#each (split data.v ",")}}[{{this}}]{{/each}}', data: { v: "a,b" }, text: "[a][b]" },
  ],
  // F-005: both throw at send where the preview used to swallow the error.
  ...(
    [
      ["missing", {}, "#json-parse expects a string argument to parse"],
      ["a number", { v: 42 }, "#json-parse expects a string argument to parse"],
      ["an object", { v: { a: 1 } }, "#json-parse expects a string argument to parse"],
      ["not JSON", { v: "hello world" }, "#json-parse failed:"],
    ] as const
  ).map(([label, data, error]): [string, ParityCase] => [
    `F-005 json-parse on ${label}`,
    { expr: "[{{#with (json-parse data.v)}}{{a}}{{/with}}]", data, error },
  ]),
  [
    "F-005 json-parse on JSON",
    { expr: "[{{#with (json-parse data.v)}}{{a}}{{/with}}]", data: { v: '{"a":1}' }, text: "[1]" },
  ],
  [
    "F-005 parse-string on missing",
    { expr: "[{{parse-string data.v}}]", data: {}, error: "replace" },
  ],
  [
    "F-005 parse-string on a number",
    { expr: "[{{parse-string data.v}}]", data: { v: 42 }, error: "replace" },
  ],
  [
    "F-005 parse-string on a trailing backslash",
    { expr: "[{{parse-string data.v}}]", data: { v: "bad\\" }, error: "Unterminated string" },
  ],
  [
    "F-005 parse-string unescapes",
    { expr: "[{{parse-string data.v}}]", data: { v: "a\\nb" }, text: "[a\nb]" },
  ],
  [
    "F-006 var on a string path",
    { expr: '[{{var "data.v"}}]', data: { v: "hello world" }, text: "[hello world]" },
  ],
  ["F-006 var on a number", { expr: '[{{var "data.v"}}]', data: { v: 42 }, text: "[42]" }],
  [
    "F-006 var on an object",
    { expr: '[{{var "data.v"}}]', data: { v: { a: 1 } }, text: "[[object Object]]" },
  ],
  [
    "F-006 var on a missing path keeps the braces",
    { expr: '[{{var "data.v"}}]', data: {}, text: "[{data.v}]" },
  ],
  [
    "F-006 var given a value reads it as a path",
    { expr: "[{{var data.v}}]", data: { v: "hello world" }, text: "[[Error]]" },
  ],
  [
    "F-006 var given a missing value",
    { expr: "[{{var data.v}}]", data: {}, error: "#var path argument must be a string" },
  ],
  [
    "F-006 inline-var on a string path",
    { expr: '[{{inline-var "data.v"}}]', data: { v: "hello world" }, text: "[hello world]" },
  ],
  [
    "F-006 inline-var on a number",
    { expr: '[{{inline-var "data.v"}}]', data: { v: 42 }, text: "[42]" },
  ],
  [
    "F-006 inline-var on an object",
    { expr: '[{{inline-var "data.v"}}]', data: { v: { a: 1 } }, text: "[[object Object]]" },
  ],
  [
    "F-006 inline-var on a missing path keeps the braces",
    { expr: '[{{inline-var "data.v"}}]', data: {}, text: "[{data.v}]" },
  ],
  [
    "F-006 inline-var given a value reads it as a path",
    { expr: "[{{inline-var data.v}}]", data: { v: "hello world" }, text: "[[Error]]" },
  ],
  [
    "F-006 inline-var given a missing value",
    {
      expr: "[{{inline-var data.v}}]",
      data: {},
      error: "#inline-var path argument must be a string",
    },
  ],
  [
    "F-006 var joins an array",
    { expr: '[{{var "data.v"}}]', data: { v: ["a", "b"] }, text: "[a, b]" },
  ],
  [
    "F-006 var indexes an array",
    { expr: '[{{var "data.v[1]"}}]', data: { v: ["a", "b"] }, text: "[b]" },
  ],
  ["F-006 var rooted at $", { expr: '[{{var "$.data.v"}}]', data: { v: "x" }, text: "[x]" }],
  ["F-006 var reads data keys lazily", { expr: '[{{var "v"}}]', data: { v: "x" }, text: "[x]" }],
  [
    "F-006 var on a numeric member",
    { expr: '[{{var "data.42"}}]', data: { "42": "x" }, text: "[x]" },
  ],
  [
    "F-006 var rejects a dash",
    { expr: '[{{var "data.first-name"}}]', data: { "first-name": "x" }, text: "[[Error]]" },
  ],
  [
    "F-006 var follows each",
    {
      expr: '{{#each data.items}}[{{var "name"}}]{{/each}}',
      data: { items: [{ name: "a" }, { name: "b" }] },
      text: "[a][b]",
    },
  ],
  [
    "F-006 path on str",
    { expr: '[{{path "data.v"}}]', data: { v: "hello world" }, text: "[hello world]" },
  ],
  ["F-006 path on int", { expr: '[{{path "data.v"}}]', data: { v: 42 }, text: "[42]" }],
  [
    "F-006 path on dict",
    { expr: '[{{path "data.v"}}]', data: { v: { a: 1 } }, text: "[[object Object]]" },
  ],
  [
    "F-006 path given a missing value",
    { expr: "[{{path data.v}}]", data: {}, error: "#path's path argument must be a string" },
  ],
  [
    "F-006 path returns the object",
    { expr: '{{#with (path "data.v")}}[{{a}}]{{/with}}', data: { v: { a: 1 } }, text: "[1]" },
  ],
  [
    "F-006 get-list-items on an array",
    {
      expr: '{{#each (get-list-items "data.v")}}[{{this}}]{{/each}}',
      data: { v: ["a", "b"] },
      text: "[a][b]",
    },
  ],
  [
    "F-006 get-list-items wraps an object",
    {
      expr: '{{#each (get-list-items "data.v")}}[{{this}}]{{/each}}',
      data: { v: { a: 1 } },
      text: "[[object Object]]",
    },
  ],
  [
    "F-006 get-list-items on a string",
    {
      expr: '[{{#each (get-list-items "data.v")}}[{{this}}]{{/each}}]',
      data: { v: "s" },
      text: "[]",
    },
  ],
  [
    "F-006 get-list-items on a missing path",
    { expr: '[{{#each (get-list-items "data.v")}}[{{this}}]{{/each}}]', data: {}, text: "[]" },
  ],
  // F-007: `set` takes (name, value) by position and guards reserved names.
  [
    "F-007 set by position",
    { expr: '{{set "greet" data.v}}[{{greet}}]', data: { v: "hi" }, text: "[hi]" },
  ],
  [
    "F-007 set a reserved name",
    {
      expr: '{{set "data" data.v}}[{{data.v}}]',
      data: { v: "hi" },
      error: '#set cannot use reserved word ["data"]',
    },
  ],
  [
    "F-007 set by hash",
    {
      expr: "{{set greet=data.v}}[{{greet}}]",
      data: { v: "hi" },
      error: "#set name must be a string",
    },
  ],
  [
    "F-007 set to undefined unsets",
    { expr: '{{set "greet" "a"}}{{set "greet" data.missing}}[{{greet}}]', data: {}, text: "[]" },
  ],
  // F-008: `courier-block` requires a block id.
  [
    "F-008 courier-block with an empty id",
    {
      expr: '[{{#courier-block ""}}blk{{/courier-block}}]',
      data: {},
      error: "#courier-block: missing block id",
    },
  ],
  [
    "F-008 courier-block with an id",
    { expr: '[{{#courier-block "b1"}}blk{{/courier-block}}]', data: {}, text: "[blk]" },
  ],
  // F-009: `format` is sprintf, not locale formatting.
  [
    "F-009 format %%s! on s",
    {
      expr: '[{{format "%s!" data.s}}]',
      data: { s: "hello world", n: 42, arr: ["a", "b"], o: { a: 1 }, f: 3.14159 },
      text: "[hello world!]",
    },
  ],
  [
    "F-009 format %%s! on n",
    {
      expr: '[{{format "%s!" data.n}}]',
      data: { s: "hello world", n: 42, arr: ["a", "b"], o: { a: 1 }, f: 3.14159 },
      text: "[42!]",
    },
  ],
  [
    "F-009 format %%s! on missing",
    {
      expr: '[{{format "%s!" data.missing}}]',
      data: { s: "hello world", n: 42, arr: ["a", "b"], o: { a: 1 }, f: 3.14159 },
      text: "[undefined!]",
    },
  ],
  [
    "F-009 format %%s! on arr",
    {
      expr: '[{{format "%s!" data.arr}}]',
      data: { s: "hello world", n: 42, arr: ["a", "b"], o: { a: 1 }, f: 3.14159 },
      text: "[a!]",
    },
  ],
  [
    "F-009 format %%s! on o",
    {
      expr: '[{{format "%s!" data.o}}]',
      data: { s: "hello world", n: 42, arr: ["a", "b"], o: { a: 1 }, f: 3.14159 },
      text: "[[object Object]!]",
    },
  ],
  [
    "F-009 format %%05.1f on f",
    {
      expr: '[{{format "%05.1f" data.f}}]',
      data: { s: "hello world", n: 42, arr: ["a", "b"], o: { a: 1 }, f: 3.14159 },
      text: "[003.1]",
    },
  ],
  [
    "F-009 format %%s-%%s on arr",
    {
      expr: '[{{format "%s-%s" data.arr}}]',
      data: { s: "hello world", n: 42, arr: ["a", "b"], o: { a: 1 }, f: 3.14159 },
      text: "[a-b]",
    },
  ],
  // F-010: helpers the send renders that the preview used to lack. Measured
  // with one shared data set.
  [
    "F-010 datetime-format ISO",
    { expr: '[{{datetime-format data.iso "%Y-%m-%d"}}]', data: F010_DATA, text: "[2026-09-23]" },
  ],
  [
    "F-010 datetime-format epoch ms",
    { expr: '[{{datetime-format data.n "%Y-%m-%d"}}]', data: F010_DATA, text: "[1970-01-01]" },
  ],
  [
    "F-010 swu_datetimeformat",
    { expr: '[{{swu_datetimeformat data.iso "%Y"}}]', data: F010_DATA, text: "[2026]" },
  ],
  [
    "F-010 swu_iso8601_to_time",
    { expr: "[{{swu_iso8601_to_time data.iso}}]", data: F010_DATA, text: "[1790157600000]" },
  ],
  [
    "F-010 swu_timestamp_to_time",
    { expr: "[{{swu_timestamp_to_time data.n}}]", data: F010_DATA, text: "[42000]" },
  ],
  [
    "F-010 trim-one-char-right",
    { expr: "[{{trim-one-char-right data.s}}]", data: F010_DATA, text: "[hello worl]" },
  ],
  [
    "F-010 trim-one-char-right on empty",
    { expr: "[{{trim-one-char-right data.e}}]", data: F010_DATA, text: "[]" },
  ],
  [
    "F-010 range with two arguments",
    { expr: "{{#each (range 0 3)}}{{this}}{{/each}}", data: F010_DATA, text: "012" },
  ],
  [
    "F-010 range with one argument",
    { expr: "{{#each (range 3)}}{{this}}{{/each}}", data: F010_DATA, text: "012" },
  ],
  [
    "F-010 datetime-format formats in UTC, not the browser zone",
    { expr: '[{{datetime-format data.iso "%H:%M"}}]', data: F010_DATA, text: "[10:00]" },
  ],
  [
    "F-010 swu_datetimeformat with %z and a zone",
    {
      expr: '[{{swu_datetimeformat data.iso "%H:%M %z" "America/Sao_Paulo"}}]',
      data: F010_DATA,
      error: "unescaped latin alphabet character",
    },
  ],
  [
    "F-010 swu_datetimeformat long pattern",
    {
      expr: '[{{swu_datetimeformat data.ms "%A %d %B %Y %I:%M %p"}}]',
      data: F010_DATA,
      text: "[Wednesday 23 September 2026 10:00 AM]",
    },
  ],
  [
    "F-010 swu_timestamp_to_time rejects a float",
    {
      expr: "[{{swu_timestamp_to_time data.f}}]",
      data: F010_DATA,
      error: "swu_timestamp_to_time expects a valid UNIX epoch timestamp",
    },
  ],
  [
    "F-010 swu_iso8601_to_time rejects a non-date",
    {
      expr: "[{{swu_iso8601_to_time data.s}}]",
      data: F010_DATA,
      error: "swu_iso8601_to_time expects ISO-8601 formatted string",
    },
  ],
  [
    "F-010 swu_datetimeformat rejects a non-date",
    {
      expr: '[{{swu_datetimeformat data.s "%Y"}}]',
      data: F010_DATA,
      error: "swu_datetimeformat expects string values to be ISO-8601 formatted",
    },
  ],
  [
    "F-010 datetime-format keeps the ISO string wall time",
    { expr: '[{{datetime-format data.isooff "%H:%M"}}]', data: F010_DATA, text: "[10:00]" },
  ],
  // F-012: the options hash leaking into missing arguments, block trims,
  // line-break, filter and get-link-tracking.
  [
    "F-012 condition with a missing operand",
    { expr: '{{#if (condition data.v "==")}}Y{{else}}N{{/if}}', data: F012_DATA, text: "Y" },
  ],
  [
    "F-012 default with one argument",
    { expr: "[{{default data.v}}]", data: F012_DATA, text: "[]" },
  ],
  [
    "F-012 trim as a block",
    { expr: "[{{#trim}}  blk  {{/trim}}]", data: F012_DATA, text: "[blk]" },
  ],
  [
    "F-012 trim-left as a block",
    { expr: "[{{#trim-left}}  blk  {{/trim-left}}]", data: F012_DATA, text: "[blk  ]" },
  ],
  ["F-012 line-break is a line break", { expr: "a{{line-break}}b", data: F012_DATA, text: "a\nb" }],
  [
    "F-012 filter on profile is approximate",
    {
      expr: '{{#if (filter "profile" "email" "CONTAINS" "@")}}Y{{else}}N{{/if}}',
      data: F012_DATA,
      approximated: ["filter"],
    },
  ],
  [
    "F-012 filter CONTAINS on an array",
    {
      expr: '{{#if (filter "data" "data.tags" "CONTAINS" "vip")}}Y{{else}}N{{/if}}',
      data: F012_DATA,
      text: "Y",
    },
  ],
  [
    "F-012 filter CONTAINS on a number",
    {
      expr: '{{#if (filter "data" "data.n" "CONTAINS" "x")}}Y{{else}}N{{/if}}',
      data: F012_DATA,
      error: "Left operand must be an Array or String",
    },
  ],
  [
    "F-012 filter IS_EMPTY on an empty object",
    {
      expr: '{{#if (filter "data" "data.o" "IS_EMPTY")}}Y{{else}}N{{/if}}',
      data: F012_DATA,
      text: "Y",
    },
  ],
  [
    "F-012 filter CONTAINS on a missing path",
    {
      expr: '{{#if (filter "data" "data.missing" "CONTAINS" "x")}}Y{{else}}N{{/if}}',
      data: F012_DATA,
      error: "CONTAINS Eval Error: Left operand cannot be undefined or null.",
    },
  ],
  [
    "F-012 get-link-tracking returns an href",
    {
      expr: "[{{#with (get-link-tracking data.u)}}{{href}}{{/with}}]",
      data: F012_DATA,
      text: "[https://example.com]",
    },
  ],
  [
    "F-012 get-link-tracking on a missing path",
    {
      expr: "[{{#with (get-link-tracking data.missing)}}{{href}}{{/with}}]",
      data: F012_DATA,
      text: "[]",
    },
  ],
];

describe("preview matches the send", () => {
  beforeEach(() => resetPreviewEnv());

  it.each(cases)("%s", (_label, c) => {
    const result = renderHandlebarsPreview(c.expr, { data: c.data });
    if (c.approximated) expect(result.approximated).toEqual(c.approximated);
    if (c.error !== undefined) {
      expect(result.ok, `rendered ${JSON.stringify(result.text)}`).toBe(false);
      expect(result.error).toContain(c.error);
    } else {
      expect(result.error).toBeUndefined();
      if (c.text !== undefined) expect(result.text).toBe(c.text);
    }
  });
});
