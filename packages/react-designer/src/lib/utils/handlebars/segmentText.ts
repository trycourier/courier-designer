import type { HandlebarsExpression, HandlebarsExpressionKind } from "./classifyExpression";
import { classifyExpression } from "./classifyExpression";
import { scanHandlebars } from "./scanHandlebars";
import { BLOCK_STRUCTURE_CODES, validateHandlebars } from "./validateHandlebars";

import { classifyVariableReference } from "./variableRules";
import { severityForCode } from "./templateIssues";

/** Where a segment sits in the source text, for a caller splicing by offset. */
interface SegmentSpan {
  start: number;
  /** Index just past the segment. */
  end: number;
}

/**
 * How badly wrong a segment is.
 *
 * `blocking` is handlebars the send cannot compile. `warning` is something the
 * send renders as an empty string — a malformed name, a helper called with too
 * few operands. Drawing both red left the author unable to tell which ones
 * actually stop a send.
 */
export type SegmentSeverity = "blocking" | "warning";

export type HandlebarsSegment =
  | ({ type: "text"; text: string } & SegmentSpan)
  | ({
      type: "variable";
      name: string;
      isInvalid: boolean;
      severity?: SegmentSeverity;
    } & SegmentSpan)
  | ({
      type: "expression";
      /** The occurrence including braces, preserved byte-for-byte. */
      raw: string;
      kind: HandlebarsExpressionKind;
      /** Helper/block/partial name, for display and validation. */
      name: string;
      isInvalid: boolean;
      severity?: SegmentSeverity;
    } & SegmentSpan);

/**
 * Split a run of text into literal text, variable references, and the
 * handlebars expressions that are not variable references.
 *
 * Every `{{...}}` used to be run through `isValidVariableName`, so
 * `{{#if (condition ...)}}` came out as a malformed variable. Splitting the two
 * apart is what lets a block helper round-trip verbatim and be shown as a block
 * rather than flagged as a bad name.
 */
export function segmentText(text: string): HandlebarsSegment[] {
  const segments: HandlebarsSegment[] = [];
  if (!text) return segments;

  const spans = scanHandlebars(text);
  let last = 0;
  // Depth of open `{{#…}}` blocks at the current point in the field, so a
  // `this`/`@index` reference is only accepted where it means something.
  let blockDepth = 0;

  // Block balance is a property of the whole field, so it is computed once here
  // and attributed back to the occurrence that caused it — otherwise a lone
  // `{{#if}}` looks fine on its own and the author never sees the error.
  const fieldErrorStarts = new Set(
    validateHandlebars(text)
      .filter(
        (issue) =>
          severityForCode(issue.code) === "blocking" &&
          issue.start !== undefined &&
          // Everything else is judged per occurrence below; taking it from the
          // field pass as well drew a warning-level problem as a blocking one.
          BLOCK_STRUCTURE_CODES.has(issue.code)
      )
      .map((issue) => issue.start as number)
  );

  for (const span of spans) {
    if (span.start > last) {
      segments.push({
        type: "text",
        text: text.slice(last, span.start),
        start: last,
        end: span.start,
      });
    }

    const expr = classifyExpression(span.inner, span.triple);

    if (isVariableLike(expr, span.triple)) {
      // Use the whole body, not just the first token, so a malformed name keeps
      // the author's exact text (`{{user. firstName}}`) rather than being
      // truncated to `user.`.
      const name = span.inner.trim();
      // Shape and scope only: the host's variable list is not available here,
      // so membership is left to the chip. See `variableRules`.
      const malformed =
        name !== "" &&
        classifyVariableReference(name, { available: [], inBlockScope: blockDepth > 0 }) ===
          "malformed";
      segments.push({
        type: "variable",
        start: span.start,
        end: span.end,
        name,
        isInvalid: malformed,
        // A name the send cannot resolve renders as an empty string; it does
        // not stop the send.
        ...(malformed ? { severity: "warning" as const } : {}),
      });
    } else {
      // Block structure is judged once for the whole field above; judging an
      // occurrence on its own would flag every opener as unclosed.
      const ownIssues = validateHandlebars(span.raw).filter(
        (i) => !BLOCK_STRUCTURE_CODES.has(i.code)
      );
      const worst: SegmentSeverity | undefined = fieldErrorStarts.has(span.start)
        ? "blocking"
        : ownIssues.some((i) => severityForCode(i.code) === "blocking")
          ? "blocking"
          : ownIssues.length > 0
            ? "warning"
            : undefined;

      segments.push({
        type: "expression",
        start: span.start,
        end: span.end,
        raw: span.raw,
        kind: expr.kind,
        name: expr.name,
        isInvalid: worst !== undefined,
        ...(worst ? { severity: worst } : {}),
      });
    }

    if (expr.kind === "blockOpen" || expr.kind === "blockInverseOpen") blockDepth += 1;
    else if (expr.kind === "blockClose") blockDepth = Math.max(0, blockDepth - 1);

    last = span.end;
  }

  if (last < text.length) {
    segments.push({ type: "text", text: text.slice(last), start: last, end: text.length });
  }

  return segments;
}

/** A bare identifier, which is the only shape a helper name can take. */
const HELPER_NAME_SHAPE = /^[A-Za-z_][\w-]*$/;

/**
 * Whether an expression should be treated as a (possibly malformed) variable
 * reference rather than a handlebars expression.
 *
 * A single token is always a variable. Several tokens are a helper call when the
 * first one is shaped like a helper name, whether or not it is registered:
 * keying this on the registry hid every unknown helper, because
 * `{{frobnicate data.score}}` became a variable chip and the `unknown-helper`
 * check never ran on it.
 *
 * A first token that cannot be a helper name — `{{user. firstName}}` — is a
 * mistyped variable, and showing it as a variable the author can correct beats
 * presenting it as a call to a helper named `user.`.
 */
export function isVariableLike(expr: HandlebarsExpression, triple: boolean): boolean {
  if (triple) return false;
  if (expr.kind === "variable") return true;
  if (expr.kind !== "helperCall") return false;
  return !HELPER_NAME_SHAPE.test(expr.name);
}

/** Whether a run of text contains anything the handlebars nodes should own. */
export function hasHandlebars(text: string): boolean {
  return scanHandlebars(text).length > 0;
}
