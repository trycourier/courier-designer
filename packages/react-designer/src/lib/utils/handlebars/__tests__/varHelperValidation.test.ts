import { describe, expect, it } from "vitest";
import { classifyExpression } from "../classifyExpression";
import { severityOfIssue } from "../templateIssues";
import { helperPathArguments } from "../variableRules";
import { validateHandlebars } from "../validateHandlebars";

const args = (inner: string) => helperPathArguments(classifyExpression(inner));
const codes = (text: string) => validateHandlebars(text).map((issue) => issue.code);

/**
 * `var`/`inline-var` name their path as a quoted STRING and resolve it like a
 * legacy single-brace variable, so the literal is a reference and deserves the
 * scrutiny a chip gets. Everywhere else a quoted token is a literal and must
 * stay one — `{{capitalize "data.x"}}` is the string, not the field.
 */
describe("the arguments of a call that are really variables", () => {
  it("includes a var call's quoted path", () => {
    expect(args('var "tenant.name"')).toEqual(["tenant.name"]);
    expect(args('inline-var "data.x"')).toEqual(["data.x"]);
  });

  it("leaves every other helper's literals alone", () => {
    expect(args('capitalize "data.x"')).toEqual([]);
    expect(args('format "%s" "literal"')).toEqual([]);
  });

  it("still reads an unquoted argument as the path it is", () => {
    expect(args("var data.key")).toEqual(["data.key"]);
  });
});

/**
 * The helper throws `#var path argument must be a string` when the argument is
 * missing or is not a string literal, which takes the whole send.
 */
/**
 * Both throw without a path. `var` was briefly exempted here on a probe that
 * read `/messages/{id}/history` BEFORE the error event was written, so an empty
 * error list was mistaken for an empty render; a re-measure in all three
 * content shapes — a bare string, a parts array, and a single part — gives
 * `#var path argument must be a string` every time.
 *
 * The rule the user set: an error blocks everywhere, a warning never blocks. A
 * pill missing from the canvas while Preview & Test disables Send is the
 * inconsistency they noticed.
 */
describe("a var call with nothing to resolve", () => {
  it.each(["[{{var}}]", "[{{inline-var}}]"])("blocks %s, which throws at send", (text) => {
    const issues = validateHandlebars(text);
    expect(
      issues.some((issue) => severityOfIssue(issue) === "blocking"),
      text
    ).toBe(true);
  });
});

/**
 * An empty path is not the same failure. Measured on dev with a probe that
 * re-polled the history until there was an error or real output: a body
 * `[{{var ""}}]` renders `[{}]` and a subject `S [{{var ""}}]` goes out as
 * `(no subject)`, neither of them an error. So it warns and never blocks, and
 * the dropped subject is named through the preview's `dropped` field.
 */
describe("a var call with an empty path", () => {
  it("warns rather than blocking", () => {
    const issues = validateHandlebars('[{{var ""}}]');
    expect(issues.map((issue) => issue.code)).toEqual(["bad-literal-argument"]);
    expect(issues.every((issue) => severityOfIssue(issue) === "warning")).toBe(true);
  });
});

describe("a var call the helper itself rejects", () => {
  it.each([
    ["no argument", "[{{var}}]"],
    ["no argument, inline-var", "[{{inline-var}}]"],
    ["a number", "[{{var 42}}]"],
    ["a boolean", "[{{var true}}]"],
  ])("blocks %s", (_label, text) => {
    const issues = validateHandlebars(text);
    expect(issues.length, `${text} → ${codes(text)}`).toBeGreaterThan(0);
    expect(
      issues.some((issue) => severityOfIssue(issue) === "blocking"),
      text
    ).toBe(true);
  });

  it("accepts the shapes that send", () => {
    for (const text of [
      '[{{var "tenant.name"}}]',
      '[{{inline-var "data.x"}}]',
      "[{{var data.key}}]",
    ]) {
      expect(codes(text), text).not.toContain("bad-literal-argument");
    }
  });
});
