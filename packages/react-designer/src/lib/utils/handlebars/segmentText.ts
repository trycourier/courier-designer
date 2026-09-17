import type { HandlebarsExpression, HandlebarsExpressionKind } from "./classifyExpression";
import { classifyExpression } from "./classifyExpression";
import { isKnownHelper } from "./helperRegistry";
import { scanHandlebars } from "./scanHandlebars";
import { validateHandlebars } from "./validateHandlebars";
import { isValidVariableName } from "../../../components/utils/validateVariableName";

export type HandlebarsSegment =
  | { type: "text"; text: string }
  | { type: "variable"; name: string; isInvalid: boolean }
  | {
      type: "expression";
      /** The occurrence including braces, preserved byte-for-byte. */
      raw: string;
      kind: HandlebarsExpressionKind;
      /** Helper/block/partial name, for display and validation. */
      name: string;
      isInvalid: boolean;
    };

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

  for (const span of spans) {
    if (span.start > last) {
      segments.push({ type: "text", text: text.slice(last, span.start) });
    }

    const expr = classifyExpression(span.inner, span.triple);

    if (isVariableLike(expr, span.triple)) {
      // Use the whole body, not just the first token, so a malformed name keeps
      // the author's exact text (`{{user. firstName}}`) rather than being
      // truncated to `user.`.
      const name = span.inner.trim();
      segments.push({
        type: "variable",
        name,
        isInvalid: name !== "" && !isValidVariableName(name),
      });
    } else {
      segments.push({
        type: "expression",
        raw: span.raw,
        kind: expr.kind,
        name: expr.name,
        // Judge the occurrence on its own: block balance is a property of the
        // whole field, checked separately, not of one expression.
        isInvalid: validateHandlebars(span.raw).some((i) => i.severity === "error"),
      });
    }

    last = span.end;
  }

  if (last < text.length) {
    segments.push({ type: "text", text: text.slice(last) });
  }

  return segments;
}

/**
 * Whether an expression should be treated as a (possibly malformed) variable
 * reference rather than a handlebars expression.
 *
 * A single token is always a variable. Several tokens are only a helper call
 * when the first one is actually a registered helper — otherwise this is a
 * malformed name such as `{{user. firstName}}`, and showing it as a variable the
 * author can correct beats presenting it as a call to a helper named `user.`.
 */
export function isVariableLike(expr: HandlebarsExpression, triple: boolean): boolean {
  if (triple) return false;
  if (expr.kind === "variable") return true;
  return expr.kind === "helperCall" && !isKnownHelper(expr.name);
}

/** Whether a run of text contains anything the handlebars nodes should own. */
export function hasHandlebars(text: string): boolean {
  return scanHandlebars(text).length > 0;
}
