import { describe, expect, it } from "vitest";
import { convertElementalToTiptap } from "./convertElementalToTiptap/convertElementalToTiptap";
import { convertTiptapToElemental } from "./convertTiptapToElemental/convertTiptapToElemental";
import type { ElementalContent, ElementalNode } from "@/types/elemental.types";
import type { TiptapDoc } from "./convertTiptapToElemental/convertTiptapToElemental";

const emailDoc = (elements: ElementalNode[]): ElementalContent => ({
  version: "2022-01-01",
  elements: [{ type: "channel", channel: "email", elements }],
});

const toTiptap = (elements: ElementalNode[]) =>
  convertElementalToTiptap(emailDoc(elements), { channel: "email" });

/** Round-trip a single block and hand back the Elemental node that comes out. */
const roundTrip = (element: ElementalNode): ElementalNode => {
  const tiptap = toTiptap([element]);
  return convertTiptapToElemental(tiptap as TiptapDoc)[0];
};

describe("font_size / line_height round-trip", () => {
  describe("text nodes", () => {
    it("preserves both on a plain text block", () => {
      const result = roundTrip({
        type: "text",
        content: "Hello",
        font_size: "24px",
        line_height: "34px",
      });

      expect(result).toMatchObject({
        type: "text",
        font_size: "24px",
        line_height: "34px",
      });
    });

    it("preserves a font size override on a heading tier", () => {
      const result = roundTrip({
        type: "text",
        content: "Big",
        text_style: "h1",
        font_size: "40px",
      });

      expect(result).toMatchObject({ text_style: "h1", font_size: "40px" });
    });

    it("resolves a unitless line height against the block font size", () => {
      const result = roundTrip({
        type: "text",
        content: "Hello",
        font_size: "20px",
        line_height: "1.5",
      });

      // 20 * 1.5 — stored and re-emitted as px, which is what Outlook honors
      expect(result).toMatchObject({ line_height: "30px" });
    });

    it("resolves a unitless line height against the tier preset when unsized", () => {
      const result = roundTrip({
        type: "text",
        content: "Hello",
        text_style: "h2",
        line_height: "2",
      });

      // h2 preset is 24px
      expect(result).toMatchObject({ line_height: "48px" });
    });

    it("emits neither property when the block has no override", () => {
      const result = roundTrip({ type: "text", content: "Hello" });

      expect(result).not.toHaveProperty("font_size");
      expect(result).not.toHaveProperty("line_height");
    });

    it("drops values the renderer would reject", () => {
      const result = roundTrip({
        type: "text",
        content: "Hello",
        font_size: "1.5em",
        line_height: "150%",
      });

      expect(result).not.toHaveProperty("font_size");
      expect(result).not.toHaveProperty("line_height");
    });

    it("preserves both on the elements-array text variant", () => {
      const result = roundTrip({
        type: "text",
        elements: [{ type: "string", content: "Hello" }],
        font_size: "18px",
        line_height: "26px",
      });

      expect(result).toMatchObject({ font_size: "18px", line_height: "26px" });
    });
  });

  describe("quote nodes", () => {
    it("preserves both", () => {
      const result = roundTrip({
        type: "quote",
        content: "Quoted",
        font_size: "20px",
        line_height: "30px",
      });

      expect(result).toMatchObject({
        type: "quote",
        font_size: "20px",
        line_height: "30px",
      });
    });

    it("resolves a unitless line height against the quote preset", () => {
      const result = roundTrip({
        type: "quote",
        content: "Quoted",
        line_height: "2",
      });

      // quote preset is 14px
      expect(result).toMatchObject({ line_height: "28px" });
    });
  });

  describe("list nodes", () => {
    it("preserves both on the list itself", () => {
      const result = roundTrip({
        type: "list",
        list_type: "unordered",
        font_size: "16px",
        line_height: "24px",
        elements: [{ type: "list-item", elements: [{ type: "string", content: "One" }] }],
      });

      expect(result).toMatchObject({
        type: "list",
        list_type: "unordered",
        font_size: "16px",
        line_height: "24px",
      });
    });
  });

  describe("action nodes", () => {
    it("preserves the label font size", () => {
      const result = roundTrip({
        type: "action",
        content: "Button",
        href: "https://example.com",
        font_size: "18px",
      });

      expect(result).toMatchObject({ type: "action", font_size: "18px" });
    });

    it("omits it when unset", () => {
      const result = roundTrip({
        type: "action",
        content: "Button",
        href: "https://example.com",
      });

      expect(result).not.toHaveProperty("font_size");
    });
  });

  describe("inline string runs", () => {
    it("preserves a per-run font size", () => {
      const result = roundTrip({
        type: "text",
        elements: [
          { type: "string", content: "normal " },
          { type: "string", content: "big run", font_size: "28px" },
        ],
      });

      expect(result).toMatchObject({
        elements: [
          { type: "string", content: "normal " },
          { type: "string", content: "big run", font_size: "28px" },
        ],
      });
    });

    it("keeps a per-run size alongside other marks", () => {
      const result = roundTrip({
        type: "text",
        elements: [{ type: "string", content: "bold and big", bold: true, font_size: "28px" }],
      });

      expect(result).toMatchObject({
        elements: [{ type: "string", content: "bold and big", bold: true, font_size: "28px" }],
      });
    });

    it("keeps a per-run size on a link", () => {
      const result = roundTrip({
        type: "text",
        elements: [
          {
            type: "link",
            content: "click",
            href: "https://example.com",
            font_size: "22px",
          },
        ],
      });

      expect(result).toMatchObject({
        elements: [{ type: "link", content: "click", font_size: "22px" }],
      });
    });

    it("does not merge adjacent runs that differ only in size", () => {
      const result = roundTrip({
        type: "text",
        elements: [
          { type: "string", content: "small" },
          { type: "string", content: "large", font_size: "30px" },
        ],
      }) as { elements: unknown[] };

      expect(result.elements).toHaveLength(2);
    });

    it("drops a per-run size the renderer would reject", () => {
      const result = roundTrip({
        type: "text",
        elements: [{ type: "string", content: "text", font_size: "2em" }],
      });

      expect(result).toMatchObject({
        elements: [{ type: "string", content: "text" }],
      });
      expect((result as { elements: Record<string, unknown>[] }).elements[0]).not.toHaveProperty(
        "font_size"
      );
    });
  });

  describe("document-level channel properties", () => {
    it("are left untouched by the block converters", () => {
      // The email channel node is not part of the TipTap document — it is
      // updated in place by useEmailDocumentStyles — so converting its children
      // must never invent or drop these.
      const tiptap = toTiptap([{ type: "text", content: "Hello" }]);
      const elements = convertTiptapToElemental(tiptap as TiptapDoc);

      expect(elements.every((el) => el.type !== "channel")).toBe(true);
    });
  });
});
