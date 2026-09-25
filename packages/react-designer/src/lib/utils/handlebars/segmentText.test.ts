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
    expect(segmentText("Hi {{data.name}}!")).toMatchObject([
      { type: "text", text: "Hi " },
      { type: "variable", name: "data.name", isInvalid: false },
      { type: "text", text: "!" },
    ]);
  });

  it("treats a malformed name as an invalid variable, not a helper call", () => {
    // `user.` is not a registered helper, so this is a bad variable name the
    // author should fix — not a call to something.
    expect(segmentText("{{user. firstName}}")).toMatchObject([
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

  it("flags a block opener the field never closes", () => {
    // The error belongs to the field, not the occurrence, so it is attributed
    // back to the opener that caused it — otherwise the author sees nothing.
    const [segment] = segmentText("{{#if data.x}}");
    expect(segment).toMatchObject({ type: "expression", isInvalid: true });
  });

  it("does not flag a block the field closes properly", () => {
    const segments = segmentText("{{#if data.x}}yes{{/if}}");
    expect(segments.filter((s) => s.type === "expression").every((s) => !s.isInvalid)).toBe(true);
  });

  it("accepts a block reference inside a block, and rejects it outside one", () => {
    // `this`/`@index` only mean something inside `{{#each}}`/`{{#with}}`; at top
    // level a variable has to be a real namespaced path.
    const inside = segmentText("{{#each data.items}}{{this.name}}{{@index}}{{/each}}");
    expect(inside.filter((s) => s.type === "variable").every((s) => !s.isInvalid)).toBe(true);

    const outside = segmentText("{{this.name}}");
    expect(outside[0]).toMatchObject({ type: "variable", isInvalid: true });
    expect(segmentText("{{@index}}")[0]).toMatchObject({ type: "variable", isInvalid: true });
  });

  it("closes the scope again after the block ends", () => {
    const segments = segmentText("{{#each data.items}}{{this.name}}{{/each}}{{this.name}}");
    const vars = segments.filter((s) => s.type === "variable");
    expect(vars[0].isInvalid).toBe(false);
    expect(vars[1].isInvalid).toBe(true);
  });

  it("returns a single text segment when there is no handlebars", () => {
    expect(segmentText("plain words")).toMatchObject([{ type: "text", text: "plain words" }]);
  });

  it("reports whether text carries handlebars", () => {
    expect(hasHandlebars("{{data.x}}")).toBe(true);
    expect(hasHandlebars("nope")).toBe(false);
  });
});

describe("an unknown helper stays an expression, so the load path still flags it", () => {
  it("segments a call to an unregistered helper as an expression", () => {
    const [segment] = segmentText("{{frobnicate data.score}}");
    expect(segment).toMatchObject({ type: "expression", kind: "helperCall", name: "frobnicate" });
    // Keying this on the registry made it a variable chip, and `unknown-helper`
    // never ran — a bad helper reopened from a stored template looked clean.
    expect(segment).toHaveProperty("isInvalid", true);
  });

  it("still treats a mistyped path as a variable to correct", () => {
    const [segment] = segmentText("{{user. firstName}}");
    expect(segment).toMatchObject({ type: "variable", name: "user. firstName", isInvalid: true });
  });

  it("leaves a registered helper call an expression", () => {
    const [segment] = segmentText("{{capitalize data.user.name}}");
    expect(segment).toMatchObject({ type: "expression", name: "capitalize", isInvalid: false });
  });

  it("reports where each segment sits, so a caller can splice by offset", () => {
    const text = "Hi {{data.name}}!";
    for (const segment of segmentText(text)) {
      const slice = text.slice(segment.start, segment.end);
      // Every segment maps back to the exact source it came from.
      expect(slice).toBe(segment.type === "text" ? segment.text : slice);
      expect(segment.end).toBeGreaterThan(segment.start);
    }
    expect(segmentText(text).map((s) => [s.start, s.end])).toEqual([
      [0, 3],
      [3, 16],
      [16, 17],
    ]);
  });
});

describe("an else inside a valid block", () => {
  it("is not flagged, because it is only orphaned when judged alone", () => {
    // `unexpected-else` is a field-level judgement like unclosed/unexpected
    // close. Judged per occurrence, every `{{else}}` looks orphaned — which
    // turned every valid conditional red.
    const segments = segmentText("{{#if data.x}}a{{else}}b{{/if}}");
    const elseSegment = segments.find(
      (segment) => segment.type === "expression" && segment.kind === "blockElse"
    );
    expect(elseSegment).toBeDefined();
    expect(elseSegment).toHaveProperty("isInvalid", false);
  });

  it("still flags an else with no block around it", () => {
    const [segment] = segmentText("Hello {{else}} you");
    const elseSegment = segmentText("Hello {{else}} you").find(
      (s2) => s2.type === "expression" && s2.kind === "blockElse"
    );
    expect(segment).toBeDefined();
    expect(elseSegment).toHaveProperty("isInvalid", true);
  });
});

/**
 * Two shapes Handlebars accepts and the chip drew red: whitespace control
 * (`{{~x~}}`) and segment-literal indexing (`{{data.items.[0].name}}`). Both
 * send correctly, so flagging them told the author to break working templates.
 */
describe("shapes handlebars accepts that were drawn as errors", () => {
  it("reads whitespace control as the variable it wraps, and keeps it", () => {
    // Kept on the chip because it changes what the send renders; judged without
    // it, because it is not part of the path.
    expect(segmentText("{{~data.name~}}")).toMatchObject([
      { type: "variable", name: "~data.name~", isInvalid: false },
    ]);
    expect(segmentText("{{~ data.name ~}}")[0]).toMatchObject({ isInvalid: false });
  });

  it("keeps the raw text of the expression it came from", () => {
    // The chip still has to serialize back to exactly what the author wrote.
    const [segment] = segmentText("{{~data.name~}}");
    expect("{{~data.name~}}".slice(segment.start, segment.end)).toBe("{{~data.name~}}");
  });

  it("accepts an indexed path", () => {
    expect(segmentText("{{data.items.[0].name}}")).toMatchObject([
      { type: "variable", name: "data.items.[0].name", isInvalid: false },
    ]);
    expect(segmentText("{{data.items.[0]}}")[0]).toMatchObject({ isInvalid: false });
  });

  it("still rejects a malformed path", () => {
    expect(segmentText("{{data..name}}")[0]).toMatchObject({ isInvalid: true });
    expect(segmentText("{{data.items.[]}}")[0]).toMatchObject({ isInvalid: true });
  });
});

describe("whitespace control survives a round trip", () => {
  it("keeps the tildes when the chip is written back out", async () => {
    const { parseStringToContent, contentToString } = await import(
      "@/components/ui/VariableEditor/shared"
    );
    const source = "Hi {{~data.name~}}!";
    expect(contentToString(parseStringToContent(source) as never)).toBe(source);
  });
});

