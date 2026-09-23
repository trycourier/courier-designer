import { describe, expect, it } from "vitest";
import { hasHandlebarsErrors, validateHandlebars } from "./validateHandlebars";

const codes = (text: string) => validateHandlebars(text).map((i) => i.code);

describe("validateHandlebars", () => {
  it("passes the Float subject clean", () => {
    expect(
      validateHandlebars(
        '{{#if (condition data.foo "==" "bar")}}This is bar!{{else}}This is not bar{{/if}}'
      )
    ).toEqual([]);
  });

  it("passes a plain variable", () => {
    expect(validateHandlebars("Hi {{data.name}}!")).toEqual([]);
  });

  it("flags an unclosed brace as an error", () => {
    expect(codes("Hi {{data.name")).toContain("unterminated");
    expect(hasHandlebarsErrors("Hi {{data.name")).toBe(true);
  });

  it("flags an unknown helper", () => {
    const issues = validateHandlebars("{{#frobnicate data.x}}y{{/frobnicate}}");
    expect(issues.map((i) => i.code)).toContain("unknown-helper");
  });

  it("does not flag a helper the renderer registers", () => {
    expect(codes('{{truncate data.body 10}}{{t "key"}}')).toEqual([]);
  });

  it("flags a bad condition operator", () => {
    const issues = validateHandlebars('{{#if (condition data.foo "=" "bar")}}x{{/if}}');
    expect(issues.map((i) => i.code)).toContain("bad-condition-operator");
  });

  it("flags a condition with too few operands, which throws at send time", () => {
    // `assertHandlebarsArguments(args, "operand1", "conditional", "operand2")`
    // throws `#condition requires operand2`; there is no truthiness fallback.
    expect(codes("{{#if (condition data.foo)}}x{{/if}}")).toContain("condition-arity");
    expect(codes('{{#if (condition data.foo "==")}}x{{/if}}')).toContain("condition-arity");
  });

  it("accepts a plain truthiness test, which needs no condition helper", () => {
    expect(codes("{{#if data.foo}}x{{/if}}")).toEqual([]);
  });

  it("accepts every operator the backend switches on", () => {
    for (const op of ["==", "===", "!=", "!==", "<", "<=", ">", ">="]) {
      expect(codes(`{{#if (condition data.a "${op}" data.b)}}x{{/if}}`)).toEqual([]);
    }
  });

  it("flags a condition operator used on filter, which throws at render", () => {
    // `filter` takes uppercase words; `">"` is `Invalid Operator` and the
    // message never delivers.
    expect(codes('{{#if (filter "data" "data.score" ">" 80)}}x{{/if}}')).toContain(
      "bad-filter-operator"
    );
  });

  it("accepts filter's own operators", () => {
    expect(codes('{{#if (filter "data" "data.score" "GREATER_THAN" 80)}}x{{/if}}')).toEqual([]);
    expect(codes('{{#if (filter "data" "data.x" "IS_EMPTY")}}x{{/if}}')).toEqual([]);
  });

  it("errors on a block left open — Handlebars cannot compile it", () => {
    const issues = validateHandlebars("{{#if data.x}}only the opener");
    expect(issues.map((i) => i.code)).toContain("unclosed-block");
    expect(issues.every((i) => i.severity === "error")).toBe(true);
    expect(hasHandlebarsErrors("{{#if data.x}}only the opener")).toBe(true);
  });

  it("errors on a lone closer", () => {
    const issues = validateHandlebars("{{/if}}");
    expect(issues.map((i) => i.code)).toContain("unexpected-close");
    expect(hasHandlebarsErrors("{{/if}}")).toBe(true);
  });

  it("warns on a mismatched closer", () => {
    expect(codes("{{#if data.x}}y{{/each}}")).toContain("mismatched-close");
  });

  it("handles nested blocks", () => {
    expect(codes("{{#each data.items}}{{#if this.on}}x{{/if}}{{/each}}")).toEqual([]);
  });

  it("ignores comments", () => {
    expect(codes("{{! a note }}{{data.x}}")).toEqual([]);
  });

  it("returns nothing for empty text", () => {
    expect(validateHandlebars("")).toEqual([]);
  });
});
