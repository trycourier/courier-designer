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
 * Opening a template and saving it without editing must not change a single
 * byte of its text — an unasked-for diff is a change to someone's template,
 * and for a template written through the API a bare `&` or `<` is how it was
 * meant to be stored.
 *
 * This is why the canvas does not decode entities: decoding on load and
 * storing the decoded string lost a level per cycle (`&amp;amp;lt;` became
 * `&amp;lt;`, then `&lt;`), and re-encoding on save fixed that at the cost of
 * rewriting every plain `&` and `<` into an entity on first save.
 */
describe("text is byte-identical across an unedited open and save", () => {
  it("leaves both plain and encoded text exactly as stored", () => {
    for (const stored of [
      "Tom & Jerry",
      "a < b",
      "a > b",
      "&amp;amp;lt;",
      "&amp;lt;",
      "&lt;b&gt;",
      "a &amp; b",
    ]) {
      expect(roundTrip(stored), stored).toBe(stored);
    }
  });

  it("is still identical after three cycles", () => {
    for (const stored of ["Tom & Jerry", "a < b", "&amp;amp;lt;"]) {
      let content = stored;
      for (let cycle = 0; cycle < 3; cycle++) content = roundTrip(content) ?? "";
      expect(content, stored).toBe(stored);
    }
  });

  it("stores what the author typed, as typed", () => {
    const doc = convertElementalToTiptap(withText("plain"), { channel: "email" });
    const paragraph = (doc.content as Array<Record<string, unknown>>)[0];
    (paragraph.content as Array<Record<string, unknown>>)[0].text = "a < b & c";
    const [saved] = convertTiptapToElemental(doc as never);
    expect(storedText(saved)).toBe("a < b & c");
  });
});
