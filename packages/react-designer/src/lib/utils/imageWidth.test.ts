import { describe, expect, it } from "vitest";
import { convertElementalToTiptap } from "./convertElementalToTiptap/convertElementalToTiptap";
import { convertTiptapToElemental } from "./convertTiptapToElemental/convertTiptapToElemental";
import type { ElementalContent } from "@/types/elemental.types";

const imageContent = (image: Record<string, unknown>): ElementalContent => ({
  version: "2022-01-01",
  elements: [
    {
      type: "channel",
      channel: "email",
      elements: [image as never],
    },
  ],
});

/**
 * The stored default is `width: 1`, so an image that arrives without one was
 * saved back as `"width":"1%"` — a sliver on the canvas and in the sent email.
 * An image with no width is full width, which is what it renders as everywhere
 * that has no width to apply.
 */
describe("an image that arrives with no width", () => {
  it("loads as full width", () => {
    const doc = convertElementalToTiptap(
      imageContent({ type: "image", src: "{{data.hero}}" }),
      { channel: "email" }
    );
    const image = doc.content?.[0];
    expect(image?.type).toBe("imageBlock");
    expect(image?.attrs?.width).toBe(100);
  });

  it("does not save 1%", () => {
    const doc = convertElementalToTiptap(
      imageContent({ type: "image", src: "https://example.com/favicon.png" }),
      { channel: "email" }
    );
    const [saved] = convertTiptapToElemental(doc as never);
    expect(saved).toMatchObject({ type: "image" });
    expect((saved as { width?: string }).width).not.toBe("1%");
  });

  it("keeps a width that was stored", () => {
    const doc = convertElementalToTiptap(
      imageContent({ type: "image", src: "https://example.com/a.png", width: "40%" }),
      { channel: "email" }
    );
    expect(doc.content?.[0]?.attrs?.width).toBe(40);
  });
});
