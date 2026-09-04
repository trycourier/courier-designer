import { describe, expect, it } from "vitest";
import { convertElementalToTiptap } from "./convertElementalToTiptap/convertElementalToTiptap";
import { convertTiptapToElemental } from "./convertTiptapToElemental/convertTiptapToElemental";
import { INBOX_BUTTON_STYLES } from "@/components/extensions/Button/inboxButtonStyle";
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
      const result = roundTrip(inboxTemplate({ style }));
      expect(result.style).toBe(style);
    });
  });

  it("reads a template saved under the old link-plus-white encoding as secondary", () => {
    const result = roundTrip(
      inboxTemplate({ style: "link", background_color: "#ffffff", color: "#000000" })
    );
    expect(result.style).toBe("secondary");
  });

  it("drops that template's white marker on the way back out", () => {
    // The white was never a color anyone picked. Left in place it reaches both renderers as a
    // white border and a white label. Nothing replaces it either — an Inbox action carries no
    // color at all now, so the Inbox draws it from its own mode-aware theme.
    const result = roundTrip(
      inboxTemplate({ style: "link", background_color: "#ffffff", color: "#000000" })
    );
    expect(result.background_color).toBeUndefined();
  });

  it("emits no styling of its own for any style", () => {
    // The look belongs to the Inbox's theme, which follows the viewer's mode. A color stamped
    // here would freeze one mode's palette into the template and outrank any integrator theme.
    INBOX_BUTTON_STYLES.forEach((style) => {
      const result = roundTrip(inboxTemplate({ style }));
      expect(result.background_color).toBeUndefined();
      expect(result.color).toBeUndefined();
      expect(result.border).toBeUndefined();
      expect(result.padding).toBeUndefined();
      expect(result.style).toBe(style);
    });
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

describe("an action on another channel is left alone", () => {
  const emailTemplate = (action: Partial<ElementalActionNode>): ElementalContent => ({
    version: "2022-01-01",
    elements: [
      {
        type: "channel",
        channel: "email",
        elements: [
          { type: "action", content: "Buy", href: "https://example.com", ...action },
        ] as ElementalActionNode[],
      },
    ],
  });

  const emailRoundTrip = (content: ElementalContent) => {
    const doc = convertElementalToTiptap(content, { channel: "email" });
    return convertTiptapToElemental(doc).find((el) => el.type === "action") as ElementalActionNode;
  };

  it("keeps an email action's colors, which the Inbox path strips", () => {
    const result = emailRoundTrip(emailTemplate({ background_color: "#0085FF", color: "#ffffff" }));
    expect(result.background_color).toBe("#0085FF");
    expect(result.color).toBe("#ffffff");
  });

  it("does not mark an email action as an Inbox one, even when it carries a style", () => {
    // `actionStyle` is what makes the canvas take the kit's look and drop the node's colors.
    // An email action that happens to carry `style: "link"` must not be caught by it.
    const doc = convertElementalToTiptap(emailTemplate({ style: "link" }), { channel: "email" });
    const button = JSON.stringify(doc).includes('"actionStyle"');
    expect(button).toBe(false);
  });

  it("still round-trips that email action's style", () => {
    const result = emailRoundTrip(emailTemplate({ style: "link" }));
    expect(result.style).toBe("link");
  });
});
