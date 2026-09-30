import Handlebars from "handlebars";
import { CONTEXT_BLOCKS } from "./blockContext";
import type { HandlebarsExpression } from "./classifyExpression";
import { HELPER_SIGNATURES } from "./helperSignatures";
import { classifyExpression, expressionValues, tokenizeArgs } from "./classifyExpression";
import {
  FILTER_OPERATORS,
  isKnownHelper,
  isValidConditionOperator,
  isValidFilterOperator,
} from "./helperRegistry";
import { SET_RESERVED_NAMES } from "./previewHelpers";
import type { HandlebarsSpan } from "./scanHandlebars";
import { swuDateTimeFormat } from "./sendwithus/dateHelpers";
import { scanHandlebars } from "./scanHandlebars";

export type HandlebarsIssueCode =
  | "unterminated"
  | "unknown-helper"
  | "unclosed-block"
  | "unexpected-close"
  | "mismatched-close"
  | "bad-condition-operator"
  | "bad-filter-operator"
  | "condition-arity"
  | "split-block"
  | "inline-block-helper"
  | "unexpected-else"
  | "bare-operator"
  | "if-arity"
  | "range-step"
  | "bad-condition-expression"
  | "bad-loop-expression"
  | "unscoped-path"
  | "parse-error"
  | "trailing-dot"
  | "helper-arity"
  | "bad-literal-argument"
  /**
   * A name the HOST's validator turned down. Not a handlebars fault at all —
   * the template compiles and the send delivers an empty string — so it never
   * blocks. It is here because the chips and the issue list must speak one
   * vocabulary; see `rejectedVariablesIn`.
   */
  | "rejected-variable";

export interface HandlebarsIssue {
  code: HandlebarsIssueCode;
  message: string;
  /** Offset into the validated text, when the issue maps to one occurrence. */
  start?: number;
  end?: number;
  /**
   * The offending text, for an issue that does not sit on a `{{…}}` the caller
   * can look up itself — a parse failure, an opener with no closer. Without it
   * the issue list shows a row with no snippet, and several identical rows
   * cannot be told apart or located.
   */
  raw?: string;
  /**
   * `sendSeverity` overrides `severityForCode` for a code that covers both a
   * send that dies and one that merely renders wrong. `unscoped-path` is the
   * only such code: blocking inside `CONTAINS` or a math helper, a warning
   * everywhere else.
   */
  sendSeverity?: "blocking" | "warning";
  /**
   * Block-structure problems are errors. Handlebars cannot compile an unclosed
   * block — `handlebars/template/text.ts` compiles each single field on its own,
   * so an unclosed `{{#if}}` in a subject is a parse error and the send fails.
   *
   * The one shape this can over-report is a block deliberately opened in one
   * elemental text element and closed in the next, which only works if the
   * backend concatenates a channel's elements into one template. That is
   * unverified, and reporting a real syntax error beats staying silent about it.
   */
  severity: "error" | "warning";
}

/**
 * Issues that are only meaningful across a whole field, never for one
 * occurrence judged alone. An opener looks unclosed on its own, a closer looks
 * orphaned, and an `{{else}}` looks outside any block — which turned every
 * valid conditional red when `unexpected-else` was added without being listed
 * here. Defined once and shared, because it was previously copied into the
 * segmenter and the chip view and the copies drifted.
 */
export const BLOCK_STRUCTURE_CODES = new Set<HandlebarsIssueCode>([
  "unclosed-block",
  "unexpected-close",
  "mismatched-close",
  "unexpected-else",
  // The parser reads the whole field. A lone `{{else}}` or `{{/if}}` handed to
  // it on its own is a parse error that says nothing about the field it came
  // from.
  "parse-error",
]);

/** Names that open a block but are closed implicitly by the renderer. */
const SELF_CLOSING = new Set<string>([]);

/**
 * Helpers that only work as a block. Called inline they throw at send — checked
 * against handlebars itself rather than assumed: `{{if x}}` gives
 * `options.fn is not a function`, `{{unless x}}` and `{{each x}}` the inverse
 * equivalents. The author almost always meant `{{#if x}}`.
 *
 * Taken from the signatures, so a helper marked `block` is flagged once rather
 * than in two places that can drift: measured on dev, `[{{conditional x}}]`
 * fails the whole send and `[{{markdown-mark data.s}}]` throws
 * `t.fn is not a function`, and the designer was silent on both.
 */
const BLOCK_ONLY_HELPERS = new Set(
  Object.entries(HELPER_SIGNATURES)
    .filter(([, signature]) => signature.block)
    .map(([name]) => name)
);

/**
 * Comparison operators written bare, as in `{{#if a == b}}`. Handlebars has no
 * infix operators, so this is a PARSE error — it takes the whole template, not
 * just the field. The renderer's own form is `(condition a "==" b)`, where the
 * operator is a quoted argument.
 */
const BARE_OPERATORS = new Set(["==", "===", "!=", "!==", "<", "<=", ">", ">="]);

/** Helpers that take exactly one argument; more throws at send. */
const SINGLE_ARG_BLOCKS = new Set(["if", "unless"]);

/**
 * `range` with a step of 0 never terminates.
 *
 * The backend recurses on `range(start + step, end, step)` and only returns
 * early for `start === end`, `end === 0` and a step whose sign cannot reach the
 * end (`handlebars/helpers/universal/array/range.ts`). A step of 0 falls
 * through all of those, so the send dies with "Maximum call stack size
 * exceeded" while the editor showed an empty list.
 */
