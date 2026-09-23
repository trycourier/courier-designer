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
  | "split-block";

export interface HandlebarsIssue {
  code: HandlebarsIssueCode;
  message: string;
  /** Offset into the validated text, when the issue maps to one occurrence. */
  start?: number;
  end?: number;
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

/** Names that open a block but are closed implicitly by the renderer. */
const SELF_CLOSING = new Set<string>([]);

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

  const stack: { name: string; start: number }[] = [];

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

    checkConditionOperators(expr, span.start, issues);

    if (expr.kind === "blockOpen" || expr.kind === "blockInverseOpen") {
      if (!SELF_CLOSING.has(expr.name)) stack.push({ name: expr.name, start: span.start });
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
