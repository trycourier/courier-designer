import { describe, expect, it } from "vitest";
import { convertElementalToTiptap } from "./convertElementalToTiptap/convertElementalToTiptap";
import { convertTiptapToElemental } from "./convertTiptapToElemental/convertTiptapToElemental";
import type { ElementalContent } from "@/types/elemental.types";

const withText = (content: string): ElementalContent => ({
  version: "2022-01-01",
  elements: [
    {
      type: "channel",
      channel: "email",
      elements: [{ type: "text", content } as never],
    },
  ],
});

const storedText = (element: unknown) => {
  const el = element as { elements?: Array<{ content?: string }>; content?: string };
  return el.elements?.map((child) => child.content ?? "").join("") ?? el.content;
};

const roundTrip = (content: string) => {
  const doc = convertElementalToTiptap(withText(content), { channel: "email" });
  const [saved] = convertTiptapToElemental(doc as never);
  return storedText(saved);
};

/**
 * The canvas shows entity-decoded text, because that is what the send renders.
 * Saving has to put the level back: decoding on load and storing the decoded
 * string lost one level per open and save, so `&amp;amp;lt;` became
 * `&amp;lt;`, then `&lt;`, and eventually markup.
 */
describe("entities survive open and save", () => {
  it("keeps the stored level", () => {
    for (const stored of ["&amp;amp;lt;", "&amp;lt;", "&lt;b&gt;", "a &amp; b"]) {
      expect(roundTrip(stored), stored).toBe(stored);
    }
  });

  it("is stable over repeated open and save", () => {
    let content = "&amp;amp;lt;";
    for (let i = 0; i < 3; i++) content = roundTrip(content) ?? "";
    expect(content).toBe("&amp;amp;lt;");
  });

  it("stores a character the author typed at the level the send expects", () => {
    // Typed `<` has to reach the reader as `<`, which means storing `&lt;`.
    const doc = convertElementalToTiptap(withText("plain"), { channel: "email" });
    const paragraph = (doc.content as Array<Record<string, unknown>>)[0];
    (paragraph.content as Array<Record<string, unknown>>)[0].text = "a < b & c";
    const [saved] = convertTiptapToElemental(doc as never);
    expect(storedText(saved)).toBe("a &lt; b &amp; c");
  });
});
