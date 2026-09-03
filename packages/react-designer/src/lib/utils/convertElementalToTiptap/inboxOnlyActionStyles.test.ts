import { describe, it, expect } from "vitest";
import { convertElementalToTiptap } from "./convertElementalToTiptap";
import type { ElementalContent } from "@/types/elemental.types";

/**
 * The Inbox action looks are the Inbox's alone.
 *
 * `actionStyle` is the marker: it is what makes the canvas draw the kit's look and drop the
 * colors on the node. An action on any other channel must not carry it, or an email button
 * would be repainted in the Inbox's palette and lose the colors its author chose.
 */
const withAction = (channel: string, action: Record<string, unknown>) =>
  ({
    version: "2022-01-01",
    elements: [
      {
        type: "channel",
        channel,
        elements: [{ type: "action", content: "Go", href: "https://x.com", ...action }],
      },
    ],
  }) as unknown as ElementalContent;

/** Every node in the converted document, flattened. */
const nodes = (doc: { content?: unknown[] }): Record<string, any>[] => {
  const out: Record<string, any>[] = [];
  const walk = (n: any) => {
    if (!n || typeof n !== "object") return;
    out.push(n);
    (n.content ?? []).forEach(walk);
  };
  (doc.content ?? []).forEach(walk);
  return out;
};

const OTHER_CHANNELS = ["email", "sms", "push", "slack", "msteams"];

describe.each(OTHER_CHANNELS)("an action on the %s channel", (channel) => {
  const doc = convertElementalToTiptap(withAction(channel, { background_color: "#9D3789" }), {
    channel,
  });

  it("is a plain button node, not an Inbox one", () => {
    expect(nodes(doc).some((n) => n.type === "inboxAction")).toBe(false);
    expect(nodes(doc).some((n) => n.type === "buttonRow")).toBe(false);
    expect(nodes(doc).some((n) => n.type === "button")).toBe(true);
  });

  // Without this marker the canvas draws the author's colors, which is the whole point.
  it("carries no actionStyle", () => {
    expect(nodes(doc).every((n) => n.attrs?.actionStyle === undefined)).toBe(true);
  });

  it("keeps the color its author set", () => {
    expect(JSON.stringify(doc)).toContain("#9D3789");
  });

  // An email action may legitimately carry style: "link". It is still an email button drawn
  // with its author's colors, not an Inbox link.
  it("keeps an Elemental style under the legacy attribute rather than the Inbox one", () => {
    const linked = convertElementalToTiptap(withAction(channel, { style: "link" }), { channel });
    const button = nodes(linked).find((n) => n.type === "button");
    expect(button?.attrs?.style).toBe("link");
    expect(button?.attrs?.actionStyle).toBeUndefined();
  });

  it.each(["button", "secondary", "tertiary"])(
    "carries no actionStyle even when the payload names style %s",
    (style) => {
      const doc = convertElementalToTiptap(withAction(channel, { style }), { channel });
      expect(nodes(doc).every((n) => n.attrs?.actionStyle === undefined)).toBe(true);
      expect(nodes(doc).some((n) => n.type === "inboxAction")).toBe(false);
    }
  );
});

describe("an action on the inbox channel", () => {
  it("is the one that becomes an Inbox action", () => {
    const doc = convertElementalToTiptap(withAction("inbox", { style: "secondary" }), {
      channel: "inbox",
    });
    const action = nodes(doc).find((n) => n.type === "inboxAction");
    expect(action).toBeDefined();
    expect(action?.attrs?.actionStyle).toBe("secondary");
  });
});
