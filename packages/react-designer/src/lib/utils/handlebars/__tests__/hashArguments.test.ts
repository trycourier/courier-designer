import { describe, expect, it } from "vitest";
import { classifyExpression, expressionValues } from "../classifyExpression";
import { validateHandlebars } from "../validateHandlebars";
import { variableReferencesIn } from "../variableReferences";

/**
 * Handlebars hands a helper its hash separately from its arguments, so a hash
 * pair never counts toward arity. `{{#if data.zero includeZero=true}}` is a
 * one-argument `if` and renders at send.
 */
describe("hash pairs are not positional arguments", () => {
  it("does not count a hash pair toward #if arity", () => {
    expect(validateHandlebars("{{#if data.h.zero includeZero=true}}Y{{else}}N{{/if}}")).toEqual([]);
    expect(validateHandlebars("{{#unless data.x includeZero=true}}Y{{/unless}}")).toEqual([]);
  });

  it("still flags a genuinely two-argument if", () => {
    const [issue] = validateHandlebars("{{#if data.a data.b}}Y{{/if}}");
    expect(issue).toMatchObject({ code: "if-arity", severity: "error" });
  });

  it("separates the hash from the arguments", () => {
    const expr = classifyExpression('concat data.a data.b separator="-"');
    expect(expr.args).toEqual(["data.a", "data.b"]);
    expect(expr.hash).toEqual(['separator="-"']);
    expect(expressionValues(expr)).toEqual(["data.a", "data.b", '"-"']);
  });

  it("counts a path written as a hash value as a reference", () => {
    expect(variableReferencesIn('{{formatMessage "Hi {name}" name=data.user.first}}')).toContain(
      "data.user.first"
    );
  });

  it("leaves an equals sign inside a quoted argument alone", () => {
    const expr = classifyExpression('filter "data" "x" "EQUALS" "a=b"');
    expect(expr.hash).toEqual([]);
    expect(expr.args).toHaveLength(4);
  });
});
