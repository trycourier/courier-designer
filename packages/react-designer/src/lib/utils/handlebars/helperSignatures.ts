export interface HelperParam {
  name: string;
  /** Rendered with a trailing `?`, and never counted as missing. */
  optional?: boolean;
  /** Absorbs this position and every one after it. */
  rest?: boolean;
}

export interface HelperSignature {
  params: HelperParam[];
  /** One line, shown beside the parameter list. */
  summary: string;
  /** Written `{{#name}}…{{/name}}` rather than `{{name}}`. */
  block?: boolean;
}

const p = (name: string, optional?: boolean): HelperParam => ({ name, optional });
const rest = (name: string): HelperParam => ({ name, rest: true, optional: true });

/**
 * Parameter lists for the helpers the renderer registers, taken from the
 * argument names the backend itself asserts on (`assertHandlebarsArguments`) or
 * from the function signature in `handlebars/helpers/universal/*`.
 *
 * A helper with no verified signature is deliberately absent rather than
 * guessed: no hint is better than a wrong one, and the autocomplete still lists
 * the name.
 */
export const HELPER_SIGNATURES: Record<string, HelperSignature> = {
  // Conditionals
  condition: {
    params: [p("operand1"), p("conditional"), p("operand2")],
    summary: "Compare two values. Operator is one of == === != !== < <= > >=",
  },
  if: { params: [p("condition")], summary: "Render the block when truthy.", block: true },
  unless: { params: [p("condition")], summary: "Render the block when falsy.", block: true },
  conditional: { params: [p("value")], summary: "Render the block when truthy.", block: true },
  and: { params: [rest("values")], summary: "True when every value is truthy." },
  or: { params: [rest("values")], summary: "True when any value is truthy." },
  not: { params: [p("value")], summary: "Negate a value." },
  contains: {
    params: [p("string"), p("substring")],
    summary: "Render the block when string contains substring.",
    block: true,
  },

  // Iteration
  each: { params: [p("context")], summary: "Loop over a list or object.", block: true },
  with: { params: [p("context")], summary: "Re-scope the block to context.", block: true },
  filter: {
    params: [p("source"), p("property"), p("operator"), p("value", true)],
    summary: "Keep list entries whose property matches.",
  },
  "get-list-items": { params: [p("path")], summary: "Read a list at a path." },
  range: {
    params: [p("start"), p("end", true), p("step", true)],
    summary: "Build a list of numbers. One argument is the end.",
  },

  // Values
  default: {
    params: [p("value"), p("defaultValue")],
    summary: "Fall back when null or undefined.",
  },
  var: { params: [p("path")], summary: "Resolve a variable path." },
  "inline-var": { params: [p("path")], summary: "Resolve a variable path inline." },
  path: { params: [p("path")], summary: "Read a value at a JSON path." },
  set: { params: [p("name"), p("value")], summary: "Assign a variable for later use." },
  lookup: { params: [p("object"), p("key")], summary: "Read a property by key." },
  "json-parse": { params: [p("value")], summary: "Parse a JSON string." },
  "parse-string": { params: [p("value")], summary: "Coerce a value to a string." },

  // Strings
  capitalize: { params: [p("string")], summary: "Upper-case the first character." },
  concat: { params: [rest("values")], summary: "Join values. Hash: separator, safe." },
  truncate: {
    params: [p("string"), p("limit"), p("suffix", true)],
    summary: "Cut to limit characters, appending suffix.",
  },
  split: { params: [p("value"), p("delimiter", true)], summary: "Split into a list." },
  trim: { params: [p("string", true)], summary: "Strip whitespace from both ends." },
  "trim-left": { params: [p("string")], summary: "Strip leading whitespace." },
  "trim-right": { params: [p("string")], summary: "Strip trailing whitespace." },
  "replace-all": {
    params: [p("search"), p("value")],
    summary: "Replace every match inside the block.",
    block: true,
  },
  format: {
    params: [p("pattern"), p("input")],
    summary: "sprintf the input; an array fills one placeholder per item.",
  },

  // Maths
  abs: { params: [p("number")], summary: "Absolute value." },
  ceil: { params: [p("number")], summary: "Round up." },
  floor: { params: [p("number")], summary: "Round down." },
  round: { params: [p("number")], summary: "Round to nearest." },
  inc: { params: [p("value")], summary: "Add one." },
  add: { params: [p("a"), p("b")], summary: "a + b" },
  subtract: { params: [p("a"), p("b")], summary: "a − b" },
  sub: { params: [p("a"), p("b")], summary: "a − b" },
  multiply: { params: [p("a"), p("b")], summary: "a × b" },
  product: { params: [p("a"), p("b")], summary: "a × b" },
  divide: { params: [p("a"), p("b")], summary: "a ÷ b. Throws on zero." },
  mod: { params: [p("a"), p("b")], summary: "Remainder. Throws on zero." },

  // Localisation and links
  translate: { params: [p("messageId"), rest("args")], summary: "Look up a translation." },
  t: { params: [p("messageId"), rest("args")], summary: "Look up a translation." },
  "get-href": { params: [p("href")], summary: "Resolve a link's href." },
  "line-break": { params: [], summary: "Emit a line break." },
  log: { params: [rest("values")], summary: "Write to the render log." },
  "datetime-format": {
    params: [p("value"), p("format", true), p("timezone", true)],
    summary: "Format a date or time.",
  },
  "text-direction": {
    params: [p("value")],
    summary: "Emit text-rtl for right-to-left text, and nothing otherwise.",
  },
};

export function getHelperSignature(name: string): HelperSignature | undefined {
  return HELPER_SIGNATURES[name];
}

/**
 * `truncate string limit suffix?` — for a one-line label.
 *
 * Space-separated rather than `name(a, b)`: handlebars arguments are written
 * with spaces, and parentheses in the hint led authors to type them.
 */
export function formatSignature(name: string, signature: HelperSignature): string {
  const params = signature.params
    // A rest parameter is already open-ended; a trailing `?` on top of `...`
    // reads as a second, contradictory marker.
    .map(
      (param) =>
        `${param.rest ? "..." : ""}${param.name}${param.optional && !param.rest ? "?" : ""}`
    )
    .join(" ");
  return params ? `${name} ${params}` : name;
}

/**
 * Which parameter the caret is on, given the text before it.
 *
 * `inner` is the expression body up to the caret. The helper name is argument
 * zero, so the first real parameter is index 0 once one separator has been
 * typed. A trailing space means the author has moved on to the next parameter,
 * which is what makes the hint advance as they type.
 */
export function activeParamIndex(innerBeforeCaret: string, helperName: string): number {
  const body = innerBeforeCaret.replace(/^\s*[#^/]?\s*/, "");
  if (!body.startsWith(helperName)) return -1;

  const rest = body.slice(helperName.length);
  if (!rest) return -1;

  let index = -1;
  let quote: '"' | "'" | null = null;
  let depth = 0;
  let sawToken = false;

  for (let i = 0; i < rest.length; i++) {
    const ch = rest[i];

    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      if (!sawToken) {
        index++;
        sawToken = true;
      }
      continue;
    }
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);

    if (depth === 0 && /\s/.test(ch)) {
      sawToken = false;
      continue;
    }

    if (!sawToken) {
      index++;
      sawToken = true;
    }
  }

  // A trailing separator means the next parameter has been started.
  if (!sawToken && /\s$/.test(rest)) index++;

  return index;
}
