import { describe, expect, it } from "vitest";
import type { ElementalContent } from "@/types/elemental.types";
import { convertElementalToTiptap } from "../convertElementalToTiptap/convertElementalToTiptap";
import { convertTiptapToElemental } from "../convertTiptapToElemental/convertTiptapToElemental";

/**
 * C-20919 acceptance: handlebars authored through the API must survive an editor
 * open/save untouched. These go through the real conversion pipeline in both
 * directions rather than asserting on the intermediate nodes.
 */

const emailWithBody = (content: string): ElementalContent => ({
  version: "2022-01-01",
  elements: [
    {
      type: "channel",
      channel: "email",
      elements: [
        { type: "meta", title: "" },
        { type: "text", content, align: "left" },
      ],
    },
  ],
});

function roundTripBody(content: string): string {
  const tiptap = convertElementalToTiptap(emailWithBody(content), { channel: "email" });
  const back = convertTiptapToElemental(tiptap);
  const text = back.find((el) => el.type === "text") as { elements?: { content?: string }[] };
  return (text?.elements ?? []).map((el) => el.content ?? "").join("");
}

describe("handlebars round-trip through the conversion pipeline", () => {
  const cases: [string, string][] = [
    [
      "the Float conditional subject",
      '{{#if (condition data.foo "==" "bar")}}This is bar!{{else}}This is not bar{{/if}}',
    ],
    ["a block with a nested each", "{{#each data.items}}{{#if this.on}}x{{/if}}{{/each}}"],
    ["a helper call", "{{truncate data.body 10}}"],
    ["an inverse section", "{{^data.empty}}nothing{{/data.empty}}"],
    ["a comment", "{{! internal note }}kept"],
    ["a triple-stache", "{{{data.html}}}"],
    [
      "an expression whose argument contains braces",
      '{{#if (condition data.x "==" "}}")}}y{{/if}}',
    ],
    ["a plain variable beside an expression", "Hi {{data.name}} {{#if data.vip}}VIP{{/if}}"],
    ["an unknown helper, which must still round-trip", "{{#frobnicate data.x}}y{{/frobnicate}}"],
  ];

  it.each(cases)("preserves %s byte-for-byte", (_label, content) => {
    expect(roundTripBody(content)).toBe(content);
  });

  it("preserves an expression that is the whole field", () => {
    expect(roundTripBody("{{else}}")).toBe("{{else}}");
  });

  it("still round-trips ordinary text with no handlebars", () => {
    expect(roundTripBody("just words")).toBe("just words");
  });
});
