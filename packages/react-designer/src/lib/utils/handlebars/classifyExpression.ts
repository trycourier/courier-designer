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
  /** Top-level arguments, quotes and sub-expression parens preserved. */
  args: string[];
  /** The text between the braces, untrimmed. */
  inner: string;
  /** A triple-stache renders unescaped at send time. */
  triple: boolean;
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

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];

    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
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

/**
 * Work out what a `{{...}}` body actually is.
 *
 * The editor previously ran every occurrence through `isValidVariableName`, so a
 * block helper came out as a malformed variable. Classifying first is what lets
 * `{{#if}}` be rendered and validated as a block rather than flagged as a bad
 * name.
 */
export function classifyExpression(inner: string, triple = false): HandlebarsExpression {
  const trimmed = inner.trim();
  const base = { inner, triple };

  if (trimmed.startsWith("!")) {
    return { ...base, kind: "comment", name: "", args: [] };
  }

  if (trimmed.startsWith(">")) {
    const tokens = tokenizeArgs(trimmed.slice(1).trim());
    return { ...base, kind: "partial", name: tokens[0] ?? "", args: tokens.slice(1) };
  }

  if (trimmed.startsWith("#")) {
    const tokens = tokenizeArgs(trimmed.slice(1).trim());
    return { ...base, kind: "blockOpen", name: tokens[0] ?? "", args: tokens.slice(1) };
  }

  if (trimmed.startsWith("/")) {
    return { ...base, kind: "blockClose", name: trimmed.slice(1).trim(), args: [] };
  }

  if (trimmed.startsWith("^")) {
    const rest = trimmed.slice(1).trim();
    // A bare `{{^}}` is the inverse section separator, i.e. an else.
    if (!rest) return { ...base, kind: "blockElse", name: "", args: [] };
    const tokens = tokenizeArgs(rest);
    return { ...base, kind: "blockInverseOpen", name: tokens[0] ?? "", args: tokens.slice(1) };
  }

  const tokens = tokenizeArgs(trimmed);

  if (tokens[0] === "else") {
    // `{{else if x}}` chains a further condition.
    return { ...base, kind: "blockElse", name: tokens[1] ?? "", args: tokens.slice(2) };
  }

  // A lone token stays a variable even when it shares a name with a helper.
  // This is the shape the existing variable chips rely on, and Handlebars itself
  // only resolves it as a helper when one is registered.
  if (tokens.length <= 1) {
    return { ...base, kind: "variable", name: tokens[0] ?? "", args: [] };
  }

  return { ...base, kind: "helperCall", name: tokens[0], args: tokens.slice(1) };
}

/** Whether this expression is a plain value reference the editor can chip and resolve. */
export function isPlainVariable(expr: HandlebarsExpression): boolean {
  return expr.kind === "variable" && !expr.triple;
}
