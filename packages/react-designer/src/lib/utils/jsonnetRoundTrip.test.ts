import { describe, expect, it } from "vitest";
import { convertElementalToTiptap } from "./convertElementalToTiptap/convertElementalToTiptap";
import { convertTiptapToElemental } from "./convertTiptapToElemental/convertTiptapToElemental";
import type { TiptapDoc } from "./convertTiptapToElemental/convertTiptapToElemental";
import type { ElementalContent } from "../../types";

const TEMPLATE = `{
    "type": "actions",
    "elements": [
        {
            "type": "button",
            "text": {
                "type": "plain_text",
                "text": data("buttonText"),
                "emoji": true
            },
            "value": data("buttonValue")
        }
    ]
}`;

const slackContent = (elements: ElementalContent["elements"]): ElementalContent => ({
  version: "2022-01-01",
  elements: [{ type: "channel", channel: "slack", elements }],
});

describe("jsonnet element conversion", () => {
  it("converts an Elemental jsonnet element into a jsonnet node", () => {
    const tiptap = convertElementalToTiptap(
      slackContent([{ type: "jsonnet", template: TEMPLATE }]),
      { channel: "slack" }
    );

    const node = tiptap.content?.find((n) => n.type === "jsonnet");
    expect(node).toBeDefined();
    expect(node?.attrs?.template).toBe(TEMPLATE);
    expect(node?.attrs?.id).toMatch(/^node-/);
  });

  it("converts a jsonnet node back into an Elemental jsonnet element", () => {
    const tiptap: TiptapDoc = {
      type: "doc",
      content: [{ type: "jsonnet", attrs: { id: "node-1", template: TEMPLATE } }],
    };

    expect(convertTiptapToElemental(tiptap)).toEqual([{ type: "jsonnet", template: TEMPLATE }]);
  });

  // The block is offered behind a flag but the converters are not gated, so a
  // host with the flag off must not drop a block a host with it on created.
  it("survives an Elemental -> Tiptap -> Elemental round trip", () => {
    const elements: ElementalContent["elements"] = [
      { type: "text", content: "Heads up" },
      { type: "jsonnet", template: TEMPLATE },
    ];

    const roundTripped = convertTiptapToElemental(
      convertElementalToTiptap(slackContent(elements), { channel: "slack" })
    );

    expect(roundTripped).toEqual([
      expect.objectContaining({ type: "text" }),
      { type: "jsonnet", template: TEMPLATE },
    ]);
  });

  it("preserves the if condition and locales through a round trip", () => {
    const roundTripped = convertTiptapToElemental(
      convertElementalToTiptap(
        slackContent([
          {
            type: "jsonnet",
            template: TEMPLATE,
            if: "data.showActions",
            locales: { "fr-FR": "{}" },
          },
        ]),
        { channel: "slack" }
      )
    );

    expect(roundTripped).toEqual([
      {
        type: "jsonnet",
        template: TEMPLATE,
        if: "data.showActions",
        locales: { "fr-FR": "{}" },
      },
    ]);
  });

  it("emits an empty template rather than dropping a node with no template", () => {
    const tiptap: TiptapDoc = {
      type: "doc",
      content: [{ type: "jsonnet", attrs: { id: "node-1" } }],
    };

    expect(convertTiptapToElemental(tiptap)).toEqual([{ type: "jsonnet", template: "" }]);
  });
});