function checkRangeStep(
  expr: HandlebarsExpression,
  start: number,
  issues: HandlebarsIssue[]
): void {
  const scan = (name: string, args: string[]) => {
    if (name !== "range" || args.length < 3) return;
    const [from, to, step] = args.map((arg) => Number(arg));
    if (step !== 0 || !Number.isFinite(from) || !Number.isFinite(to)) return;
    // Both of these return an empty list before the recursion, so they send.
    if (from === to || to === 0) return;

    issues.push({
      code: "range-step",
      message: "`range` with a step of 0 never finishes, and the send fails.",
      start,
      severity: "error",
    });
  };

  scan(expr.name, expr.args);
  for (const arg of expressionValues(expr)) {
    if (!arg.startsWith("(")) continue;
    const inner = classifyExpression(arg.replace(/^\(|\)$/g, ""));
    scan(inner.name, inner.args);
  }
}

/**
 * An operator can only be checked when it is written as a string LITERAL. A
 * path or sub-expression — `(condition a data.op b)` — carries its operator in
 * the data, which is valid and renders at send, so there is nothing to judge
 * here.
 */
/**
 * `{{#data.tags}}…{{/data.tags}}` is not a helper call: handlebars falls back to
 * `blockHelperMissing`, which iterates an array, rebases an object, renders once
 * for a truthy value and takes the inverse for a falsy one. A dotted name is a
 * path used that way; a bare unknown name is still reported, being far more
 * often a misspelled helper.
 */
function isPathBlock(expr: HandlebarsExpression): boolean {
  return (
    (expr.kind === "blockOpen" || expr.kind === "blockInverseOpen") &&
    expr.args.length === 0 &&
    /[./[]/.test(expr.name)
  );
}

function literalOperator(token: string | undefined): string | undefined {
  if (!token) return undefined;
  const quote = token[0];
  if ((quote !== '"' && quote !== "'") || !token.endsWith(quote) || token.length < 2) {
    return undefined;
  }
  return token.slice(1, -1);
}

/**
 * `condition` short of its three operands.
 *
 * The renderer's assertion is off by one — it counts the options hash — so only
 * a call with nothing or one operand actually throws
 * ("#condition requires operand2"). With two, the comparison runs against an
 * `undefined` right operand, comes out false and the message delivers: measured
 * on dev, `{{#if (condition data.n "==")}}Y{{else}}N{{/if}}` renders `N`.
 */
function conditionArity(operands: number, start: number): HandlebarsIssue {
  const dies = operands <= 1;
  return {
    code: "condition-arity",
    message: dies
      ? '`condition` needs three operands — `(condition a "==" b)` — and the send fails without them. For a plain truthiness test use `{{#if data.x}}`.'
      : '`condition` is missing its right operand, so it is always false. Write `(condition a "==" b)`, or `{{#if data.x}}` for a plain truthiness test.',
    start,
    severity: dies ? "error" : "warning",
    sendSeverity: dies ? "blocking" : "warning",
  };
}

function checkConditionOperators(
  expr: HandlebarsExpression,
  start: number,
  issues: HandlebarsIssue[]
): void {
  const scan = (text: string) => {
    // `(condition a "==" b)` — the operator is the second argument.
    const idx = text.indexOf("(condition ");
    if (idx === -1) return;
    const inner = text.slice(idx + 1, text.lastIndexOf(")"));
    const tokens = tokenizeArgs(inner);

    // Arity is judged by `checkHelperArity`, which walks the expression tree
    // and so also sees `(condition)`, with no space for this scan to find.
    if (tokens.length < 4) return;

    const unquoted = literalOperator(tokens[2]);
    if (unquoted === undefined) return;
    if (!isValidConditionOperator(unquoted)) {
      issues.push({
        code: "bad-condition-operator",
        message: `\`${unquoted}\` is not a condition operator. Use one of ==, ===, !=, !==, <, <=, >, >=.`,
        start,
        severity: "error",
      });
    }
  };

  // `filter` takes uppercase word operators, not `condition`'s symbols. Getting
  // this wrong throws at render and the message is never delivered.
  const scanFilter = (text: string) => {
    const idx = text.indexOf("(filter ");
    if (idx === -1) return;
    const inner = text.slice(idx + 1, text.lastIndexOf(")"));
    const op = literalOperator(tokenizeArgs(inner)[3]);
    if (op !== undefined && !isValidFilterOperator(op)) {
      issues.push({
        code: "bad-filter-operator",
        message: `\`${op}\` is not a filter operator. Use one of ${FILTER_OPERATORS.join(", ")}.`,
        start,
        severity: "error",
      });
    }
  };

  for (const arg of expressionValues(expr)) scanFilter(arg);
  if (expr.name === "filter") {
    const op = literalOperator(expr.args[2]);
    if (op !== undefined && !isValidFilterOperator(op)) {
      issues.push({
        code: "bad-filter-operator",
        message: `\`${op}\` is not a filter operator. Use one of ${FILTER_OPERATORS.join(", ")}.`,
        start,
        severity: "error",
      });
    }
  }

  for (const arg of expressionValues(expr)) scan(arg);
  if (expr.name === "condition") {
    if (expr.args.length < 3) return;
    const op = literalOperator(expr.args[1]);
    if (op !== undefined && !isValidConditionOperator(op)) {
      issues.push({
        code: "bad-condition-operator",
        message: `\`${op}\` is not a condition operator. Use one of ==, ===, !=, !==, <, <=, >, >=.`,
        start,
        severity: "error",
      });
    }
  }
}

/**
 * Codes whose correctness depends on the blocks enclosing the occurrence, so
 * they are only meaningful from a pass over the WHOLE field. Judging a span on
 * its own has an empty block stack, which reports every `(path "n")` inside an
 * `{{#each}}` — where it resolves fine. Callers that validate one occurrence
 * must exclude these and take them from the field pass instead, the way
 * `BLOCK_STRUCTURE_CODES` is already handled.
 */
export const CONTEXT_DEPENDENT_CODES = new Set<HandlebarsIssueCode>(["unscoped-path"]);

/**
 * The namespaces the send's variable handler exposes at its root.
 *
 * Under `scope: "strict"` — which is what Studio writes — the handler is rooted
 * ABOVE `data`, so a bare `name` resolves to nothing on EVERY send, whatever the
 * payload. The list is the backend's `TEMPLATE_ROOT_KEYS` unioned with the system
 * variables that survive into the strict template context, not the six names the
 * variable picker shows: verified on dev, `(path "courier.environment")` renders
 * "production" and `(path "datetime.year")` renders the year, so a shorter list
 * would flag working expressions.
 */
const STRICT_ROOT_KEYS = new Set([
  "brand",
  "courier",
  "data",
  "datetime",
  "event",
  "messageId",
  "profile",
  "recipient",
  "template",
  "tenant",
  "translations",
  "urls",
]);

/**
 * Helpers that resolve a path STRING through the variable handler with no
 * second pass behind them. `var` and `inline-var` are deliberately absent: an
 * unresolved one leaves the placeholder `{name}`, which a later data-scoped
 * pass fills in, so a bare path there really does render.
 */
const HANDLER_PATH_HELPERS = new Set(["path", "get-list-items"]);

/**
 * `var` / `inline-var` do not resolve a bare path either, but they render the
 * literal `{name}` rather than nothing, and a second data-scoped pass may still
 * substitute it — over a block's `content` and a meta title, but not over the
 * `string` parts the designer saves text as. Measured on dev.
 */
const VAR_HELPERS = new Set(["var", "inline-var"]);

/** Throw on `undefined` with "undefined is NaN" rather than rendering empty. */
const MATH_HELPERS = new Set([
  "abs",
  "add",
  "ceil",
  "divide",
  "floor",
  "inc",
  "mod",
  "multiply",
  "product",
  "round",
  "sub",
  "subtract",
]);

/** The only filter operators that throw rather than evaluating false. */
const THROWING_FILTER_OPERATORS = new Set(["CONTAINS", "NOT_CONTAINS"]);

const unquote = (arg: string | undefined): string | undefined => {
  if (arg === undefined) return undefined;
  const match = /^"([^"]*)"$|^'([^']*)'$/.exec(arg.trim());
  return match ? (match[1] ?? match[2]) : undefined;
};

