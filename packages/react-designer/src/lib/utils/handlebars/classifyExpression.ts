import { isKnownHelper } from "./helperRegistry";
export type HandlebarsExpressionKind =
  | "variable"
  | "helperCall"
  | "blockOpen"
  | "blockInverseOpen"
  | "blockElse"
  | "blockClose"
  | "partial"
  | "comment";

export interface HandlebarsExpression {
  kind: HandlebarsExpressionKind;
  /** Helper name, variable path, block name, or partial name. Empty for `{{else}}`. */
  name: string;
  /** Positional arguments, quotes and sub-expression parens preserved. */
  args: string[];
  /** `name=value` hash pairs, as written. Never positional arguments. */
  hash: string[];
  /** The text between the braces, untrimmed. */
  inner: string;
  /** A triple-stache renders unescaped at send time. */
  triple: boolean;
  /** A `{{#*inline "name"}}` decorator, whose name is not a helper. */
  decorator?: boolean;
  /** A `{{#> name}}` partial block, whose name is a partial, not a helper. */
  partialBlock?: boolean;
  /** Names bound by an `as |a b|` clause, which are not arguments. */
  blockParams?: string[];
}

/**
 * Split an expression body into top-level tokens, keeping quoted strings and
 * `(sub expressions)` intact so `(condition data.foo "==" "bar")` stays one arg.
 */
export function tokenizeArgs(body: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let depth = 0;
  let quote: '"' | "'" | null = null;
  // A `[...]` segment literal is one path segment however it is spelled, so
  // `data.d.[my key]` is a single token — handlebars reads it to the closing
  // bracket.
  let segment = false;

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];

    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }

    if (segment) {
      current += ch;
      if (ch === "]") segment = false;
      continue;
    }

    if (ch === "[") {
      segment = true;
      current += ch;
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }

    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);

    if (depth === 0 && /\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += ch;
  }

  if (current) tokens.push(current);
  return tokens;
}

/** A hash pair is `name=value`; handlebars only allows them after the arguments. */
const HASH_PAIR = /^[A-Za-z_][\w-]*=/;

/**
 * Pull an `as |item index|` clause off the end of a block's arguments.
 *
 * Block parameters are names the block BINDS, not values it is passed:
 * `{{#each items as |item i|}}` passes `each` one argument. Tokenised as
 * arguments they were read as three more, which made the names look like
 * variables nobody had published.
 */
function splitBlockParams(tokens: string[]): { rest: string[]; blockParams?: string[] } {
  const as = tokens.lastIndexOf("as");
  if (as === -1) return { rest: tokens };
  const clause = tokens.slice(as + 1);
  if (clause.length === 0) return { rest: tokens };
  const text = clause.join(" ");
  if (!text.startsWith("|") || !text.endsWith("|")) return { rest: tokens };
  const names = text.slice(1, -1).trim().split(/\s+/).filter(Boolean);
  if (names.length === 0) return { rest: tokens };
  return { rest: tokens.slice(0, as), blockParams: names };
}

/** Split tokens into positional arguments and `name=value` hash pairs. */
function splitArguments(tokens: string[]): {
  args: string[];
  hash: string[];
  blockParams?: string[];
} {
  const { rest, blockParams } = splitBlockParams(tokens);
  const args: string[] = [];
  const hash: string[] = [];
  for (const token of rest) {
    if (HASH_PAIR.test(token)) hash.push(token);
    else args.push(token);
  }
  return { args, hash, ...(blockParams ? { blockParams } : {}) };
}

/**
 * Work out what a `{{...}}` body actually is.
 *
 * The editor previously ran every occurrence through `isValidVariableName`, so a
 * block helper came out as a malformed variable. Classifying first is what lets
 * `{{#if}}` be rendered and validated as a block rather than flagged as a bad
 * name.
 */
export function classifyExpression(inner: string, triple = false): HandlebarsExpression {
  // `~` is whitespace control, not part of the name: `{{~#if x~}}` is an `if`.
  const trimmed = inner.trim().replace(/^~/, "").replace(/~$/, "").trim();
  const base = { inner, triple };

  if (trimmed.startsWith("!")) {
    return { ...base, kind: "comment", name: "", args: [], hash: [] };
  }

  if (trimmed.startsWith(">")) {
    const tokens = tokenizeArgs(trimmed.slice(1).trim());
    return { ...base, kind: "partial", name: tokens[0] ?? "", ...splitArguments(tokens.slice(1)) };
  }

  if (trimmed.startsWith("#>")) {
    // Partials resolve at send time (brand snippets among them), so the name is
    // never checked here; it closes on the bare name like any block.
    const tokens = tokenizeArgs(trimmed.slice(2).trim());
    return {
      ...base,
      kind: "blockOpen",
      name: tokens[0] ?? "",
      partialBlock: true,
      ...splitArguments(tokens.slice(1)),
    };
  }

  if (trimmed.startsWith("#")) {
    const tokens = tokenizeArgs(trimmed.slice(1).trim());
    const name = tokens[0] ?? "";
    // `{{#*inline "p"}}…{{/inline}}` is a decorator: `*` marks it, and the
    // block closes on the bare name.
    return {
      ...base,
      kind: "blockOpen",
      name: name.startsWith("*") ? name.slice(1) : name,
      ...(name.startsWith("*") ? { decorator: true } : {}),
      ...splitArguments(tokens.slice(1)),
    };
  }

  if (trimmed.startsWith("/")) {
    return { ...base, kind: "blockClose", name: trimmed.slice(1).trim(), args: [], hash: [] };
  }

  if (trimmed.startsWith("^")) {
    const rest = trimmed.slice(1).trim();
    // A bare `{{^}}` is the inverse section separator, i.e. an else.
    if (!rest) return { ...base, kind: "blockElse", name: "", args: [], hash: [] };
    const tokens = tokenizeArgs(rest);
    return {
      ...base,
      kind: "blockInverseOpen",
      name: tokens[0] ?? "",
      ...splitArguments(tokens.slice(1)),
    };
  }

  const tokens = tokenizeArgs(trimmed);

  if (tokens[0] === "else") {
    // `{{else if x}}` chains a further condition.
    return {
      ...base,
      kind: "blockElse",
      name: tokens[1] ?? "",
      ...splitArguments(tokens.slice(2)),
    };
  }

  // A lone token is a variable unless the renderer registers a helper by that
  // name: Handlebars calls the helper then, so `{{line-break}}` is a call.
  if (tokens.length <= 1) {
    const name = tokens[0] ?? "";
    if (name && isKnownHelper(name))
      return { ...base, kind: "helperCall", name, args: [], hash: [] };
    return { ...base, kind: "variable", name, args: [], hash: [] };
  }

  return { ...base, kind: "helperCall", name: tokens[0], ...splitArguments(tokens.slice(1)) };
}

/** Whether this expression is a plain value reference the editor can chip and resolve. */
export function isPlainVariable(expr: HandlebarsExpression): boolean {
  return expr.kind === "variable" && !expr.triple;
}

/**
 * Every value an expression passes, positional or hashed. Arity is judged on
 * `args` alone — handlebars hands the hash over separately — but a path written
 * as `includeZero=data.x` is still a reference to `data.x`.
 */
export function expressionValues(expr: HandlebarsExpression): string[] {
  return [...expr.args, ...expr.hash.map((pair) => pair.slice(pair.indexOf("=") + 1))];
}
