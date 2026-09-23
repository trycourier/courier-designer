import type Handlebars from "handlebars";

/**
 * Preview stand-ins for handlebars-intl, which the renderer registers globally
 * (backend `handlebars/handlebars.ts`). Mirrors its `src/helpers.js`: the same
 * assertions and messages, `{{#intl}}` data frames and `intlGet` lookups.
 *
 * The send runs in Node with no locale or time zone set, so the defaults here
 * are `en-US` and UTC rather than the author's browser.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const DEFAULT_LOCALE = "en-US";

interface IntlData {
  locales?: string | string[];
  formats?: Record<string, any>;
}

const intlData = (options: any): IntlData => options?.data?.intl ?? {};
const localesOf = (options: any) => intlData(options).locales ?? DEFAULT_LOCALE;

function intlGet(path: string, options: any): unknown {
  let obj: any = options?.data?.intl;
  for (const part of String(path).split(".")) {
    obj = obj == null ? undefined : obj[part];
    if (obj === undefined) break;
  }
  if (obj === undefined) throw new ReferenceError(`Could not find Intl object: ${path}`);
  return obj;
}

function formatOptions(type: string, format: unknown, options: any): Record<string, any> {
  const hash = { ...(options?.hash ?? {}) };
  if (!format) return hash;
  const named =
    typeof format === "string" ? (intlGet(`formats.${type}.${format}`, options) as object) : {};
  return { ...named, ...hash };
}

/** `(value, [format], options)`: the format name is optional. */
function splitArgs(args: any[]): [any, unknown, any] {
  const options = args[args.length - 1];
  return [args[0], args.length > 2 ? args[1] : null, options];
}

function toDate(value: unknown, message: string): Date {
  const date = new Date(value as any);
  if (!Number.isFinite(date.getTime())) throw new TypeError(message);
  return date;
}

const dateTimeFormat = (options: any, opts: Record<string, any>) =>
  new Intl.DateTimeFormat(localesOf(options), { timeZone: "UTC", ...opts });

// intl-relativeformat's "best fit": the largest unit whose rounded value stays
// under its threshold.
const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number, number][] = [
  ["second", 1000, 45],
  ["minute", 60_000, 45],
  ["hour", 3_600_000, 22],
  ["day", 86_400_000, 26],
  ["month", 2_629_746_000, 11],
  ["year", 31_556_952_000, Infinity],
];

function formatRelative(date: Date, now: number, locales: string | string[], opts: any): string {
  const diff = date.getTime() - now;
  const fixed = opts?.units as Intl.RelativeTimeFormatUnit | undefined;
  const [unit, size] =
    RELATIVE_UNITS.find(([u, ms, max]) =>
      fixed ? u === fixed : Math.abs(Math.round(diff / ms)) < max
    ) ?? RELATIVE_UNITS[RELATIVE_UNITS.length - 1];
  const numeric = opts?.style === "numeric" ? "always" : "auto";
  return new Intl.RelativeTimeFormat(locales, { numeric }).format(Math.round(diff / size), unit);
}

/**
 * The ICU MessageFormat subset authors use: `{arg}`, `{arg, number}`,
 * `{arg, date|time}`, `{arg, plural|selectordinal, ...}` with `#` and `=N`, and
 * `{arg, select, ...}`.
 */
function formatIcu(
  message: string,
  values: Record<string, any>,
  locales: string | string[]
): string {
  let out = "";
  let i = 0;
  while (i < message.length) {
    const ch = message[i];
    if (ch !== "{") {
      out += ch;
      i++;
      continue;
    }
    const end = matchingBrace(message, i);
    out += formatArgument(message.slice(i + 1, end), values, locales);
    i = end + 1;
  }
  return out;
}

function matchingBrace(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return i;
  }
  throw new SyntaxError(`Unbalanced braces in message: ${text}`);
}

