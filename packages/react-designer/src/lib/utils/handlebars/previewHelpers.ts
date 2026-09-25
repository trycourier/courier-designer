import type Handlebars from "handlebars";
import { sprintf } from "sprintf-js";
import { registerIntlHelpers } from "./intlHelpers";
import { swuDateTimeFormat, swuIso8601ToTime, swuTimestampToTime } from "./sendwithus/dateHelpers";

/**
 * Editor-side stand-ins for the helpers the renderer registers, so a preview can
 * take the same branch the send would.
 *
 * These mirror `handlebars/helpers/universal/*` in trycourier/backend. They are
 * a convenience for previewing, not a second implementation of the renderer:
 * helpers that depend on send-time context (link tracking, partials, prerender,
 * locale catalogues) cannot be reproduced here and are registered as
 * pass-throughs rather than guessed at. `renderHandlebarsPreview` reports when
 * one of those is involved so the UI can say the preview is approximate.
 */

/** Helpers whose real behaviour needs send-time context the editor does not have. */
export const APPROXIMATED_HELPERS = new Set([
  "courier-block",
  "courier-partial",
  "get-link-tracking",
  "get-href",
  "link-context",
  "prerender",
  "translate",
  "t",
  "params",
  "partial-block-indent-fix",
  // Resolves its source through the send-time variable handler.
  "filter",
  // Relative to the moment of sending, which the preview cannot know.
  "formatRelative",
]);

/**
 * Mirrors the backend's `assertIsNumber`, which only checks `isNaN(value)` — and
 * `isNaN("42")` is false. A numeric *string* therefore passes the assertion
 * unconverted, so `add` ends up doing `"42" + 8` and concatenating. The other
 * math helpers use `-`/`*`/`/`/`%`, which coerce numerically, so only `add` is
 * affected. This is faithful, not a bug in the shim.
 */
const assertNum = <T>(value: T): T => {
  if (Number.isNaN(Number(value))) throw new Error(`${String(value)} is NaN`);
  return value;
};

/** Mirrors `string/split.ts`'s `assertString`, message included. */
function assertString(input: unknown): asserts input is string {
  if (typeof input !== "string") {
    throw new TypeError(`${String(input)}:${typeof input} is not a string`);
  }
}

const num = (value: unknown): number => {
  const n = Number(assertNum(value));
  return n;
};

function range(start: number, end: number, step: number): number[] {
  if (start === end || end === 0) return [];
  // The backend recurses on `range(start + step, …)` with no guard, so a step
  // of 0 dies with "Maximum call stack size exceeded" and the send fails.
  // Rendering an empty list here told the author the template was fine.
  if (step === 0) throw new Error("range step must not be 0: the send never terminates");
  if (step > 0 && start >= end) return [];
  if (step < 0 && start <= end) return [];
  const out: number[] = [];
  for (let i = start; step > 0 ? i < end : i > end; i += step) out.push(i);
  return out;
}

const RTL_CHARS = "\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC";
const LTR_CHARS =
  "A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF\u200E\u2C00-\uFB1C\uFE00-\uFE6F\uFEFD-\uFFFF";
// Ranges copied verbatim from `direction`, combining marks included.
// eslint-disable-next-line no-misleading-character-class
const RTL_FIRST = new RegExp(`^[^${LTR_CHARS}]*[${RTL_CHARS}]`);

/* eslint-disable @typescript-eslint/no-explicit-any */

const SET_RESERVED_NAMES = [
  "",
  "__proto__",
  "brand",
  "data",
  "event",
  "profile",
  "recipient",
  "urls",
];

class PathSyntaxError extends Error {}

interface ResolvedPath {
  found: boolean;
  value?: unknown;
}

const PATH_SEGMENT = /\.([A-Za-z0-9_$]+)|\[(\d+)\]|\["([^"]*)"\]|\['([^']*)'\]/y;

