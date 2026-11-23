import { describe, expect, it } from "vitest";
import type { ElementalContent, ElementalNode } from "@/types/elemental.types";
import { getMSTeamsFormat, getMSTeamsFormatBlockers } from "./msteamsFormat";

const teams = (elements: ElementalNode[], format?: "text" | "adaptive_card"): ElementalContent => ({
  version: "2022-01-01",
  elements: [
    { type: "channel", channel: "msteams", ...(format && { message_format: format }), elements },
  ],
});

describe("getMSTeamsFormat", () => {
  it("treats a template without the field as text", () => {
    expect(getMSTeamsFormat(teams([]))).toBe("text");
    expect(getMSTeamsFormat(null)).toBe("text");
  });

  it("reads adaptive_card", () => {
    expect(getMSTeamsFormat(teams([], "adaptive_card"))).toBe("adaptive_card");
  });
});

describe("getMSTeamsFormatBlockers", () => {
  it("blocks Text while there are buttons", () => {
    const blockers = getMSTeamsFormatBlockers(
      teams([{ type: "action", content: "Go", href: "https://x.test" }], "adaptive_card")
    );
    expect(blockers.text).toMatch(/buttons/);
    expect(blockers.adaptive_card).toBeNull();
  });

  it("does not count link-style actions as buttons", () => {
    const blockers = getMSTeamsFormatBlockers(
      teams([{ type: "action", content: "Go", href: "https://x.test", style: "link" }])
    );
    expect(blockers.text).toBeNull();
  });

  it("blocks Adaptive card while there are dividers, quotes or headings", () => {
    for (const node of [
      { type: "divider" },
      { type: "quote", content: "q" },
      { type: "text", content: "H", text_style: "h1" },
    ] as ElementalNode[]) {
      expect(getMSTeamsFormatBlockers(teams([node])).adaptive_card).toMatch(/dividers/);
    }
  });

  it("lets plain text and lists switch either way", () => {
    const blockers = getMSTeamsFormatBlockers(teams([{ type: "text", content: "Hi" }]));
    expect(blockers).toEqual({ text: null, adaptive_card: null });
  });
});
