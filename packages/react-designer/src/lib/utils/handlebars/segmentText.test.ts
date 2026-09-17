import { describe, expect, it } from "vitest";
import { hasHandlebars, segmentText } from "./segmentText";

describe("segmentText", () => {
  it("splits the Float subject into blocks and the text between them", () => {
    const segments = segmentText(
      '{{#if (condition data.foo "==" "bar")}}This is bar!{{else}}This is not bar{{/if}}'
    );
    expect(segments.map((s) => s.type)).toEqual([
      "expression",
      "text",
      "expression",
      "text",
      "expression",
    ]);
    expect(segments.map((s) => (s.type === "expression" ? s.kind : s.type))).toEqual([
      "blockOpen",
      "text",
      "blockElse",
      "text",
      "blockClose",
    ]);
  });

  it("preserves each expression verbatim", () => {
    const raw = '{{#if (condition data.foo "==" "bar")}}';
    const [segment] = segmentText(raw);
    expect(segment).toMatchObject({ type: "expression", raw });
  });

  it("keeps a plain variable on the variable node", () => {
    expect(segmentText("Hi {{data.name}}!")).toEqual([
      { type: "text", text: "Hi " },
      { type: "variable", name: "data.name", isInvalid: false },
      { type: "text", text: "!" },
    ]);
  });

  it("treats a malformed name as an invalid variable, not a helper call", () => {
    // `user.` is not a registered helper, so this is a bad variable name the
    // author should fix — not a call to something.
    expect(segmentText("{{user. firstName}}")).toEqual([
      { type: "variable", name: "user. firstName", isInvalid: true },
    ]);
  });

  it("treats a registered helper with arguments as an expression", () => {
    const [segment] = segmentText("{{truncate data.body 10}}");
    expect(segment).toMatchObject({ type: "expression", kind: "helperCall", name: "truncate" });
  });

  it("treats a triple-stache as an expression, never a variable", () => {
    const [segment] = segmentText("{{{data.html}}}");
    expect(segment).toMatchObject({ type: "expression", raw: "{{{data.html}}}" });
  });

  it("flags an expression that would fail to compile", () => {
    const [segment] = segmentText('{{#if (condition data.a "=" data.b)}}');
    expect(segment).toMatchObject({ type: "expression", isInvalid: true });
  });

  it("does not flag a lone block opener, which may close in a later element", () => {
    const [segment] = segmentText("{{#if data.x}}");
    expect(segment).toMatchObject({ type: "expression", isInvalid: false });
  });

  it("returns a single text segment when there is no handlebars", () => {
    expect(segmentText("plain words")).toEqual([{ type: "text", text: "plain words" }]);
  });

  it("reports whether text carries handlebars", () => {
    expect(hasHandlebars("{{data.x}}")).toBe(true);
    expect(hasHandlebars("nope")).toBe(false);
  });
});
