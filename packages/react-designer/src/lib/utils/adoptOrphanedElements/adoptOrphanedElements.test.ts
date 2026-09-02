import { describe, it, expect } from "vitest";
import { adoptOrphanedElements } from "./adoptOrphanedElements";
import { updateElemental } from "../updateElemental/updateElemental";
import { getOrCreateInboxElement } from "@/components/TemplateEditor/Channels/Inbox/Inbox";
import { getOrCreateSMSElement } from "@/components/TemplateEditor/Channels/SMS/SMS";
import { getOrCreatePushElement } from "@/components/TemplateEditor/Channels/Push/Push";
import { getOrCreateSlackElement } from "@/components/TemplateEditor/Channels/Slack/Slack";
import { getOrCreateMSTeamsElement } from "@/components/TemplateEditor/Channels/MSTeams/MSTeams";
import type { ElementalContent, ElementalNode } from "@/types/elemental.types";

// C-20379. A template that never wrapped its content in a channel block still
// sends: with no channel element present the renderer shows every top-level
// element on every channel. The editors did not read it that way — each showed
// its own defaults — so the author saw none of it, and saving wrote a channel
// block beside content the editor had never shown. Mixed top-level content does
// not render at all.

const ORPHAN = "Your order shipped.";

const orphaned = {
  version: "2022-01-01",
  elements: [{ type: "text", content: ORPHAN }],
} as unknown as ElementalContent;

const otherChannel = {
  version: "2022-01-01",
  elements: [
    { type: "text", content: ORPHAN },
    { type: "channel", channel: "email", elements: [{ type: "text", content: "Email copy." }] },
  ],
} as unknown as ElementalContent;

describe("adoptOrphanedElements", () => {
  it("returns the top-level elements when nothing is wrapped in a channel", () => {
    expect(adoptOrphanedElements(orphaned)).toEqual(orphaned.elements);
  });

  // Already-mixed content is separately broken. Rewriting someone's document as
  // a side effect of opening a tab is not a decision to take silently.
  it("adopts nothing once any channel block exists", () => {
    expect(adoptOrphanedElements(otherChannel)).toBeUndefined();
  });

  it("adopts nothing from an empty or missing template", () => {
    expect(adoptOrphanedElements({ elements: [] })).toBeUndefined();
    expect(adoptOrphanedElements(null)).toBeUndefined();
    expect(adoptOrphanedElements(undefined)).toBeUndefined();
  });
});

// Each channel resolves its own block, so each has to be asked directly. Testing
// the util alone is what let an earlier attempt at this ship a version where the
// read side never fired for five of the six channels.
const resolvers = [
  ["Inbox", getOrCreateInboxElement],
  ["SMS", getOrCreateSMSElement],
  ["Push", getOrCreatePushElement],
  ["Slack", getOrCreateSlackElement],
  ["MSTeams", getOrCreateMSTeamsElement],
] as const;

describe.each(resolvers)("%s resolves a channel-less template", (_name, resolve) => {
  it("shows the orphaned content rather than its defaults", () => {
    expect(JSON.stringify(resolve(orphaned))).toContain(ORPHAN);
  });

  it("falls back to defaults when another channel already has a block", () => {
    expect(JSON.stringify(resolve(otherChannel))).not.toContain(ORPHAN);
  });

  it("saving keeps the content and leaves nothing at the top level", () => {
    const element = resolve(orphaned) as ElementalNode & { elements?: ElementalNode[] };
    const saved = updateElemental(orphaned, {
      elements: element.elements as ElementalNode[],
      channel: (element as { channel?: string }).channel,
    });

    expect(JSON.stringify(saved)).toContain(ORPHAN);
    expect(saved.elements.every((el) => el.type === "channel")).toBe(true);
  });
});

describe("what a save must not do", () => {
  // The regression that took the first attempt down: a channel writing back
  // without having adopted, deleting the elements it never showed.
  it("never drops top-level content it did not adopt", () => {
    const saved = updateElemental(otherChannel, {
      elements: [{ type: "text", content: "Edited." }] as ElementalNode[],
      channel: "email",
    });
    expect(JSON.stringify(saved)).toContain(ORPHAN);
  });

  it("keeps top-level content on an attribute-only update", () => {
    const saved = updateElemental(orphaned, { channel: { channel: "inbox", locale: "es" } });
    expect(JSON.stringify(saved)).toContain(ORPHAN);
  });
});
