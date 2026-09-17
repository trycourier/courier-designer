import type { HandlebarsExpression } from "./classifyExpression";
import { classifyExpression, tokenizeArgs } from "./classifyExpression";
import { isKnownHelper, isValidConditionOperator } from "./helperRegistry";
import { scanHandlebars } from "./scanHandlebars";

export type HandlebarsIssueCode =
  | "unterminated"
  | "unknown-helper"
  | "unclosed-block"
  | "unexpected-close"
  | "mismatched-close"
  | "bad-condition-operator";

export interface HandlebarsIssue {
  code: HandlebarsIssueCode;
  message: string;
  /** Offset into the validated text, when the issue maps to one occurrence. */
  start?: number;
  end?: number;
  /**
   * Block-structure issues are warnings, not errors: the backend interpolates
   * each elemental element separately, but authors do open a block in one text
   * element and close it in the next, and that renders. Flagging it is useful;
   * blocking a save on it would be wrong.
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

  for (const arg of expr.args) scan(arg);
  if (expr.name === "condition") {
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
 * Scoped to one elemental text element — see `unclosed-block` above for why
 * cross-element blocks are a warning rather than an error.
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
          message: `\`{{/${expr.name}}}\` closes a block that was never opened here.`,
          start: span.start,
          end: span.end,
          severity: "warning",
        });
      } else if (open.name !== expr.name) {
        issues.push({
          code: "mismatched-close",
          message: `\`{{/${expr.name}}}\` does not match the open \`{{#${open.name}}}\`.`,
          start: span.start,
          end: span.end,
          severity: "warning",
        });
      }
    }
  }

  for (const open of stack) {
    issues.push({
      code: "unclosed-block",
      message: `\`{{#${open.name}}}\` is never closed here — add \`{{/${open.name}}}\`.`,
      start: open.start,
      severity: "warning",
    });
  }

  return issues;
}

export function hasHandlebarsErrors(text: string): boolean {
  return validateHandlebars(text).some((issue) => issue.severity === "error");
}