/**
 * The subset of JSONPath the send's variable handler is used with: `a.b`,
 * `a[0]`, `a["k"]`, optionally rooted at `$` or scoped at `@`. Anything else
 * (`-` in a name, a space, wildcards) is a syntax error there too, which `var`
 * renders as `[Error]`.
 */
function parseVariablePath(path: string): { anchor: "$" | "@" | "lazy"; keys: string[] } {
  let anchor: "$" | "@" | "lazy" = "lazy";
  let rest = path;
  if (/^[$@](?=$|[.[])/.test(path)) {
    anchor = path[0] as "$" | "@";
    rest = path.slice(1);
  } else if (!/^[.[]/.test(path)) {
    rest = `.${path}`;
  }
  const keys: string[] = [];
  PATH_SEGMENT.lastIndex = 0;
  while (PATH_SEGMENT.lastIndex < rest.length) {
    const match = PATH_SEGMENT.exec(rest);
    if (!match) throw new PathSyntaxError(path);
    keys.push(match[1] ?? match[2] ?? match[3] ?? match[4]);
  }
  return { anchor, keys };
}

function walk(root: any, keys: string[]): ResolvedPath {
  let value = root;
  for (const key of keys) {
    if (value === null || typeof value !== "object" || !(key in value)) return { found: false };
    value = value[key];
  }
  return { found: value !== undefined, value };
}

/** `resolveV2`: the value, or `undefined` for a missing or unparseable path. */
function resolveV2(path: unknown, scope: any, root: any): unknown {
  if (typeof path !== "string") return undefined;
  try {
    return resolveVariablePath(path, scope, root).value;
  } catch (err) {
    if (err instanceof PathSyntaxError) return undefined;
    throw err;
  }
}

/**
 * A lazy path (no `$`/`@`) tries the current `each`/`with` scope and then the
 * root, where the send also exposes `data`'s own keys: `{{var "v"}}` reads
 * `data.v`.
 */
function resolveVariablePath(path: string, scope: any, root: any): ResolvedPath {
  if (path === "") return { found: false };
  const { anchor, keys } = parseVariablePath(path);
  const rootScope = { ...(root?.data ?? {}), ...(root ?? {}) };
  if (anchor === "$") return walk(rootScope, keys);
  if (anchor === "@") return walk(scope, keys);
  const local = scope !== root ? walk(scope, keys) : { found: false };
  return local.found ? local : walk(rootScope, keys);
}

/**
 * Mirrors `condition.ts`, including that `==` is strict there — the backend
 * falls `case "=="` through to `case "==="`.
 */
function compare(a: any, operator: string, b: any): boolean {
  switch (operator) {
    case "==":
    case "===":
      return a === b;
    case "!=":
    case "!==":
      return a !== b;
    case "<":
      return a < b;
    case "<=":
      return a <= b;
    case ">":
      return a > b;
    case ">=":
      return a >= b;
    default:
      throw new Error(`#condition encountered unexpected conditional [${operator}]`);
  }
}

/** Mirrors `lib/conditional-filter.ts` — a different vocabulary from `condition`. */
function filterOperation(a: any, operator: string, b?: any): boolean {
  switch (operator) {
    case "EQUALS":
      return String(a) === b;
    case "CONTAINS":
      validateTwoOperands(a, b, operator);
      return filterContains(a, operator, b);
    case "NOT_CONTAINS":
      validateTwoOperands(a, b, operator);
      return !filterContains(a, operator, b);
    case "NOT_EQUALS":
      return String(a) !== b;
    case "GREATER_THAN":
      return Number(a) > Number(b);
    case "LESS_THAN":
      return Number(a) < Number(b);
    case "GREATER_THAN_EQUALS":
      return Number(a) >= Number(b);
    case "LESS_THAN_EQUALS":
      return Number(a) <= Number(b);
    case "IS_EMPTY":
      return isFilterEmpty(a);
    case "NOT_EMPTY":
      return !isFilterEmpty(a);
    default:
      throw new Error(`Invalid Operator: ${operator}`);
  }
}

function isFilterEmpty(a: any): boolean {
  if (a === undefined || a === null) return true;
  if (typeof a === "object") return Array.isArray(a) ? a.length === 0 : Object.keys(a).length === 0;
  return a === "";
}

function filterContains(a: any, operator: string, b: any): boolean {
  if (Array.isArray(a)) return a.includes(b);
  if (typeof a === "string") {
    if (typeof b === "string") return a.includes(b);
    throw new Error(
      `${operator} Eval Error: Left operand is String, right operand must be String. Type found ${typeof b}`
    );
  }
  throw new Error(
    `${operator} Eval Error: Left operand must be an Array or String. Type found ${typeof a}`
  );
}

function validateTwoOperands(a: any, b: any, operator: string): void {
  if (a == undefined) {
    throw new Error(`${operator} Eval Error: Left operand cannot be undefined or null.`);
  }
  if (b == undefined) {
    throw new Error(`${operator} Eval Error: Right operand cannot be undefined or null.`);
  }
}

export function registerPreviewHelpers(hb: typeof Handlebars): void {
  const h = (name: string, fn: (...args: any[]) => unknown) => hb.registerHelper(name, fn as any);

  registerIntlHelpers(hb);

  // The renderer's `assertHandlebarsArguments` pops the options hash before
  // destructuring, so a missing argument is `undefined`, never the hash.
  const params = (args: any[]) => args.slice(0, -1);

  h("condition", (...args: any[]) => {
    const [a, operator, b] = params(args);
    return compare(a, operator, b);
  });

  h("and", function (...args: any[]) {
    args.pop();
    return args.every(Boolean);
  });

  h("or", function (...args: any[]) {
    args.pop();
    return args.some(Boolean);
  });

  h("not", (value: any) => !value);

  h("contains", function (this: any, str: string, substring: string, options: any) {
    if (!str || typeof str !== "string") return options.inverse(this);
    return str.includes(substring) ? options.fn(this) : options.inverse(this);
  });

  h("default", (...args: any[]) => {
    const [value, fallback] = params(args);
    return value !== undefined && value !== null ? value : fallback;
  });

  h("capitalize", (str: string) =>
    !str || str.trim().length === 0 ? str : str.charAt(0).toUpperCase() + str.slice(1)
  );

  h("concat", function (...args: any[]) {
    const options = args.pop();
    const { safe = false, separator = "" } = options?.hash ?? {};
    const text = `${args.join(separator)}`;
    return safe ? new hb.SafeString(text) : text;
  });

  // No assertion at send: a non-number renders `NaN` rather than failing.
  h("inc", (value: any) => Number(value) + 1);

  h("truncate", (str: string, limit: number, suffix?: string) => {
    if (!str || typeof str !== "string") return str;
    const postfix = typeof suffix === "string" ? suffix : "";
    return str.length > limit ? `${str.substring(0, limit)}${postfix}` : str;
  });

  h("replace-all", function (this: any, search: string, value: string, options: any) {
    const str = options.fn(this);
    return String(str).replace(new RegExp(search, "g"), value);
  });

  // All three also work as blocks, trimming their rendered content.
  const trimHelper = (trim: (value: string) => string) =>
    function (this: any, ...args: any[]) {
      const options = args[args.length - 1];
      const [str = ""] = params(args);
      return trim(String(options?.fn ? options.fn(this) : str));
    };
  h(
    "trim",
    trimHelper((value) => value.trim())
  );
  h(
    "trim-left",
    trimHelper((value) => value.trimStart())
  );
  h(
    "trim-right",
    trimHelper((value) => value.trimEnd())
  );

  // A one-argument call puts the options hash in `delimiter`, which then fails
  // the assertion, exactly as at send.
  h("split", (value: unknown, delimiter: unknown = "") => {
    assertString(value);
    assertString(delimiter);
    return value.split(delimiter);
  });

  // Mirrors `array/range.ts`: 1 argument is the stop, 2 are start and stop.
  h("range", (...args: any[]) => {
    const params = args.slice(0, -1);
    if (!params.length) throw new Error("range expects at least one input");
    const [start, stop, step] =
      params.length === 1 ? [0, params[0], 1] : [params[0], params[1], params[2] ?? 1];
    return range(assertNum(start), assertNum(stop), assertNum(step));
  });

  h("datetime-format", swuDateTimeFormat);
  h("swu_datetimeformat", swuDateTimeFormat);
  h("swu_iso8601_to_time", swuIso8601ToTime);
  h("swu_timestamp_to_time", swuTimestampToTime);
  h("trim-one-char-right", (text: any) => text.substr(0, text.length - 1));

  h("abs", (v: any) => Math.abs(num(v)));
  // Deliberately un-coerced — see `assertNum`.
  h("add", (a: any, b: any) => (assertNum(a) as any) + (assertNum(b) as any));
  h("ceil", (v: any) => Math.ceil(num(v)));
  h("floor", (v: any) => Math.floor(num(v)));
  h("round", (v: any) => Math.round(num(v)));
  h("multiply", (a: any, b: any) => num(a) * num(b));
  h("product", (a: any, b: any) => num(a) * num(b));
  h("subtract", (a: any, b: any) => num(a) - num(b));
  h("sub", (a: any, b: any) => num(a) - num(b));
  h("divide", (a: any, b: any) => {
    if (num(b) === 0) throw new Error("Cannot divide by zero");
    return num(a) / num(b);
  });
  h("mod", (a: any, b: any) => {
    if (num(b) === 0) throw new Error("Cannot divide by zero");
    return num(a) % num(b);
  });

  // Mirrors `format.ts`: plain sprintf, with an array spread into the arguments.
  h("format", (pattern: string, input: any) =>
    sprintf(pattern, ...(Array.isArray(input) ? input : [input]))
  );

  // Translation catalogues live server-side. Echo the key's fallback content so
  // the surrounding copy still reads sensibly in preview.
  const passthroughBlock = function (this: any, ...args: any[]) {
    const options = args[args.length - 1];
    if (options?.fn) return options.fn(this);
    return args[0] ?? "";
  };
  for (const name of ["translate", "t", "prerender", "link-context"]) {
    h(name, passthroughBlock);
  }
  // The block's link context is send-time only; the empty-id check is not.
  h("courier-block", function (this: any, ...args: any[]) {
    if (!args[0] || args.length < 2) throw new Error("#courier-block: missing block id");
    return passthroughBlock.apply(this, args);
  });

  h("get-href", (value: any) => value ?? "");
  // `trackingHref` needs the send's link handler; `href` is what templates read.
  h("get-link-tracking", (...args: any[]) => {
    const [href] = params(args);
    return { href: href ? href : "" };
  });
  // `text-direction.ts` via the `direction` package (1.0.4): the first strong
  // character decides, and only RTL produces a class.
  h("text-direction", (...args: any[]) => {
    const [value = ""] = params(args);
    return RTL_FIRST.test(String(value || "")) ? "text-rtl" : "";
  });
  // `var`, `inline-var`, `path` and `get-list-items` take a path STRING and
  // resolve it through the send's variable handler, not a value.
  const resolvePathHelper = (message: string) =>
    function (this: any, ...args: any[]) {
      const options = args.pop();
      const path = args[0];
      if (typeof path !== "string") throw new Error(message);
      return resolveVariablePath(path, this, options?.data?.root);
    };
  const replaceVar = (name: string) => {
    const resolve = resolvePathHelper(`#${name} path argument must be a string`);
    return function (this: any, ...args: any[]) {
      const path = args[0];
      let found: ResolvedPath;
      try {
        found = resolve.apply(this, args);
      } catch (err) {
        if (err instanceof PathSyntaxError) return "[Error]";
        throw err;
      }
      if (!found.found) return `{${path}}`;
      return Array.isArray(found.value) ? found.value.join(", ") : String(found.value);
    };
  };
  h("var", replaceVar("var"));
  h("inline-var", replaceVar("inline-var"));
  h("json-parse", (value: any) => {
    if (typeof value !== "string") {
      throw new Error("#json-parse expects a string argument to parse");
    }
    try {
      return JSON.parse(value);
    } catch (err) {
      throw new Error(`#json-parse failed:${err instanceof Error ? err.message : String(err)}`);
    }
  });
  // The serializer's `lineReturn`: `<br>` in the email HTML, a newline in text.
  // Elemental's own line break is `\n`, which the preview renders as one.
  h("line-break", () => "\n");
  // Both report the error as `#path's` — `get-list-items` copied it verbatim.
  const lookupPath = () => {
    const resolve = resolvePathHelper("#path's path argument must be a string");
    return function (this: any, ...args: any[]) {
      try {
        const found: ResolvedPath = resolve.apply(this, args);
        return found.found ? found.value : undefined;
      } catch (err) {
        if (err instanceof PathSyntaxError) return undefined;
        throw err;
      }
    };
  };
  h("path", lookupPath());
  const listPath = lookupPath();
  // Wraps a lone object so `each` loops once over it rather than over its keys.
  h("get-list-items", function (this: any, ...args: any[]) {
    const value = listPath.apply(this, args);
    if (!value || typeof value !== "object") return [];
    return Array.isArray(value) ? value : [value];
  });

  // `filter` is a predicate, not a list filter: `property` resolves through the
  // variable handler, under the recipient profile when `source` is "profile".
  // The preview has no profile, so that form is approximate (see
  // APPROXIMATED_HELPERS).
  h("filter", function (this: any, ...args: any[]) {
    const options = args[args.length - 1];
    const [source, property, operator, value] = params(args);
    const root = options?.data?.root;
    // Without a profile the operands' validation would fail a send that works.
    if (source === "profile" && root?.profile === undefined) return false;
    const actual =
      source === "profile"
        ? resolveV2(property, root?.profile, root?.profile)
        : resolveV2(property, this, root);
    return filterOperation(actual, operator, value);
  }); // Mirrors `set.ts`: `(name, value)` by position, never the hash, and an
  // `undefined` value removes the name.
  h("set", function (this: any, ...args: any[]) {
    const options = args.pop();
    const [name, value] = args;
    if (typeof name !== "string") throw new Error("#set name must be a string");
    if (SET_RESERVED_NAMES.includes(name)) {
      throw new Error(`#set cannot use reserved word [${JSON.stringify(name)}]`);
    }
    const root = options?.data?.root;
    for (const target of [this, root]) {
      if (!target || typeof target !== "object") continue;
      if (value === undefined) delete target[name];
      else target[name] = value;
    }
    return "";
  });
  // Unescapes escape sequences in generated templates (`"\\n"` -> newline). It
  // is NOT a numeric coercion: `{{add (parse-string "42") 8}}` concatenates.
  // Throws where the send throws: a non-string has no `replace`, and a trailing
  // backslash is an unterminated JSON string.
  h("parse-string", (value: any) => JSON.parse(`"${value.replace(/"/g, '\\"')}"`));
  // `conditional` is not an `if`. It defaults to `behavior: "hide"`, which
  // renders the block when the condition FAILS — it exists to hide content when
  // a condition passes. Treating it like `if` inverts the author's intent.
  h("conditional", function (this: any, ...args: any[]) {
    const options = args.pop();
    const { logicalOperator = "and", behavior = "hide" } = options?.hash ?? {};
    const passed = logicalOperator === "or" ? args.some(Boolean) : args.every(Boolean);
    if (behavior === "show") {
      return passed ? options.fn(this) : options.inverse(this);
    }
    return passed ? options.inverse(this) : options.fn(this);
  });
}

/* eslint-enable @typescript-eslint/no-explicit-any */
