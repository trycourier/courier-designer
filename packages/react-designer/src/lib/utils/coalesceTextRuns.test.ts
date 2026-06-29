import { describe, it, expect } from "vitest";
import { coalesceTextRuns } from "./coalesceTextRuns";

describe("coalesceTextRuns", () => {
  it("merges adjacent same-formatting string elements", () => {
    const result = coalesceTextRuns({
      type: "text",
      elements: [
        { type: "string", content: "Hello " },
        { type: "string", content: "{{ data.name }}" },
        { type: "string", content: ", welcome!" },
      ],
    });
    expect(result.elements).toEqual([
      { type: "string", content: "Hello {{ data.name }}, welcome!" },
    ]);
  });

  it("merges a fragmented Liquid if/else block into one field", () => {
    // The shape convertTiptapToElemental produces for:
    //   {% if data.name %}{{ data.name }}{% else %} GetBent {% endif %}
    const result = coalesceTextRuns({
      type: "text",
      align: "left",
      elements: [
        { type: "string", content: "{% if data.name %}" },
        { type: "string", content: " " },
        { type: "string", content: "{{ data.name }}" },
        { type: "string", content: " " },
        { type: "string", content: "{% else %}" },
        { type: "string", content: " GetBent " },
        { type: "string", content: "{% endif %}" },
        { type: "string", content: " " },
      ],
    });
    expect(result.elements).toEqual([
      {
        type: "string",
        content: "{% if data.name %} {{ data.name }} {% else %} GetBent {% endif %} ",
      },
    ]);
  });

  it("does not merge across a formatting boundary", () => {
    const result = coalesceTextRuns({
      type: "text",
      elements: [
        { type: "string", content: "plain " },
        { type: "string", content: "bold", bold: true },
        { type: "string", content: " plain" },
      ],
    });
    expect(result.elements).toEqual([
      { type: "string", content: "plain " },
      { type: "string", content: "bold", bold: true },
      { type: "string", content: " plain" },
    ]);
  });

  it("does not merge across non-string elements (links)", () => {
    const result = coalesceTextRuns({
      type: "text",
      elements: [
        { type: "string", content: "a" },
        { type: "link", content: "link", href: "https://x.com" },
        { type: "string", content: "b" },
      ],
    });
    expect((result.elements as unknown[]).length).toBe(3);
  });

  it("recurses into nested channel/text elements", () => {
    const result = coalesceTextRuns({
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          elements: [
            {
              type: "text",
              elements: [
                { type: "string", content: "{% if x %}" },
                { type: "string", content: "{% endif %}" },
              ],
            },
          ],
        },
      ],
    });
    // @ts-expect-error nested test shape
    expect(result.elements[0].elements[0].elements).toEqual([
      { type: "string", content: "{% if x %}{% endif %}" },
    ]);
  });

  it("leaves a single string element unchanged", () => {
    const result = coalesceTextRuns({
      type: "text",
      elements: [{ type: "string", content: "{{ data.name }}" }],
    });
    expect(result.elements).toEqual([{ type: "string", content: "{{ data.name }}" }]);
  });
});
