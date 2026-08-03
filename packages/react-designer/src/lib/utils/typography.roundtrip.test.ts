import { describe, expect, it } from "vitest";
import { convertElementalToTiptap } from "./convertElementalToTiptap/convertElementalToTiptap";
import { convertTiptapToElemental } from "./convertTiptapToElemental/convertTiptapToElemental";
import type { ElementalContent, ElementalNode } from "@/types/elemental.types";
import type { TiptapDoc } from "./convertTiptapToElemental/convertTiptapToElemental";

const emailDoc = (
  elements: ElementalNode[],
  channelProps: Record<string, string> = {}
): ElementalContent => ({
  version: "2022-01-01",
  elements: [{ type: "channel", channel: "email", ...channelProps, elements }],
});

const toTiptap = (elements: ElementalNode[], channelProps: Record<string, string> = {}) =>
  convertElementalToTiptap(emailDoc(elements, channelProps), { channel: "email" });

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

  describe("unitless line height resolves against the effective font size", () => {
    // The renderer resolves a block's line height against the size that block
    // actually renders at: its own font_size, else the document base (body tiers
    // only), else the tier preset. Resolving against the preset while a document
    // base is in force both mis-renders the canvas AND rewrites the stored value
    // to the wrong px on the next save.
    const roundTripWithBase = (element: ElementalNode, channelProps: Record<string, string>) =>
      convertTiptapToElemental(toTiptap([element], channelProps) as TiptapDoc)[0];

    it("uses the document base for a text block with no size of its own", () => {
      const result = roundTripWithBase(
        { type: "text", content: "Hi", line_height: "1.5" },
        { font_size: "20px" }
      );

      // 1.5 x 20 (the document base), NOT 1.5 x 14 (the tier preset)
      expect(result).toMatchObject({ line_height: "30px" });
    });

    it("prefers the block's own size over the document base", () => {
      const result = roundTripWithBase(
        { type: "text", content: "Hi", font_size: "40px", line_height: "1.5" },
        { font_size: "20px" }
      );

      expect(result).toMatchObject({ line_height: "60px" });
    });

    it("keeps headings on their preset, since the document base skips them", () => {
      const result = roundTripWithBase(
        { type: "text", content: "Hi", text_style: "h2", line_height: "2" },
        { font_size: "20px" }
      );

      // h2 preset is 24px, so 48 — the base must not reach this tier
      expect(result).toMatchObject({ line_height: "48px" });
    });

    it("uses the document base for a list", () => {
      const result = roundTripWithBase(
        {
          type: "list",
          list_type: "unordered",
          line_height: "1.5",
          elements: [{ type: "list-item", elements: [{ type: "string", content: "One" }] }],
        },
        { font_size: "20px" }
      );

      expect(result).toMatchObject({ line_height: "30px" });
    });
  });

  describe("unknown text_style degrades instead of crashing", () => {
    // text_style is only validated on the /send path, so a template can carry
    // anything. Indexing the preset tables with an unrecognized tier used to
    // throw and take the whole document conversion down with it.
    it("converts a text node with an out-of-enum text_style", () => {
      expect(() =>
        toTiptap([
          {
            type: "text",
            content: "Hi",
            text_style: "h4" as never,
            line_height: "1.5",
          },
        ])
      ).not.toThrow();
    });

    it("falls back to the body tier for the unknown tier's line height", () => {
      const result = roundTrip({
        type: "text",
        content: "Hi",
        text_style: "h4" as never,
        line_height: "2",
      });

      // text preset is 14px
      expect(result).toMatchObject({ line_height: "28px" });
    });

    it("converts a quote with an out-of-enum text_style", () => {
      expect(() =>
        toTiptap([
          { type: "quote", content: "Hi", text_style: "display" as never, line_height: "1.5" },
        ])
      ).not.toThrow();
    });
  });

  describe("document-level channel properties", () => {
    it("survive on the channel node when the content round-trips", () => {
      // The converters only own the channel's children; the channel node itself
      // is updated in place by useEmailDocumentStyles, so these must be
      // untouched by a content round-trip.
      const doc = emailDoc([{ type: "text", content: "Hi" }], {
        padding: "12px 40px",
        font_size: "18px",
        line_height: "27px",
      });

      const channel = doc.elements[0] as ElementalNode & Record<string, unknown>;
      expect(channel.padding).toBe("12px 40px");
      expect(channel.font_size).toBe("18px");
      expect(channel.line_height).toBe("27px");
    });

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
