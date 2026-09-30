import { describe, expect, it } from "vitest";
import { validateHandlebars } from "../validateHandlebars";

/**
 * An operator that arrives in the data is valid — the renderer reads it at send
 * — so only an operator written as a string literal can be judged here.
 */
describe("an operator taken from the data", () => {
  it("does not block a condition", () => {
    expect(
      validateHandlebars("{{#if (condition data.h.n3 data.h.op 3)}}Y{{else}}N{{/if}}")
    ).toEqual([]);
    expect(
      validateHandlebars("{{#if (condition data.a (default data.op '==') data.b)}}Y{{/if}}")
    ).toEqual([]);
  });

  // `filter`'s own path rules still apply; what must not fire is the operator.
  it("does not block a filter", () => {
    const codes = validateHandlebars('{{#if (filter "data" "x" data.op "y")}}Y{{/if}}').map(
      (issue) => issue.code
    );
    expect(codes).not.toContain("bad-filter-operator");
  });

  it("still flags a literal operator that is not one", () => {
    const [issue] = validateHandlebars('{{#if (condition data.a "LIKE" data.b)}}Y{{/if}}');
    expect(issue).toMatchObject({ code: "bad-condition-operator", severity: "error" });
    const [filterIssue] = validateHandlebars('{{#if (filter "data" "x" "LIKE" "y")}}Y{{/if}}');
    expect(filterIssue).toMatchObject({ code: "bad-filter-operator", severity: "error" });
  });

  it("still accepts a literal operator that is one", () => {
    expect(validateHandlebars('{{#if (condition data.a "==" data.b)}}Y{{/if}}')).toEqual([]);
  });
});
