import { describe, expect, it } from "vitest";
import type { ElementalContent, ElementalNode } from "../../../types";
import { convertElementalToTiptap } from "./convertElementalToTiptap";

/**
 * The send renders a body once. Text that came out of that render is the
 * reader's text, so a `{{…}}` inside it arrived from the data and is delivered
 * verbatim — parsing it back into a chip previews a second render that never
 * happens.
 */
const template = (content: string): ElementalContent => {
  const channel: ElementalNode = {
    type: "channel",
    channel: "email",
    elements: [{ type: "text", content }],
  };
  return { version: "2022-01-01", elements: [channel] };
};

const nodesOf = (content: string, previewData?: Record<string, unknown>) => {
  const doc = convertElementalToTiptap(template(content), {
    channel: "email",
    ...(previewData ? { previewData } : {}),
  });
  return (doc.content?.[0]?.content ?? []) as { type: string; text?: string }[];
};

const DATA = {
  data: {
    s: { tpl: "{{data.s.name}}", name: "ada", brace: "{data.s.name}" },
  },
};

describe("rendered preview text is literal", () => {
  it("leaves handlebars that came from the data as text", () => {
    const nodes = nodesOf("{{data.s.tpl}}", DATA);
    expect(nodes).toEqual([{ type: "text", text: "{{data.s.name}}" }]);
  });

  // The send's own second, data-scoped pass fills a `{path}` in rendered body
  // text, so the reader gets the value — but as text, never as a chip.
  it("resolves a single-brace variable from the data without making a chip", () => {
    const nodes = nodesOf("{{data.s.brace}}", DATA);
    expect(nodes).toEqual([{ type: "text", text: "ada" }]);
  });

  it("still keeps markdown formatting in rendered text", () => {
    const nodes = nodesOf("**bold** {{data.s.name}}", DATA);
    expect(nodes.map((n) => n.type)).toEqual(["text", "text"]);
    expect(nodes.map((n) => n.text).join("")).toBe("bold ada");
  });

  it("keeps the chips for a block whose render failed", () => {
    const nodes = nodesOf("{{divide 1 0}} {{data.s.name}}", DATA);
    expect(nodes.some((n) => n.type === "handlebarsExpression" || n.type === "variable")).toBe(
      true
    );
  });

  it("parses chips as before when there is no preview data", () => {
    const nodes = nodesOf("{{data.s.name}}");
    expect(nodes).toEqual([{ type: "variable", attrs: { id: "data.s.name", isInvalid: false } }]);
  });
});
