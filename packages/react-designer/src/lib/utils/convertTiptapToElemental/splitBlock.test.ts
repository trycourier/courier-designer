import { describe, expect, it } from "vitest";
import { convertTiptapToElemental } from "./convertTiptapToElemental";
import type { TiptapNode } from "./convertTiptapToElemental";

// The backend compiles each `elements` part as its own template, so a block
// helper split across parts fails the send with a parse error (F-001).
const hb = (raw: string): TiptapNode => ({ type: "handlebarsExpression", attrs: { raw } });
const text = (value: string, marks?: TiptapNode["marks"]): TiptapNode => ({
  type: "text",
  text: value,
  marks,
});
const paragraph = (content: TiptapNode[]) =>
  convertTiptapToElemental({ type: "doc", content: [{ type: "paragraph", content }] })[0] as {
    content?: string;
    elements?: unknown[];
  };

describe("a text block whose block helper spans several parts", () => {
  it("saves as one content string", () => {
    const saved = paragraph([
      hb("{{#if data.v}}"),
      text("Y"),
      hb("{{else}}"),
      text("N"),
      hb("{{/if}}"),
    ]);
    expect(saved.elements).toBeUndefined();
    expect(saved.content).toBe("{{#if data.v}}Y{{else}}N{{/if}}");
  });

  it("keeps bold, italic and links as markdown, which the backend renders", () => {
    const saved = paragraph([
      hb("{{#if data.v}}"),
      text("B", [{ type: "bold" }]),
      text(" "),
      text("go", [{ type: "link", attrs: { href: "https://x.com" } }]),
      hb("{{/if}}"),
    ]);
    expect(saved.content).toBe("{{#if data.v}}**B** [go](https://x.com){{/if}}");
  });

  it("keeps a hard break as a newline", () => {
    const saved = paragraph([
      hb("{{#if data.v}}"),
      text("a"),
      { type: "hardBreak" },
      text("b"),
      hb("{{/if}}"),
    ]);
    expect(saved.content).toBe("{{#if data.v}}a\nb{{/if}}");
  });

  it("leaves a run of self-contained parts as elements", () => {
    const saved = paragraph([text("Hi "), hb("{{data.name}}"), text("!", [{ type: "bold" }])]);
    expect(saved.content).toBeUndefined();
    expect(saved.elements).toHaveLength(3);
  });
});
