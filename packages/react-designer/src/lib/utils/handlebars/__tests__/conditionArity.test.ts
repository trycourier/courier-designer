import { describe, expect, it } from "vitest";
import { severityOfIssue } from "../templateIssues";
import { validateHandlebars } from "../validateHandlebars";

/**
 * `condition`'s assertion counts the options hash, so it only throws for a call
 * with nothing or one operand. With two, the comparison runs against an
 * `undefined` right operand, comes out false and the message delivers —
 * measured on dev: `[{{#if (condition data.h.n3 "==")}}Y{{else}}N{{/if}}]`
 * renders `[N]`.
 */
const arityOf = (text: string) => {
  const issue = validateHandlebars(text).find((i) => i.code === "condition-arity");
  expect(issue, `${text} was not flagged`).toBeDefined();
  return severityOfIssue(issue!);
};

describe("condition short of its operands", () => {
  it("blocks with nothing or one operand, which throws", () => {
    expect(arityOf("{{#if (condition)}}Y{{/if}}")).toBe("blocking");
    expect(arityOf("{{#if (condition data.h.n3)}}Y{{/if}}")).toBe("blocking");
  });

  it("warns with two, which delivers", () => {
    expect(arityOf('{{#if (condition data.h.n3 "==")}}Y{{else}}N{{/if}}')).toBe("warning");
    expect(arityOf('[{{condition data.a "=="}}]')).toBe("warning");
  });

  it("says nothing about a complete comparison", () => {
    expect(validateHandlebars('{{#if (condition data.a "==" data.b)}}Y{{/if}}')).toEqual([]);
  });
});