/** First path segment, across `a.b`, `a[0]` and `["a"].b`. */
function firstSegment(path: string): string {
  return /^[A-Za-z0-9_$]+/.exec(path.trim())?.[0] ?? "";
}

/** A path the strict root cannot resolve. `$`/`@` anchor explicitly and are fine. */
function isUnscopedPath(path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed || trimmed.startsWith("$") || trimmed.startsWith("@")) return false;
  const head = firstSegment(trimmed);
  // An empty head means `.foo` or `[0]`, which is anchored rather than bare.
  return head !== "" && !STRICT_ROOT_KEYS.has(head);
}

interface UnscopedArg {
  path: string;
  /** `var` renders the placeholder; the others resolve to nothing at all. */
  helper: "var" | "handler";
}

/** The bare path this call resolves, if it resolves one at all. */
function unscopedArgOf(expr: HandlebarsExpression): UnscopedArg | undefined {
  const bare = (arg: string | undefined, helper: UnscopedArg["helper"]) => {
    const path = unquote(arg);
    return path !== undefined && isUnscopedPath(path) ? { path, helper } : undefined;
  };

  if (HANDLER_PATH_HELPERS.has(expr.name)) return bare(expr.args[0], "handler");
  if (VAR_HELPERS.has(expr.name)) return bare(expr.args[0], "var");
  if (expr.name !== "filter") return undefined;
  // `filter "profile"` is scoped to the profile by the backend, so a bare
  // property there is correct.
  if (unquote(expr.args[0]) === "profile") return undefined;
  return bare(expr.args[1], "handler");
}

/**
 * A bare path under strict scope: undefined on every send, whatever the data.
 *
 * Blocking where the renderer throws on that `undefined` — `CONTAINS` /
 * `NOT_CONTAINS` raise "Left operand cannot be undefined or null", and a math
 * helper raises "undefined is NaN". A warning everywhere else, where the send
 * still delivers: other filter operators evaluate false (`IS_EMPTY` true,
 * `NOT_EMPTY` false) and a plain `path` renders empty.
 */
/**
 * The fewest positional arguments a helper survives, measured on dev rather
 * than read off its signature.
 *
 * Reading the signature would be wrong in both directions, because the
 * renderer's `assertHandlebarsArguments` counts the options hash: the hash
 * fills exactly one missing slot, and what happens then is the helper's own
 * business. `{{default x}}` returns the value and delivers, while `{{add 5}}`
 * hands the hash to `assertIsNumber` and dies with "[object Object] is NaN".
 * Only the calls that actually kill a send are listed.
 */
