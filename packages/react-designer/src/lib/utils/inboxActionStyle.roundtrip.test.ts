import { describe, expect, it } from "vitest";
import { convertElementalToTiptap } from "./convertElementalToTiptap/convertElementalToTiptap";
import { convertTiptapToElemental } from "./convertTiptapToElemental/convertTiptapToElemental";
import {
  INBOX_ACCENT,
  INBOX_BUTTON_STYLES,
} from "@/components/extensions/Button/inboxButtonStyle";
import type { ElementalActionNode, ElementalContent } from "@/types/elemental.types";

const inboxTemplate = (action: Partial<ElementalActionNode>): ElementalContent => ({
  version: "2022-01-01",
  elements: [
    {
      type: "channel",
      channel: "inbox",
      elements: [
        {
          type: "action",
          content: "Do the thing",
          href: "https://example.com",
          ...action,
        } as ElementalActionNode,
      ],
    },
  ],
});

/** The single action the converters produced, back in Elemental form. */
const roundTrip = (content: ElementalContent): ElementalActionNode => {
  const doc = convertElementalToTiptap(content, { channel: "inbox" });
  const elements = convertTiptapToElemental(doc);
  const action = elements.find((el) => el.type === "action");
  if (!action) throw new Error("no action survived the round trip");
  return action as ElementalActionNode;
};

describe("inbox action styles survive a round trip", () => {
  INBOX_BUTTON_STYLES.forEach((style) => {
    it(`keeps \`${style}\` as \`${style}\``, () => {
      const result = roundTrip(
        inboxTemplate({ style, background_color: INBOX_ACCENT, color: INBOX_ACCENT })
      );
      expect(result.style).toBe(style);
    });
  });

  it("reads a template saved under the old link-plus-white encoding as secondary", () => {
    const result = roundTrip(
      inboxTemplate({ style: "link", background_color: "#ffffff", color: "#000000" })
    );
    expect(result.style).toBe("secondary");
  });

  it("migrates that template's white marker to the accent on the way back out", () => {
    // The white was never a colour anyone picked. Left in place it reaches both renderers as a
    // white border and a white label.
    const result = roundTrip(
      inboxTemplate({ style: "link", background_color: "#ffffff", color: "#000000" })
    );
    expect(result.background_color).toBe(INBOX_ACCENT);
    expect(result.background_color).not.toBe("#ffffff");
  });

  it("leaves a link that never carried the marker as a link", () => {
    const result = roundTrip(
      inboxTemplate({ style: "link", background_color: "#ff0000", color: "#ff0000" })
    );
    expect(result.style).toBe("link");
  });

  it("treats an action with no style at all as the filled default", () => {
    const result = roundTrip(inboxTemplate({}));
    expect(result.style).toBe("button");
  });
});
