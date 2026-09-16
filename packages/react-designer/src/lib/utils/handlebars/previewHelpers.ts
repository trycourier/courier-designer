import type Handlebars from "handlebars";

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
  "text-direction",
]);

const num = (value: unknown): number => {
  const n = Number(value);
  if (Number.isNaN(n)) throw new Error(`${String(value)} is not a number`);
  return n;
};

function range(start: number, end: number, step: number): number[] {
  if (start === end || end === 0) return [];
  if (step > 0 && start >= end) return [];
  if (step < 0 && start <= end) return [];
  const out: number[] = [];
  for (let i = start; step > 0 ? i < end : i > end; i += step) out.push(i);
  return out;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export function registerPreviewHelpers(hb: typeof Handlebars): void {
  const h = (name: string, fn: (...args: any[]) => unknown) => hb.registerHelper(name, fn as any);

  h("condition", (a: any, operator: string, b: any) => {
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

  h("default", (value: any, fallback: any) =>
    value !== undefined && value !== null ? value : fallback
  );

  h("capitalize", (str: string) =>
    !str || str.trim().length === 0 ? str : str.charAt(0).toUpperCase() + str.slice(1)
  );

  h("concat", function (...args: any[]) {
    const options = args.pop();
    const { safe = false, separator = "" } = options?.hash ?? {};
    const text = `${args.join(separator)}`;
    return safe ? new hb.SafeString(text) : text;
  });

  h("inc", (value: any) => num(value) + 1);

  h("truncate", (str: string, limit: number, suffix?: string) => {
    if (!str || typeof str !== "string") return str;
    const postfix = typeof suffix === "string" ? suffix : "";
    return str.length > limit ? `${str.substring(0, limit)}${postfix}` : str;
  });

  h("replace-all", function (this: any, search: string, value: string, options: any) {
    const str = options.fn(this);
    return String(str).replace(new RegExp(search, "g"), value);
  });

  h("trim", function (this: any, str = "", options?: any) {
    const value = options?.fn ? options.fn(this) : str;
    return String(value).trim();
  });
  h("trim-left", (str = "") => String(str).replace(/^\s+/, ""));
  h("trim-right", (str = "") => String(str).replace(/\s+$/, ""));

  h("split", (value: string, delimiter = "") => String(value).split(delimiter));

  h("range", (start: number, end: number, step = 1) => range(num(start), num(end), num(step)));

  h("abs", (v: any) => Math.abs(num(v)));
  h("add", (a: any, b: any) => num(a) + num(b));
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

  h("format", (value: any, pattern?: string) => {
    // The renderer's `format` is date/number formatting driven by send-time
    // locale; showing the raw value is closer than inventing a format here.
    void pattern;
    return value;
  });

  // Translation catalogues live server-side. Echo the key's fallback content so
  // the surrounding copy still reads sensibly in preview.
  const passthroughBlock = function (this: any, ...args: any[]) {
    const options = args[args.length - 1];
    if (options?.fn) return options.fn(this);
    return args[0] ?? "";
  };
  for (const name of ["translate", "t", "courier-block", "prerender", "link-context"]) {
    h(name, passthroughBlock);
  }

  h("get-href", (value: any) => value ?? "");
  h("get-link-tracking", (value: any) => value ?? "");
  h("text-direction", () => "ltr");
  h("var", (value: any) => value ?? "");
  h("inline-var", (value: any) => value ?? "");
  h("json-parse", (value: any) => {
    try {
      return typeof value === "string" ? JSON.parse(value) : value;
    } catch {
      return value;
    }
  });
  h("line-break", () => new hb.SafeString("<br/>"));
  h("path", (obj: any, path: string) =>
    String(path ?? "")
      .split(".")
      .reduce((acc: any, key) => (acc == null ? acc : acc[key]), obj)
  );
  h("get-list-items", (value: any) => (Array.isArray(value) ? value : []));
  h("filter", (items: any, key: string, value: any) =>
    Array.isArray(items) ? items.filter((item) => item?.[key] === value) : []
  );
  h("set", function (this: any, ...args: any[]) {
    const options = args.pop();
    Object.assign(this ?? {}, options?.hash ?? {});
    return "";
  });
  h("parse-string", (value: any) => String(value ?? ""));
  h("conditional", function (this: any, value: any, options: any) {
    return value ? options.fn(this) : options.inverse(this);
  });
}

/* eslint-enable @typescript-eslint/no-explicit-any */