const MINIMUM_ARGUMENTS: Record<string, number> = {
  // "Must pass iterator to #each".
  each: 1,
  // "#contains requires substring". One argument is fine — the options hash
  // becomes the substring and the block takes its else branch — but none at all
  // throws.
  contains: 1,
  // "#default requires defaultValue".
  default: 1,
  // "Invalid Operator: undefined" — the hash lands in the operator position.
  filter: 3,
  // "#condition requires operand2"; the existing `condition-arity` rule covers
  // this one, and is listed here only so the table reads as the whole story.
  condition: 3,
  // Every math helper asserts its operands, so the hash is
  // "[object Object] is NaN" in any of them.
  abs: 1,
  ceil: 1,
  floor: 1,
  round: 1,
  add: 2,
  subtract: 2,
  sub: 2,
  multiply: 2,
  product: 2,
  divide: 2,
  mod: 2,
  // "range expects at least one input".
  range: 1,
  // The string family asserts its subject, and `split` its delimiter too.
  capitalize: 1,
  split: 2,
  format: 1,
  "json-parse": 1,
  "parse-string": 1,
  // "#replace-all must have a replace value".
  "replace-all": 2,
  // These read a path STRING through the send's variable handler; without one
  // they are handed the options hash and throw: `#var path argument must be a
  // string`, confirmed on dev for `var` in all three content shapes — a bare
  // string, a parts array, and a single part.
  //
  // `var` was briefly exempted here on a probe that read `/messages/{id}/history`
  // BEFORE the error event was written, so an empty error list was mistaken for
  // an empty render. If a helper ever looks like it "sends as empty", check that
  // you read the history after the send settled.
  path: 1,
  var: 1,
  "inline-var": 1,
  "get-list-items": 1,
  set: 1,
  // The format argument is read with `includes`, so the hash is
  // "t.includes is not a function".
  "datetime-format": 2,
  swu_datetimeformat: 2,
};

/**
 * Helpers that break on too MANY arguments as well.
 *
 * `{{#each list extra}}` puts the options hash one place further along than
 * handlebars' own `each` looks for it, so `options.fn` is undefined and the
 * send dies with "fn is not a function". Every other helper here either
 * ignores the surplus or folds it into a rest parameter.
 */
const MAXIMUM_ARGUMENTS: Record<string, number> = {
  each: 1,
};

/**
 * How many values a sprintf format string asks for. `%%` is an escaped percent
 * and asks for nothing.
 */
