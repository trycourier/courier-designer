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

describe("block helpers used inline, and a stray else", () => {
  // Verified against handlebars itself, not assumed:
  //   {{if x}}   -> throws "options.fn is not a function"
  //   {{else}}   -> Parse error
  // Both fail the send, so both are errors.
  it("flags a block helper called without #", () => {
    const [issue] = validateHandlebars("Hello {{if data.user.name}}");
    expect(issue).toMatchObject({ code: "inline-block-helper", severity: "error" });
    expect(issue.message).toContain("{{#if");
  });

  it("flags each, unless and with the same way", () => {
    for (const name of ["each", "unless", "with"]) {
      const [issue] = validateHandlebars(`{{${name} data.x}}`);
      expect(issue?.code, name).toBe("inline-block-helper");
    }
  });

  it("leaves an inline helper that is not a block helper alone", () => {
    expect(validateHandlebars("{{capitalize data.name}}")).toEqual([]);
    expect(validateHandlebars("{{default data.x 'y'}}")).toEqual([]);
  });

  it("leaves a proper block alone", () => {
    expect(validateHandlebars("{{#if data.x}}a{{else}}b{{/if}}")).toEqual([]);
  });

  it("flags an else outside any block", () => {
    const [issue] = validateHandlebars("Hello {{else}} you!");
    expect(issue).toMatchObject({ code: "unexpected-else", severity: "error" });
  });

  it("flags the reported subject as two errors", () => {
    const codes = validateHandlebars(
      "Hello {{if data.user.name}} {{data.user.name}} {{else}} you!"
    ).map((i) => i.code);
    expect(codes).toContain("inline-block-helper");
    expect(codes).toContain("unexpected-else");
  });
});

describe("bare comparison operators and if arity", () => {
  // Verified against handlebars: `{{#if a == b}}` is a Parse error and
  // `{{#if a b}}` throws "#if requires exactly one argument". Both fail the
  // send, so both block.
  it("flags a bare operator", () => {
    const [issue] = validateHandlebars('{{#if data.user.name == "Geraldo"}}x{{/if}}');
    expect(issue).toMatchObject({ code: "bare-operator", severity: "error" });
    expect(issue.message).toContain('(condition');
  });

  it("flags every comparison operator the same way", () => {
    for (const op of ["==", "===", "!=", "!==", "<", "<=", ">", ">="]) {
      const codes = validateHandlebars(`{{#if data.a ${op} data.b}}x{{/if}}`).map((i) => i.code);
      expect(codes, op).toContain("bare-operator");
    }
  });

  it("flags if and unless taking more than one argument", () => {
    expect(validateHandlebars("{{#if data.a data.b}}x{{/if}}").map((i) => i.code)).toContain(
      "if-arity"
    );
    expect(
      validateHandlebars("{{#unless data.a data.b}}x{{/unless}}").map((i) => i.code)
    ).toContain("if-arity");
  });

  it("leaves the quoted condition form alone", () => {
    expect(
      validateHandlebars('{{#if (condition data.user.name "==" "Geraldo")}}x{{/if}}')
    ).toEqual([]);
  });

  it("leaves literals and ordinary helper calls alone", () => {
    for (const template of [
      '{{#if "lit"}}x{{/if}}',
      "{{#if 1}}x{{/if}}",
      "{{#if true}}x{{/if}}",
      "{{#if 0}}x{{/if}}",
      '{{default data.x "fallback"}}',
      '{{capitalize "abc"}}',
      "{{formatNumber 1234.5}}",
      '{{condition 3 ">" 2}}',
    ]) {
      expect(validateHandlebars(template), template).toEqual([]);
    }
  });
});