function formatArgument(
  body: string,
  values: Record<string, any>,
  locales: string | string[]
): string {
  const [name, type, ...rest] = splitTopLevel(body);
  const key = name.trim();
  if (!(key in values)) throw new Error(`A value must be provided for: ${key}`);
  const value = values[key];
  switch (type?.trim()) {
    case undefined:
      return String(value);
    case "number":
      return new Intl.NumberFormat(locales).format(value);
    case "date":
    case "time":
      return new Intl.DateTimeFormat(locales, { timeZone: "UTC" }).format(new Date(value));
    case "select":
      return formatIcu(pickOption(rest.join(","), String(value)), values, locales);
    case "plural":
    case "selectordinal": {
      let spec = rest.join(",").trim();
      let offset = 0;
      const off = /^offset:\s*(\d+)/.exec(spec);
      if (off) {
        offset = Number(off[1]);
        spec = spec.slice(off[0].length);
      }
      const n = Number(value) - offset;
      const rules = new Intl.PluralRules(locales, {
        type: type.trim() === "plural" ? "cardinal" : "ordinal",
      });
      const options = parseOptions(spec);
      const chosen =
        options[`=${Number(value)}`] ?? options[rules.select(n)] ?? options.other ?? "";
      const hash = new Intl.NumberFormat(locales).format(n);
      return formatIcu(chosen.replace(/#/g, hash), values, locales);
    }
    default:
      return String(value);
  }
}

function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of body) {
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (ch === "," && depth === 0 && parts.length < 2) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}

function parseOptions(spec: string): Record<string, string> {
  const options: Record<string, string> = {};
  let i = 0;
  while (i < spec.length) {
    const open = spec.indexOf("{", i);
    if (open < 0) break;
    const key = spec.slice(i, open).trim();
    const close = matchingBrace(spec, open);
    options[key] = spec.slice(open + 1, close);
    i = close + 1;
  }
  return options;
}

function pickOption(spec: string, value: string): string {
  const options = parseOptions(spec);
  return options[value] ?? options.other ?? "";
}

export function registerIntlHelpers(hb: typeof Handlebars): void {
  const h = (name: string, fn: (...args: any[]) => unknown) => hb.registerHelper(name, fn as any);

  h("intl", function (this: any, options: any) {
    if (!options?.fn) throw new Error("{{#intl}} must be invoked as a block helper");
    const data = hb.createFrame(options.data);
    data.intl = { ...(data.intl ?? {}), ...options.hash };
    return options.fn(this, { data });
  });

  h("intlGet", (path: string, options: any) => intlGet(path, options));

  const formatDate = (...args: any[]) => {
    const [value, format, options] = splitArgs(args);
    const date = toDate(value, "A date or timestamp must be provided to {{formatDate}}");
    return dateTimeFormat(options, formatOptions("date", format, options)).format(date);
  };
  const formatTime = (...args: any[]) => {
    const [value, format, options] = splitArgs(args);
    const date = toDate(value, "A date or timestamp must be provided to {{formatTime}}");
    return dateTimeFormat(options, formatOptions("time", format, options)).format(date);
  };
  const formatNumber = (...args: any[]) => {
    const [value, format, options] = splitArgs(args);
    if (typeof value !== "number")
      throw new TypeError("A number must be provided to {{formatNumber}}");
    return new Intl.NumberFormat(
      localesOf(options),
      formatOptions("number", format, options)
    ).format(value);
  };
  const formatMessage = (...args: any[]) => {
    const options = args[args.length - 1];
    let message = args.length > 1 ? args[0] : null;
    const hash = options?.hash ?? {};
    if (!(message || typeof message === "string" || hash.intlName)) {
      throw new ReferenceError("{{formatMessage}} must be provided a message or intlName");
    }
    if (!message && hash.intlName) message = intlGet(hash.intlName, options);
    if (typeof message === "function") return message(hash);
    return formatIcu(String(message), hash, localesOf(options));
  };
  const formatHTMLMessage = function (this: any, ...args: any[]) {
    const options = args[args.length - 1];
    const hash = { ...(options?.hash ?? {}) };
    for (const [key, value] of Object.entries(hash)) {
      if (typeof value === "string") hash[key] = hb.Utils.escapeExpression(value);
    }
    const escapedArgs = [...args.slice(0, -1), { ...options, hash }];
    return new hb.SafeString(String(formatMessage.apply(this, escapedArgs)));
  };

  h("formatDate", formatDate);
  h("formatTime", formatTime);
  h("formatNumber", formatNumber);
  h("formatMessage", formatMessage);
  h("formatHTMLMessage", formatHTMLMessage);
  h("formatRelative", (...args: any[]) => {
    const [value, format, options] = splitArgs(args);
    const date = toDate(value, "A date or timestamp must be provided to {{formatRelative}}");
    const opts = formatOptions("relative", format, options);
    const now = opts.now === undefined ? Date.now() : new Date(opts.now).getTime();
    return formatRelative(date, now, localesOf(options), opts);
  });

  // Deprecated names the renderer still registers.
  h("intlDate", formatDate);
  h("intlTime", formatTime);
  h("intlNumber", formatNumber);
  h("intlMessage", formatMessage);
  h("intlHTMLMessage", formatHTMLMessage);
}

/* eslint-enable @typescript-eslint/no-explicit-any */