function sprintfPlaceholders(format: string): number {
  return (format.replace(/%%/g, "").match(/%[-+ 0#']*[\d*]*(?:\.[\d*]+)?[a-zA-Z]/g) ?? []).length;
}

/**
 * The backend helper is
 * `sprintf(fmt, ...(Array.isArray(input) ? input : [input]))`, so it reads ONE
 * value argument and silently drops every extra positional. Measured on dev,
 * `[{{format "%s%.2f" data.cur data.total}}]` fails the whole send: the second
 * placeholder has nothing left to fill it and sprintf throws.
 *
 * Only what the template settles is reported. A path could hold an array at
 * send, which fills one placeholder per item, so a two-placeholder format with
 * one path argument is left alone; a scalar LITERAL there cannot.
 */
function formatArityIssue(node: HandlebarsExpression): string | undefined {
  if (node.name !== "format") return undefined;

  if (node.args.length > 2) {
    return "`format` reads one value after the pattern and ignores the rest — pass a list, or one `format` per value.";
  }

  const pattern = literalValue(node.args[0]);
  if (pattern === undefined || node.args.length !== 2) return undefined;
  if (sprintfPlaceholders(pattern) < 2) return undefined;
  // A sub-expression may return a list; a literal scalar cannot.
  if (literalValue(node.args[1]) === undefined) return undefined;

  return "`format` fills these placeholders from one value — the send fails with a single value and more than one placeholder.";
}

/** Reported as `{{name a b}}`, which is how the author wrote it. */
function argumentWord(count: number): string {
  return count === 1 ? "argument" : "arguments";
}

/**
 * Helper calls that throw at send for want of arguments, sub-expressions
 * included — `{{#if (filter "data" "x")}}` dies exactly as the bare call does.
 */
/**
 * A helper the renderer does not register, wherever it is called.
 *
 * `Missing helper: "frobnicate"` is undeliverable, and it does not matter
 * whether the call is the expression itself, a sub-expression inside one
 * (`{{#if (frobnicate x)}}`) or the condition of an else chain
 * (`{{else frobnicate x}}`) — only the top-level position used to be checked.
 */
/** Helpers that read an ICU message and fill it from their hash. */
const MESSAGE_HELPERS = new Set([
  "formatMessage",
  "formatHTMLMessage",
  "intlMessage",
  "intlHTMLMessage",
]);

/**
 * The argument names an ICU message asks for.
 *
 * Only the top level: a plural's `#` and its nested cases read the same
 * argument, which is already counted by the outer placeholder.
 */
function icuPlaceholders(message: string): string[] {
  const names: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of message) {
    if (char === "{") {
      depth += 1;
      if (depth === 1) current = "";
      continue;
    }
    if (char === "}") {
      if (depth === 1) {
        const name = current.split(",")[0].trim();
        if (/^[A-Za-z_]\w*$/.test(name)) names.push(name);
      }
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth === 1) current += char;
  }
  return names;
}

/** Whether `Intl` — and so the renderer — recognises this zone. */
function isKnownTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** The text of a quoted literal, or undefined for a path or a sub-expression. */
function literalValue(token: string | undefined): string | undefined {
  if (!token) return undefined;
  const quote = token[0];
  if ((quote !== '"' && quote !== "'") || !token.endsWith(quote) || token.length < 2) {
    return undefined;
  }
  return token.slice(1, -1);
}

/**
 * A literal argument that cannot work, whatever the data around it.
 *
 * Each of these is measured: the send dies with the message quoted beside it,
 * and the format checks run the very formatter the renderer runs rather than
 * re-implementing its grammar. Only a LITERAL is judged — a format or a search
 * that arrives in the data is unknowable here.
 */
function checkLiteralArguments(
  expr: HandlebarsExpression,
  span: HandlebarsSpan,
  intlDepth: number,
  issues: HandlebarsIssue[]
): void {
  // As above: an `{{else X}}` clause runs only when its branch does.
  const conditional = expr.kind === "blockElse";
  const report = (message: string) => {
    issues.push({
      code: "bad-literal-argument",
      message,
      start: span.start,
      end: span.end,
      severity: conditional ? "warning" : "error",
      ...(conditional ? { sendSeverity: "warning" as const } : {}),
    });
  };

  const visit = (node: HandlebarsExpression) => {
    const first = literalValue(node.args[0]);
    const second = literalValue(node.args[1]);

    // `""` satisfies the type assertion that kills a bare `{{var}}`, so nothing
    // throws: a body sends the literal `{}`, and a SUBJECT is dropped entirely
    // for its default, arriving as `(no subject)`. Both are the message
    // rendering wrong rather than failing, so this warns and never blocks; the
    // dropped subject is named through `HandlebarsPreviewResult.dropped`.
    // Measured on dev by re-polling the history until an error or real output
    // appeared — the read-too-early trap described at MINIMUM_ARGUMENTS.
    if (VAR_HELPERS.has(node.name) && first === "" && node.args[0] !== undefined) {
      issues.push({
        code: "bad-literal-argument",
        message: `\`${node.name}\` with an empty path sends a literal \`{}\`.`,
        start: span.start,
        end: span.end,
        severity: "warning",
        sendSeverity: "warning",
      });
    }

    // `#var path argument must be a string`: the helper asserts the type, so a
    // number or a boolean there takes the whole send. An unquoted PATH is fine
    // — that is a runtime lookup of a path name.
    if (
      (node.name === "var" || node.name === "inline-var") &&
      node.args[0] !== undefined &&
      first === undefined &&
      /^(?:-?\d|true$|false$|null$)/.test(node.args[0].trim())
    ) {
      report(
        `\`${node.name}\` needs its path as a quoted string — the helper rejects \`${node.args[0].trim()}\`.`
      );
    }

    // `#set cannot use reserved word ["data"]`.
    if (node.name === "set" && first !== undefined && SET_RESERVED_NAMES.includes(first)) {
      report(`\`set\` cannot define \`${first}\` — the renderer reserves that name.`);
    }

    if (node.name === "replace-all" && first !== undefined) {
      // "#replace-all must have a search value".
      if (first === "") report("`replace-all` needs something to search for.");
      else {
        try {
          new RegExp(first, "g");
        } catch (error) {
          report(
            `\`replace-all\` cannot use \`${first}\` as a search: ${
              error instanceof Error ? error.message : String(error)
            }.`
          );
        }
      }
    }

    // `range` adds its step to its start, so a string start concatenates —
    // "1", "11", "111" — and the recursion never ends: "Maximum call stack size
    // exceeded". `assertIsNumber` lets a numeric string through, so only the
    // literal quotes give it away.
    if (node.name === "range") {
      const stringArgument = node.args.find((arg) => literalValue(arg) !== undefined);
      if (stringArgument !== undefined) {
        report(`\`range\` cannot take ${stringArgument} as a string — the send never finishes.`);
      }
    }

    if (node.name === "divide" || node.name === "mod") {
      // A literal `0`, not a `"0"` that arrived as a string: the renderer's
      // check is strict on the raw value, so the quoted one divides and the
      // bare one throws "Cannot divide by zero".
      const divisor = node.args[1];
      if (divisor !== undefined && /^-?0(\.0+)?$/.test(divisor.trim())) {
        report(`\`${node.name}\` by zero fails the send.`);
      }
    }

    if (node.name === "datetime-format" || node.name === "swu_datetimeformat") {
      const zone = literalValue(node.args[2]);
      if (second) {
        try {
          swuDateTimeFormat("2026-01-02T03:04:05Z", second, zone);
        } catch (error) {
          report(
            `\`${second}\` is not a date format the renderer accepts: ${
              error instanceof Error ? error.message : String(error)
            }.`
          );
        }
      }
      // A `z` in the format reads the third argument as a time zone. Without
      // one the renderer is handed its options hash and dies with
      // "Invalid time zone specified: [object Object]".
      if (second?.includes("z") && node.args.length < 3) {
        report(
          "a `z` in a date format needs a time zone as the third argument, or the send fails."
        );
      }
      if (zone !== undefined && !isKnownTimeZone(zone)) {
        report(`\`${zone}\` is not a time zone the renderer knows.`);
      }
    }

    // `formatMessage "Hi {name}"` reads `{name}` from the hash, and says
    // "A value must be provided for: name" when nothing supplies it.
    if (MESSAGE_HELPERS.has(node.name) && first !== undefined) {
      const provided = new Set(node.hash.map((pair) => pair.slice(0, pair.indexOf("=")).trim()));
      const missing = icuPlaceholders(first).find((placeholder) => !provided.has(placeholder));
      if (missing !== undefined) {
        report(`\`${missing}\` has no value, and the send fails without one.`);
      }
    }

    // `formatNumber`/`formatDate`/`formatTime` read their second argument as the
    // name of a format defined on the intl context, so one that nothing defines
    // is "Could not find Intl object: formats.number.USD" — a dead send, not a
    // currency code. Inside an `{{#intl}}` block it may well be defined.
    if (
      intlDepth === 0 &&
      second !== undefined &&
      ["formatNumber", "formatDate", "formatTime", "intlNumber", "intlDate", "intlTime"].includes(
        node.name
      )
    ) {
      report(
        `\`${node.name}\` reads \`${second}\` as a named format, which nothing defines — pass the options instead, as \`style="currency" currency="${second}"\`.`
      );
    }

    for (const arg of expressionValues(node)) {
      if (!arg.startsWith("(")) continue;
      visit(classifyExpression(arg.replace(/^\(|\)$/g, "")));
    }
  };

  visit(expr);
}

function checkUnknownHelpers(
  expr: HandlebarsExpression,
  span: HandlebarsSpan,
  channel: string | undefined,
  issues: HandlebarsIssue[]
): void {
  const seen = new Set<string>();

  // An `{{else frobnicate x}}` clause is only evaluated when that branch runs,
  // so the send survives it whenever the block takes the other branch —
  // measured: `{{#if data.t}}A{{else frobnicate data.n}}B{{/if}}` renders `A`.
  // It is still wrong, and it still kills the send the moment the data turns,
  // so it is reported as a warning rather than gating Publish. Publish & Test
  // catches the branch that dies, with the data that kills it. Everything the
  // block's own opener evaluates is unconditional and still blocks.
  const conditional = expr.kind === "blockElse";

  const visit = (node: HandlebarsExpression, nested: boolean) => {
    const isCall =
      node.kind === "blockOpen" ||
      node.kind === "helperCall" ||
      // An `{{else}}` with no name is the plain inverse section, not a call.
      (node.kind === "blockElse" && node.name !== "") ||
      // A sub-expression always calls something: `(data.x)` is not a path.
      nested;

    if (
      isCall &&
      node.name &&
      !node.decorator &&
      !node.partialBlock &&
      !isPathBlock(node) &&
      !isKnownHelper(node.name, channel) &&
      !seen.has(node.name)
    ) {
      seen.add(node.name);
      issues.push({
        code: "unknown-helper",
        message: conditional
          ? `\`${node.name}\` is not a helper the renderer knows — this branch fails the send when the data reaches it.`
          : `\`${node.name}\` is not a helper the renderer knows.`,
        start: span.start,
        end: span.end,
        severity: conditional ? "warning" : "error",
        ...(conditional ? { sendSeverity: "warning" as const } : {}),
      });
    }

    for (const arg of expressionValues(node)) {
      if (!arg.startsWith("(")) continue;
      visit(classifyExpression(arg.replace(/^\(|\)$/g, "")), true);
    }
  };

  visit(expr, false);
}

function checkHelperArity(
  expr: HandlebarsExpression,
  span: HandlebarsSpan,
  issues: HandlebarsIssue[]
): void {
  // Only the branch that runs is evaluated, so a bad call in an `{{else X}}`
  // clause is a warning for the same reason an unknown helper there is.
  const conditional = expr.kind === "blockElse";

  const visit = (node: HandlebarsExpression) => {
    const minimum = MINIMUM_ARGUMENTS[node.name];
    const judged = minimum !== undefined && node.kind !== "blockClose" && node.kind !== "variable";

    // `condition` has a message and a severity of its own: short by one it is
    // always false and delivers, shorter than that it throws.
    const most = MAXIMUM_ARGUMENTS[node.name];
    if (
      most !== undefined &&
      (node.kind === "blockOpen" || node.kind === "blockInverseOpen") &&
      node.args.length > most
    ) {
      issues.push({
        code: "helper-arity",
        message: `\`${node.name}\` takes ${most} ${argumentWord(most)}; a further one makes the send fail.`,
        start: span.start,
        end: span.end,
        severity: conditional ? "warning" : "error",
        ...(conditional ? { sendSeverity: "warning" as const } : {}),
      });
    }

    const formatIssue = formatArityIssue(node);
    if (formatIssue) {
      issues.push({
        code: "helper-arity",
        message: formatIssue,
        start: span.start,
        end: span.end,
        severity: conditional ? "warning" : "error",
        ...(conditional ? { sendSeverity: "warning" as const } : {}),
      });
    }

    if (judged && node.name === "condition" && node.args.length < 3) {
      const issue = conditionArity(node.args.length, span.start);
      issues.push(conditional ? { ...issue, severity: "warning", sendSeverity: "warning" } : issue);
    } else if (judged && node.name !== "condition" && node.args.length < minimum!) {
      issues.push({
        code: "helper-arity",
        message: `\`${node.name}\` needs ${minimum} ${argumentWord(minimum)} and the send fails without them.`,
        start: span.start,
        end: span.end,
        severity: conditional ? "warning" : "error",
        ...(conditional ? { sendSeverity: "warning" as const } : {}),
      });
    }

    for (const arg of expressionValues(node)) {
      if (!arg.startsWith("(")) continue;
      visit(classifyExpression(arg.replace(/^\(|\)$/g, "")));
    }
  };

  visit(expr);
}

function checkUnscopedPaths(
  expr: HandlebarsExpression,
  span: { start: number; end: number },
  varFallsBackToData: boolean,
  issues: HandlebarsIssue[]
): void {
  const report = (path: string, blocking: boolean) => {
    issues.push({
      code: "unscoped-path",
      message: `\`${path}\` is not in scope — use \`data.${path}\`.`,
      start: span.start,
      end: span.end,
      severity: blocking ? "error" : "warning",
      sendSeverity: blocking ? "blocking" : "warning",
    });
  };

  const visit = (node: HandlebarsExpression, parentName: string | undefined): void => {
    const hit = unscopedArgOf(node);
    const inMath = parentName !== undefined && MATH_HELPERS.has(parentName);

    if (hit?.helper === "var") {
      // A math helper consumes the placeholder STRING and dies on it —
      // `{{add (var "qty") 1}}` throws "{qty} is NaN", verified on dev in both
      // a `content` string and a `string` part. Outside one, the placeholder is
      // only visible where no second pass will substitute it.
      if (inMath) report(hit.path, true);
      else if (!varFallsBackToData) report(hit.path, false);
    } else if (hit) {
      const throwsHere =
        node.name === "filter"
          ? THROWING_FILTER_OPERATORS.has(unquote(node.args[2]) ?? "")
          : inMath;
      report(hit.path, throwsHere);
    }

    for (const arg of expressionValues(node)) {
      if (!arg.startsWith("(")) continue;
      visit(classifyExpression(arg.replace(/^\(|\)$/g, "")), node.name);
    }
  };

  visit(expr, undefined);
}

/**
 * Report what would fail, or silently misrender, at send time.
 *
 * Scoped to the one field being validated, which is the unit Handlebars
 * compiles.
 */
export interface ValidateHandlebarsOptions {
  /**
   * Whether an unresolved `{{var "name"}}` is substituted by the send's second,
   * data-scoped pass. True for a block's `content` and a meta title; false for
   * the `string` parts the designer saves text as, where `{name}` reaches the
   * reader. Measured on dev — see the F-013 rows in `sendParity.test.ts`.
   */
  varFallsBackToData?: boolean;
  /**
   * The channel this text belongs to, where the caller knows it. Some helpers
   * are registered per channel — `markdown` renders in a Slack or MSTeams block
   * and is `Missing helper` in an email one — so without it the elemental set is
   * assumed, which is what an email, SMS or push body gets.
   */
  channel?: string;
}

/**
 * What the compiler says about a field, for the syntax errors no hand-written
 * rule covers.
 *
 * The renderer compiles each field, so anything `Handlebars.parse` rejects
 * fails the send outright — `{{data.items[0]}}` (bracket indexing, which is
 * `data.items.[0]` here), `{{data.true}}`, a second `{{else}}`, an unbalanced
 * `(`. The friendlier rules run first and win: this reports only what they
 * missed, since "Expecting 'CLOSE_SEXPR'" helps nobody who has already been
 * told the parenthesis is unclosed.
 */
interface ParseFailure {
  /** The parser's own last line, which is the part an author can act on. */
  reason: string;
  /** The window of text the parser printed around the failure. */
  excerpt: string;
}

function parseFailure(text: string): ParseFailure | undefined {
  try {
    Handlebars.parse(text);
    return undefined;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // "Parse error on line 1:\n<excerpt>\n------^\nExpecting 'ID', got 'INVALID'"
    const lines = message.split("\n").filter((line) => line.trim());
    const reason = lines[lines.length - 1] ?? message;
    // The excerpt sits above the caret line and is a WINDOW, elided with `...`
    // at either end and with newlines dropped, so it cannot be located in the
    // field by string search — it is only ever shown.
    const caret = lines.findIndex((line) => /^-*\^$/.test(line));
    const excerpt = caret > 0 ? lines[caret - 1].replace(/^\.{3}|\.{3}$/g, "").trim() : "";
    return { reason, excerpt };
  }
}

/**
 * The occurrence a parse failure is about, when one of them fails on its own.
 *
 * Block structure is excluded: a lone `{{else}}` or `{{/if}}` never parses by
 * itself, so testing one would blame the first block marker in the field for a
 * mistake made further along.
 */
function offendingSpan(spans: HandlebarsSpan[]): HandlebarsSpan | undefined {
  return spans.find((span) => {
    const kind = classifyExpression(span.inner, span.triple).kind;
    if (kind === "blockOpen" || kind === "blockElse" || kind === "blockClose") return false;
    try {
      Handlebars.parse(span.raw);
      return false;
    } catch {
      return true;
    }
  });
}

/** A snippet short enough for a list row, marked when it was cut. */
function snippet(text: string, limit = 60): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > limit ? `${oneLine.slice(0, limit)}…` : oneLine;
}

export function validateHandlebars(
  text: string,
  options: ValidateHandlebarsOptions = {}
): HandlebarsIssue[] {
  const issues: HandlebarsIssue[] = [];
  if (!text) return issues;
  const varFallsBackToData = options.varFallsBackToData !== false;
  const channel = options.channel;

  const spans = scanHandlebars(text);

  // An opener the scanner could not close is a real syntax error: Handlebars
  // fails to compile and the whole message is dropped.
  const consumed = new Set<number>();
  for (const span of spans) {
    for (let i = span.start; i < span.end; i++) consumed.add(i);
  }
  for (let i = 0; i < text.length - 1; i++) {
    if (text[i] === "{" && text[i + 1] === "{" && !consumed.has(i)) {
      // `{{{data.x}}` is missing a THIRD brace, not a `}}`: an author told to
      // add `}}` to it adds the wrong thing.
      const triple = text[i + 2] === "{";
      const opener = triple ? "{{{" : "{{";
      const closer = triple ? "}}}" : "}}";
      const lineEnd = text.indexOf("\n", i);
      issues.push({
        code: "unterminated",
        message: `Unclosed \`${opener}\` — add the matching \`${closer}\`.`,
        start: i,
        end: lineEnd === -1 ? text.length : lineEnd,
        raw: snippet(text.slice(i, lineEnd === -1 ? text.length : lineEnd)),
        severity: "error",
      });
      break;
    }
  }

  const stack: { name: string; start: number; end: number }[] = [];

  for (const span of spans) {
    const expr = classifyExpression(span.inner, span.triple);

    if (expr.kind === "comment") continue;

    checkUnknownHelpers(expr, span, channel, issues);

    const bare = expr.args.find((arg) => BARE_OPERATORS.has(arg.trim()));
    if (bare) {
      issues.push({
        code: "bare-operator",
        message: `\`#if\` takes one value; to compare, use \`(condition a "${bare.trim()}" b)\`.`,
        start: span.start,
        end: span.end,
        severity: "error",
      });
    } else if (
      // `{{else if a b}}` chains the same helper and throws the same way.
      (expr.kind === "blockOpen" ||
        expr.kind === "blockInverseOpen" ||
        expr.kind === "blockElse") &&
      SINGLE_ARG_BLOCKS.has(expr.name) &&
      expr.args.length !== 1
    ) {
      issues.push({
        code: "if-arity",
        message: `\`{{#${expr.name}}}\` takes exactly one value.`,
        start: span.start,
        end: span.end,
        severity: "error",
      });
    }

    if (expr.kind === "helperCall" && BLOCK_ONLY_HELPERS.has(expr.name)) {
      issues.push({
        code: "inline-block-helper",
        message: `\`${expr.name}\` only works as a block — write \`{{#${expr.name} …}}\` and close it with \`{{/${expr.name}}}\`.`,
        start: span.start,
        end: span.end,
        severity: "error",
      });
    }

    // `{{else}}` outside a block is a PARSE error, so it takes the whole
    // template with it rather than rendering oddly.
    if (expr.kind === "blockElse" && stack.length === 0) {
      issues.push({
        code: "unexpected-else",
        message: "`{{else}}` is outside any block.",
        start: span.start,
        end: span.end,
        severity: "error",
      });
    }

    checkConditionOperators(expr, span.start, issues);
    checkRangeStep(expr, span.start, issues);
    checkHelperArity(expr, span, issues);
    checkLiteralArguments(expr, span, stack.filter((open) => open.name === "intl").length, issues);

    // Inside `{{#each}}`/`{{#with}}` a bare path resolves against the block's
    // context first, so it is correct there and only wrong at the root.
    if (!stack.some((open) => CONTEXT_BLOCKS.has(open.name))) {
      checkUnscopedPaths(expr, span, varFallsBackToData, issues);
    }

    if (expr.kind === "blockOpen" || expr.kind === "blockInverseOpen") {
      if (!SELF_CLOSING.has(expr.name))
        stack.push({ name: expr.name, start: span.start, end: span.end });
    }

    if (expr.kind === "blockClose") {
      const open = stack.pop();
      if (!open) {
        issues.push({
          code: "unexpected-close",
          message: `\`{{/${expr.name}}}\` closes a block that was never opened.`,
          start: span.start,
          end: span.end,
          severity: "error",
        });
      } else if (open.name !== expr.name) {
        issues.push({
          code: "mismatched-close",
          message: `\`{{/${expr.name}}}\` does not match the open \`{{#${open.name}}}\`.`,
          start: span.start,
          end: span.end,
          severity: "error",
        });
      }
    }
  }

  for (const open of stack) {
    issues.push({
      code: "unclosed-block",
      message: `\`{{#${open.name}}}\` is never closed — add \`{{/${open.name}}}\`.`,
      start: open.start,
      // The opener, not the rest of the field: a caller marking this range
      // should highlight the expression that is wrong, not everything after it.
      end: open.end,
      severity: "error",
    });
  }

  // A path cannot end in a dot, and cannot have an empty segment in the middle
  // either. Handlebars parses `{{data.d.}}` and `{{data.d..name}}` happily and
  // the send then dies in `helperMissing` with "... is not a function", so no
  // parser check covers either one. `../` hops are not empty segments.
  const malformedPath = (token: string): boolean => {
    // `../` hops are not empty segments, and they are legal after an `@` too:
    // `{{@../index}}` reads the enclosing loop's index and renders. A leading
    // `./` is the explicit "this context" prefix, not an empty first segment.
    const body = token
      .replace(/~$/, "")
      .replace(/^&/, "")
      .replace(/^@/, "")
      .replace(/^(?:\.\.\/)+/, "")
      .replace(/^\.\//, "");
    // A lone `.` is the current context itself — the same reference as `this`.
    // Measured on dev: `[{{#each data.items}}{{.}}, {{/each}}]` sends
    // `[a, b, c, ]`, and blocking it stopped Publish on templates that send.
    if (body === "" || body === ".") return false;
    return body.endsWith(".") || body.includes("..");
  };

  // Every path one call names, its sub-expressions' paths included. A
  // sub-expression is a CALL, not a path: handing `(condition ../n "<" 10)` to
  // `malformedPath` whole made the `..` after the `(` look like an empty
  // segment, since the `../` strip is anchored at the start of the token — so a
  // `../` hop inside one blocked publishing on a template that renders
  // (measured on dev, requestId 1-6abd5047-cb7aa0b53fc680258f21dd28).
  const pathTokens = (expr: HandlebarsExpression): string[] => {
    const out = [expr.name];
    for (const token of expressionValues(expr)) {
      if (token.startsWith("(")) {
        out.push(...pathTokens(classifyExpression(token.replace(/^\(/, "").replace(/\)$/, ""))));
      } else {
        out.push(token);
      }
    }
    return out;
  };

  for (const span of spans) {
    const expr = classifyExpression(span.inner, span.triple);
    const dotted = pathTokens(expr).find(
      (token) => token && !/^["']/.test(token) && malformedPath(token)
    );
    if (dotted) {
      issues.push({
        code: "trailing-dot",
        message: `\`${dotted}\` is not a path the renderer can read — it has an empty segment.`,
        start: span.start,
        end: span.end,
        severity: "error",
      });
    }
  }

  // Last, and only when nothing friendlier fired: the parser's own message is
  // accurate but speaks in token names.
  if (!issues.some((issue) => issue.severity === "error")) {
    const failure = parseFailure(text);
    if (failure) {
      const span = offendingSpan(spans);
      issues.push({
        code: "parse-error",
        message: `Handlebars cannot compile this field: ${failure.reason}`,
        raw: span ? span.raw : snippet(failure.excerpt),
        ...(span ? { start: span.start, end: span.end } : {}),
        severity: "error",
      });
    }
  }

  return issues;
}

/** A block opened or closed in this text but not balanced within it. */
export function hasUnbalancedBlock(text: string): boolean {
  return validateHandlebars(text).some(
    (issue) =>
      issue.code === "unclosed-block" ||
      issue.code === "unexpected-close" ||
      issue.code === "mismatched-close"
  );
}

export function hasHandlebarsErrors(text: string): boolean {
  return validateHandlebars(text).some((issue) => issue.severity === "error");
}
