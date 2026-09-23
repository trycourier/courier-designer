import { describe, expect, it } from "vitest";
import { classifyExpression, tokenizeArgs } from "./classifyExpression";
import { isKnownHelper, isValidConditionOperator } from "./helperRegistry";
import { scanHandlebars } from "./scanHandlebars";

/** The subject from the Float thread that motivated C-20919. */
const FLOAT_SUBJECT =
  '{{#if (condition data.foo "==" "bar")}}This is bar!{{else}}This is not bar{{/if}}';

describe("scanHandlebars", () => {
  it("finds each occurrence in the Float subject", () => {
    const spans = scanHandlebars(FLOAT_SUBJECT);
    expect(spans.map((s) => s.raw)).toEqual([
      '{{#if (condition data.foo "==" "bar")}}',
      "{{else}}",
      "{{/if}}",
    ]);
  });

  it("does not end a span on braces inside a string argument", () => {
    const spans = scanHandlebars('{{#if (condition data.x "==" "}}")}}');
    expect(spans).toHaveLength(1);
    expect(spans[0].raw).toBe('{{#if (condition data.x "==" "}}")}}');
  });

  it("reads a triple-stache as one span", () => {
    const spans = scanHandlebars("a {{{data.html}}} b");
    expect(spans).toHaveLength(1);
    expect(spans[0].triple).toBe(true);
    expect(spans[0].inner).toBe("data.html");
  });

  it("keeps a double-stache non-triple", () => {
    const [span] = scanHandlebars("{{data.name}}");
    expect(span.triple).toBe(false);
    expect(span.inner).toBe("data.name");
  });

  it("treats a long-form comment as one span even when it contains a mustache", () => {
    const text = "{{!-- was {{data.secret}} --}}Total";
    const spans = scanHandlebars(text);
    expect(spans).toHaveLength(1);
    expect(spans[0].raw).toBe("{{!-- was {{data.secret}} --}}");
    expect(text.slice(spans[0].end)).toBe("Total");
  });

  it("classifies a long-form comment as a comment", () => {
    const [span] = scanHandlebars("{{!-- note --}}");
    expect(classifyExpression(span.inner).kind).toBe("comment");
  });

  it("yields no span for an unterminated long-form comment", () => {
    expect(scanHandlebars("{{!-- never closed")).toEqual([]);
  });

  it("yields no span for an unterminated opener", () => {
    expect(scanHandlebars("hello {{data.name")).toEqual([]);
  });

  it("reports offsets that slice back to the raw text", () => {
    const text = "Hi {{data.name}}!";
    const [span] = scanHandlebars(text);
    expect(text.slice(span.start, span.end)).toBe(span.raw);
  });

  it("returns nothing for text without handlebars", () => {
    expect(scanHandlebars("just words")).toEqual([]);
  });
});

describe("tokenizeArgs", () => {
  it("keeps a sub-expression as a single token", () => {
    expect(tokenizeArgs('#if (condition data.foo "==" "bar")')).toEqual([
      "#if",
      '(condition data.foo "==" "bar")',
    ]);
  });

  it("keeps a quoted string containing spaces together", () => {
    expect(tokenizeArgs('translate "hello there"')).toEqual(["translate", '"hello there"']);
  });
});

describe("classifyExpression", () => {
  it("classifies the three parts of the Float subject", () => {
    const kinds = scanHandlebars(FLOAT_SUBJECT).map((s) => classifyExpression(s.inner).kind);
    expect(kinds).toEqual(["blockOpen", "blockElse", "blockClose"]);
  });

  it("reads a block open's helper name and args", () => {
    const expr = classifyExpression('#if (condition data.foo "==" "bar")');
    expect(expr.kind).toBe("blockOpen");
    expect(expr.name).toBe("if");
    expect(expr.args).toEqual(['(condition data.foo "==" "bar")']);
  });

  it("reads a block close's name", () => {
    expect(classifyExpression("/if")).toMatchObject({ kind: "blockClose", name: "if" });
  });

  it("treats a lone token as a call when the renderer registers a helper by that name", () => {
    // Measured: `{{capitalize}}` fails the send with `e.trim is not a function`,
    // so Handlebars calls the helper rather than reading a value (F-014).
    expect(classifyExpression("default")).toMatchObject({ kind: "helperCall", name: "default" });
    expect(classifyExpression("data.name")).toMatchObject({ kind: "variable", name: "data.name" });
  });

  it("treats a token with arguments as a helper call", () => {
    expect(classifyExpression("truncate data.body 10")).toMatchObject({
      kind: "helperCall",
      name: "truncate",
      args: ["data.body", "10"],
    });
  });

  it("recognises else, else-if and the bare inverse separator", () => {
    expect(classifyExpression("else")).toMatchObject({ kind: "blockElse", name: "" });
    expect(classifyExpression("else if data.x")).toMatchObject({ kind: "blockElse", name: "if" });
    expect(classifyExpression("^")).toMatchObject({ kind: "blockElse" });
  });

  it("recognises inverse sections, partials and comments", () => {
    expect(classifyExpression("^data.empty")).toMatchObject({
      kind: "blockInverseOpen",
      name: "data.empty",
    });
    expect(classifyExpression("> myPartial")).toMatchObject({ kind: "partial", name: "myPartial" });
    expect(classifyExpression("! a note")).toMatchObject({ kind: "comment" });
  });

  it("carries the triple flag through", () => {
    expect(classifyExpression("data.html", true).triple).toBe(true);
  });
});

describe("helperRegistry", () => {
  it("knows helpers the renderer registers", () => {
    for (const name of ["condition", "truncate", "t", "translate", "replace-all", "subtract"]) {
      expect(isKnownHelper(name)).toBe(true);
    }
  });

  it("knows handlebars built-ins the renderer never re-registers", () => {
    for (const name of ["if", "unless", "each", "with"]) {
      expect(isKnownHelper(name)).toBe(true);
    }
  });

  it("does not know an invented helper", () => {
    expect(isKnownHelper("definitely-not-a-helper")).toBe(false);
  });

  it("accepts exactly the operators the condition helper switches on", () => {
    for (const op of ["==", "===", "<", "<=", ">", ">=", "!=", "!=="]) {
      expect(isValidConditionOperator(op)).toBe(true);
    }
    expect(isValidConditionOperator("=")).toBe(false);
    expect(isValidConditionOperator("<>")).toBe(false);
  });
});
