import { describe, it, expect } from "vitest";
import { updateElemental } from "./updateElemental";
import { convertElementalToTiptap } from "../convertElementalToTiptap/convertElementalToTiptap";
import { convertTiptapToElemental } from "../convertTiptapToElemental/convertTiptapToElemental";
import type { ElementalContent, ElementalNode } from "../../../types/elemental.types";

// Content written before the channel block existed still sends: with no channel
// element present the renderer shows every top-level element on every channel.
// The editor used to open it blank, and a save from there appended a channel
// block beside the elements it could not see. Mixed top-level content does not
// render at all, so opening such a template was enough to break it.
const orphaned = {
  version: "2022-01-01",
  elements: [{ type: "text", content: "Your order shipped." }],
} as unknown as ElementalContent;

const wrapped = {
  version: "2022-01-01",
  elements: [
    {
      type: "channel",
      channel: "inbox",
      elements: [{ type: "text", content: "Already wrapped." }],
    },
  ],
} as unknown as ElementalContent;

const textOf = (doc: { content?: unknown[] }) => JSON.stringify(doc.content ?? []);

/** Same, minus the per-node ids, which are freshly generated on every conversion. */
const shapeOf = (doc: { content?: unknown[] }) => textOf(doc).replace(/"id":"node-[^"]*"/g, '"id":""');

describe("adopting content that was never wrapped in a channel", () => {
  it("opens the elements instead of a blank document", () => {
    const doc = convertElementalToTiptap(orphaned, { channel: "inbox" });
    expect(doc.content?.length ?? 0).toBeGreaterThan(0);
    expect(textOf(doc)).toContain("Your order shipped.");
  });

  it("does the same with no channel pinned", () => {
    expect(textOf(convertElementalToTiptap(orphaned))).toContain("Your order shipped.");
  });

  // Faithful to how it sends today: with no channel element, every top-level
  // element is visible on every channel.
  it("shows the same content whichever channel is opened", () => {
    const inbox = convertElementalToTiptap(orphaned, { channel: "inbox" });
    const email = convertElementalToTiptap(orphaned, { channel: "email" });
    expect(shapeOf(inbox)).toEqual(shapeOf(email));
  });

  it("saving moves them inside the channel and leaves nothing at the top level", () => {
    const elements = convertTiptapToElemental(
      convertElementalToTiptap(orphaned, { channel: "inbox" })
    );
    const saved = updateElemental(orphaned, { elements, channel: "inbox" });

    expect(saved.elements.every((element) => element.type === "channel")).toBe(true);
    expect(saved.elements).toHaveLength(1);
    expect(JSON.stringify(saved)).toContain("Your order shipped.");
  });

  // The repair has to hold: reopening the saved template must show the same thing.
  it("survives the round trip", () => {
    const elements = convertTiptapToElemental(
      convertElementalToTiptap(orphaned, { channel: "inbox" })
    );
    const saved = updateElemental(orphaned, { elements, channel: "inbox" });
    expect(textOf(convertElementalToTiptap(saved, { channel: "inbox" }))).toContain(
      "Your order shipped."
    );
  });
});

describe("what adoption must not touch", () => {
  it("a channel block still wins over top-level elements", () => {
    expect(textOf(convertElementalToTiptap(wrapped, { channel: "inbox" }))).toContain(
      "Already wrapped."
    );
  });

  // Asking for a channel the template has no block for is still an empty editor:
  // nothing has been written for that channel yet.
  it("still opens blank when another channel's block is the only one", () => {
    expect(convertElementalToTiptap(wrapped, { channel: "email" })).toEqual({
      type: "doc",
      content: [],
    });
  });

  // Already mixed content is separately broken. Rewriting it silently is a
  // different decision, so it is left exactly as it is.
  it("leaves an already-mixed document alone", () => {
    const mixed = {
      version: "2022-01-01",
      elements: [
        { type: "text", content: "Orphan." },
        { type: "channel", channel: "inbox", elements: [{ type: "text", content: "In channel." }] },
      ],
    } as unknown as ElementalContent;

    const saved = updateElemental(mixed, {
      elements: [{ type: "text", content: "Edited." }] as ElementalNode[],
      channel: "inbox",
    });
    expect(saved.elements.some((el) => el.type === "text")).toBe(true);
    expect(JSON.stringify(saved)).toContain("Orphan.");
  });

  // No elements to have adopted, so nothing may be dropped.
  it("keeps top-level elements on an attribute-only update", () => {
    const saved = updateElemental(orphaned, { channel: { channel: "inbox", locale: "es" } });
    expect(JSON.stringify(saved)).toContain("Your order shipped.");
  });

  it("still opens an empty template blank", () => {
    expect(
      convertElementalToTiptap({ version: "2022-01-01", elements: [] } as ElementalContent, {
        channel: "inbox",
      })
    ).toEqual({ type: "doc", content: [] });
  });
});
