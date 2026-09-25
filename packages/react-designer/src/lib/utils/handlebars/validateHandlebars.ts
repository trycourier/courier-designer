import { CONTEXT_BLOCKS } from "./blockContext";
import type { HandlebarsExpression } from "./classifyExpression";
import { classifyExpression, tokenizeArgs } from "./classifyExpression";
import {
  FILTER_OPERATORS,
  isKnownHelper,
  isValidConditionOperator,
  isValidFilterOperator,
} from "./helperRegistry";
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
  | "unscoped-path";

export interface HandlebarsIssue {
  code: HandlebarsIssueCode;
  message: string;
  /** Offset into the validated text, when the issue maps to one occurrence. */
  start?: number;
  end?: number;
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
]);

/** Names that open a block but are closed implicitly by the renderer. */
const SELF_CLOSING = new Set<string>([]);

/**
 * Helpers that only work as a block. Called inline they throw at send — checked
 * against handlebars itself rather than assumed: `{{if x}}` gives
 * `options.fn is not a function`, `{{unless x}}` and `{{each x}}` the inverse
 * equivalents. The author almost always meant `{{#if x}}`.
 */
const BLOCK_ONLY_HELPERS = new Set(["if", "unless", "each", "with"]);

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
  for (const arg of expr.args) {
    if (!arg.startsWith("(")) continue;
    const inner = classifyExpression(arg.replace(/^\(|\)$/g, ""));
    scan(inner.name, inner.args);
  }
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

    // `condition` asserts all three operands, so a short call throws at send
    // time (`#condition requires operand2`) rather than falling back to a
    // truthiness test. `{{#if data.x}}` is the way to test truthiness.
    if (tokens.length < 4) {
      issues.push({
        code: "condition-arity",
        message:
          '`condition` needs three operands — `(condition a "==" b)`. For a plain truthiness test use `{{#if data.x}}`.',
        start,
        severity: "error",
      });
      return;
    }

    const op = tokens[2];
    if (!op) return;
    const unquoted = op.replace(/^["']|["']$/g, "");
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
    const op = tokenizeArgs(inner)[3]?.replace(/^["']|["']$/g, "");
    if (op && !isValidFilterOperator(op)) {
      issues.push({
        code: "bad-filter-operator",
        message: `\`${op}\` is not a filter operator. Use one of ${FILTER_OPERATORS.join(", ")}.`,
        start,
        severity: "error",
      });
    }
  };

  for (const arg of expr.args) scanFilter(arg);
  if (expr.name === "filter") {
    const op = expr.args[2]?.replace(/^["']|["']$/g, "");
    if (op && !isValidFilterOperator(op)) {
      issues.push({
        code: "bad-filter-operator",
        message: `\`${op}\` is not a filter operator. Use one of ${FILTER_OPERATORS.join(", ")}.`,
        start,
        severity: "error",
      });
    }
  }

  for (const arg of expr.args) scan(arg);
  if (expr.name === "condition") {
    if (expr.args.length < 3) {
      issues.push({
        code: "condition-arity",
        message:
          '`condition` needs three operands — `(condition a "==" b)`. For a plain truthiness test use `{{#if data.x}}`.',
        start,
        severity: "error",
      });
      return;
    }
    const op = expr.args[1]?.replace(/^["']|["']$/g, "");
    if (op && !isValidConditionOperator(op)) {
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

/** The bare path this call resolves, if it resolves one at all. */
function unscopedArgOf(expr: HandlebarsExpression): string | undefined {
  if (HANDLER_PATH_HELPERS.has(expr.name)) {
    const path = unquote(expr.args[0]);
    return path !== undefined && isUnscopedPath(path) ? path : undefined;
  }
  if (expr.name !== "filter") return undefined;
  // `filter "profile"` is scoped to the profile by the backend, so a bare
  // property there is correct.
  if (unquote(expr.args[0]) === "profile") return undefined;
  const path = unquote(expr.args[1]);
  return path !== undefined && isUnscopedPath(path) ? path : undefined;
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
function checkUnscopedPaths(
  expr: HandlebarsExpression,
  span: { start: number; end: number },
  issues: HandlebarsIssue[]
): void {
  const visit = (node: HandlebarsExpression, parentName: string | undefined): void => {
    const path = unscopedArgOf(node);
    if (path !== undefined) {
      const throwsHere =
        node.name === "filter"
          ? THROWING_FILTER_OPERATORS.has(unquote(node.args[2]) ?? "")
          : parentName !== undefined && MATH_HELPERS.has(parentName);

      issues.push({
        code: "unscoped-path",
        message: `\`${path}\` is not in scope — use \`data.${path}\`.`,
        start: span.start,
        end: span.end,
        severity: throwsHere ? "error" : "warning",
        sendSeverity: throwsHere ? "blocking" : "warning",
      });
    }

    for (const arg of node.args) {
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
export function validateHandlebars(text: string): HandlebarsIssue[] {
  const issues: HandlebarsIssue[] = [];
  if (!text) return issues;

  const spans = scanHandlebars(text);

  // An opener the scanner could not close is a real syntax error: Handlebars
  // fails to compile and the whole message is dropped.
  const consumed = new Set<number>();
  for (const span of spans) {
    for (let i = span.start; i < span.end; i++) consumed.add(i);
  }
  for (let i = 0; i < text.length - 1; i++) {
    if (text[i] === "{" && text[i + 1] === "{" && !consumed.has(i)) {
      issues.push({
        code: "unterminated",
        message: "Unclosed `{{` — add the matching `}}`.",
        start: i,
        end: i + 2,
        severity: "error",
      });
      break;
    }
  }

  const stack: { name: string; start: number; end: number }[] = [];

  for (const span of spans) {
    const expr = classifyExpression(span.inner, span.triple);

    if (expr.kind === "comment") continue;

    if (
      (expr.kind === "blockOpen" || expr.kind === "helperCall") &&
      expr.name &&
      !isKnownHelper(expr.name)
    ) {
      issues.push({
        code: "unknown-helper",
        message: `\`${expr.name}\` is not a helper the renderer knows.`,
        start: span.start,
        end: span.end,
        severity: "error",
      });
    }

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
      (expr.kind === "blockOpen" || expr.kind === "blockInverseOpen") &&
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

    // Inside `{{#each}}`/`{{#with}}` a bare path resolves against the block's
    // context first, so it is correct there and only wrong at the root.
    if (!stack.some((open) => CONTEXT_BLOCKS.has(open.name))) {
      checkUnscopedPaths(expr, span, issues);
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
