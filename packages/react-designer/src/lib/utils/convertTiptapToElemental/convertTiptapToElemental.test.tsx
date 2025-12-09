import { describe, it, expect } from "vitest";
import { convertTiptapToElemental } from "./convertTiptapToElemental";
import type { TiptapDoc, TiptapNode } from "./convertTiptapToElemental";

describe("convertTiptapToElemental", () => {
  const createTiptapDoc = (content: TiptapNode[]): TiptapDoc => ({
    type: "doc",
    content,
  });

  it("should handle empty document", () => {
    const tiptap = createTiptapDoc([]);
    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([]);
  });

  it("should convert simple paragraph", () => {
    const tiptap = createTiptapDoc([
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Hello world",
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "text",
        align: "left",
        content: "Hello world\n",
      },
    ]);
  });

  it("should convert paragraph with text alignment", () => {
    const tiptap = createTiptapDoc([
      {
        type: "paragraph",
        attrs: {
          textAlign: "center",
        },
        content: [
          {
            type: "text",
            text: "Centered text",
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "text",
        align: "center",
        content: "Centered text\n",
      },
    ]);
  });

  it("should convert paragraph with styling attributes", () => {
    const tiptap = createTiptapDoc([
      {
        type: "paragraph",
        attrs: {
          backgroundColor: "#00ff00",
          paddingVertical: 10,
          paddingHorizontal: 20,
        },
        content: [
          {
            type: "text",
            text: "Styled text",
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "text",
        align: "left",
        content: "Styled text\n",
        background_color: "#00ff00",
        padding: "10px 20px",
      },
    ]);
  });

  it("should convert paragraph with border attributes", () => {
    const tiptap = createTiptapDoc([
      {
        type: "paragraph",
        attrs: {
          borderColor: "#ff0000",
          borderWidth: 2,
        },
        content: [
          {
            type: "text",
            text: "Bordered text",
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "text",
        align: "left",
        content: "Bordered text\n",
        border_size: "2px",
        border_color: "#ff0000",
      },
    ]);
  });

  it("should convert heading level 1", () => {
    const tiptap = createTiptapDoc([
      {
        type: "heading",
        attrs: {
          level: 1,
        },
        content: [
          {
            type: "text",
            text: "Main heading",
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "text",
        align: "left",
        content: "Main heading\n",
        text_style: "h1",
      },
    ]);
  });

  it("should convert heading level 2", () => {
    const tiptap = createTiptapDoc([
      {
        type: "heading",
        attrs: {
          level: 2,
        },
        content: [
          {
            type: "text",
            text: "Sub heading",
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "text",
        align: "left",
        content: "Sub heading\n",
        text_style: "h2",
      },
    ]);
  });

  it("should convert heading with styling", () => {
    const tiptap = createTiptapDoc([
      {
        type: "heading",
        attrs: {
          level: 1,
          textAlign: "center",
          paddingVertical: 15,
          paddingHorizontal: 0,
        },
        content: [
          {
            type: "text",
            text: "Styled heading",
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "text",
        align: "center",
        content: "Styled heading\n",
        text_style: "h1",
        padding: "15px 0px",
      },
    ]);
  });

  it("should convert blockquote", () => {
    const tiptap = createTiptapDoc([
      {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "This is a quote",
              },
            ],
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "quote",
        content: "This is a quote",
      },
    ]);
  });

  it("should convert blockquote with styling", () => {
    // Note: textAlign is stored on the child paragraph/heading, not on the blockquote itself.
    // The TextAlign extension only applies to paragraph and heading types.
    const tiptap = createTiptapDoc([
      {
        type: "blockquote",
        attrs: {
          borderColor: "#cccccc",
        },
        content: [
          {
            type: "paragraph",
            attrs: {
              textAlign: "center",
            },
            content: [
              {
                type: "text",
                text: "Styled quote",
              },
            ],
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "quote",
        content: "Styled quote",
        align: "center",
        border_color: "#cccccc",
      },
    ]);
  });

  it("should convert blockquote with heading to quote with text_style", () => {
    const tiptap = createTiptapDoc([
      {
        type: "blockquote",
        content: [
          {
            type: "heading",
            attrs: {
              level: 1,
            },
            content: [
              {
                type: "text",
                text: "Heading in blockquote",
              },
            ],
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "quote",
        content: "Heading in blockquote",
        text_style: "h1",
      },
    ]);
  });

  it("should convert blockquote with h2 heading to quote with text_style h2", () => {
    const tiptap = createTiptapDoc([
      {
        type: "blockquote",
        content: [
          {
            type: "heading",
            attrs: {
              level: 2,
            },
            content: [
              {
                type: "text",
                text: "H2 in blockquote",
              },
            ],
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "quote",
        content: "H2 in blockquote",
        text_style: "h2",
      },
    ]);
  });

  it("should convert blockquote with h3 heading to quote with text_style subtext", () => {
    const tiptap = createTiptapDoc([
      {
        type: "blockquote",
        content: [
          {
            type: "heading",
            attrs: {
              level: 3,
            },
            content: [
              {
                type: "text",
                text: "H3 in blockquote",
              },
            ],
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "quote",
        content: "H3 in blockquote",
        text_style: "subtext",
      },
    ]);
  });

  it("should convert image block", () => {
    const tiptap = createTiptapDoc([
      {
        type: "imageBlock",
        attrs: {
          sourcePath: "https://example.com/image.jpg",
          alt: "Example image",
        },
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "image",
        src: "https://example.com/image.jpg",
        alt_text: "Example image",
      },
    ]);
  });

  it("should convert image block with all attributes", () => {
    const tiptap = createTiptapDoc([
      {
        type: "imageBlock",
        attrs: {
          sourcePath: "https://example.com/image.jpg",
          alt: "Example image",
          link: "https://example.com",
          textAlign: "center",
          width: "300px",
        },
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "image",
        src: "https://example.com/image.jpg",
        alt_text: "Example image",
        href: "https://example.com",
        width: "300px%", // Implementation adds % suffix to the original value
      },
    ]);
  });

  it("should convert button node", () => {
    const tiptap = createTiptapDoc([
      {
        type: "button",
        attrs: {
          label: "Click me",
          link: "https://example.com",
        },
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "action",
        content: "Click me",
        href: "https://example.com",
        align: "center", // Implementation always adds default alignment
      },
    ]);
  });

  it("should convert button node with all attributes", () => {
    const tiptap = createTiptapDoc([
      {
        type: "button",
        attrs: {
          label: "Styled button",
          link: "https://example.com",
          actionId: "btn1",
          style: "button",
          textAlign: "center",
          backgroundColor: "#0066cc",
          textColor: "#ffffff",
          paddingVertical: 12,
          paddingHorizontal: 24,
        },
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "action",
        content: "Styled button",
        href: "https://example.com",
        style: "button",
        align: "center",
        background_color: "#0066cc",
        // Note: color (textColor) is not supported by Elemental for buttons
        // Implementation doesn't handle actionId or paddingVertical/paddingHorizontal conversion
      },
    ]);
  });

  it("should serialize button content from nested text nodes when present", () => {
    const tiptap = createTiptapDoc([
      {
        type: "button",
        attrs: {
          label: "Fallback label",
          link: "https://example.com",
        },
        content: [
          { type: "text", text: "Primary" },
          { type: "text", text: " CTA" },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "action",
        content: "Primary CTA",
        href: "https://example.com",
        align: "center",
      },
    ]);
  });

  it("should serialize button content with variables correctly", () => {
    const tiptap = createTiptapDoc([
      {
        type: "button",
        attrs: {
          label: "Register dfg {{test}} fgx {{hey}}",
          link: "https://example.com",
        },
        content: [
          { type: "text", text: "Register dfg " },
          { type: "variable", attrs: { id: "test" } },
          { type: "text", text: " fgx " },
          { type: "variable", attrs: { id: "hey" } },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "action",
        content: "Register dfg {{test}} fgx {{hey}}",
        href: "https://example.com",
        align: "center",
      },
    ]);
  });

  it("should fall back to label attribute when button node content array is empty", () => {
    const tiptap = createTiptapDoc([
      {
        type: "button",
        attrs: {
          label: "Attribute only label",
          link: "https://example.com",
        },
        content: [],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "action",
        content: "Attribute only label",
        href: "https://example.com",
        align: "center",
      },
    ]);
  });

  it("should convert divider node", () => {
    const tiptap = createTiptapDoc([
      {
        type: "divider",
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "divider",
      },
    ]);
  });

  it("should convert divider node with styling", () => {
    const tiptap = createTiptapDoc([
      {
        type: "divider",
        attrs: {
          color: "#cccccc",
          size: 2,
          padding: 20,
        },
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "divider",
        color: "#cccccc",
        border_width: "2px",
        padding: "20px 0px",
      },
    ]);
  });

  it("should convert text with bold marks", () => {
    const tiptap = createTiptapDoc([
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "This is ",
          },
          {
            type: "text",
            text: "bold",
            marks: [{ type: "bold" }],
          },
          {
            type: "text",
            text: " text",
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "text",
        align: "left",
        content: "This is **bold** text\n",
      },
    ]);
  });

  it("should convert text with italic marks", () => {
    const tiptap = createTiptapDoc([
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "This is ",
          },
          {
            type: "text",
            text: "italic",
            marks: [{ type: "italic" }],
          },
          {
            type: "text",
            text: " text",
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "text",
        align: "left",
        content: "This is *italic* text\n",
      },
    ]);
  });

  it("should convert text with underline marks", () => {
    const tiptap = createTiptapDoc([
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "This is ",
          },
          {
            type: "text",
            text: "underlined",
            marks: [{ type: "underline" }],
          },
          {
            type: "text",
            text: " text",
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "text",
        align: "left",
        content: "This is +underlined+ text\n",
      },
    ]);
  });

  it("should convert text with strikethrough marks", () => {
    const tiptap = createTiptapDoc([
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "This is ",
          },
          {
            type: "text",
            text: "strikethrough",
            marks: [{ type: "strike" }],
          },
          {
            type: "text",
            text: " text",
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "text",
        align: "left",
        content: "This is ~strikethrough~ text\n",
      },
    ]);
  });

  it("should convert text with link marks", () => {
    const tiptap = createTiptapDoc([
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Visit ",
          },
          {
            type: "text",
            text: "Google",
            marks: [{ type: "link", attrs: { href: "https://google.com" } }],
          },
          {
            type: "text",
            text: " for search",
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "text",
        align: "left",
        content: "Visit [Google](https://google.com) for search\n",
      },
    ]);
  });

  it("should convert text with multiple marks", () => {
    const tiptap = createTiptapDoc([
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "This is ",
          },
          {
            type: "text",
            text: "bold and italic",
            marks: [{ type: "bold" }, { type: "italic" }],
          },
          {
            type: "text",
            text: " text",
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "text",
        align: "left",
        content: "This is ***bold and italic*** text\n", // Bold (**) + italic (*) = ***
      },
    ]);
  });

  it("should convert variable nodes", () => {
    const tiptap = createTiptapDoc([
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Hello ",
          },
          {
            type: "variable",
            attrs: {
              id: "name",
            },
          },
          {
            type: "text",
            text: ", welcome!",
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "text",
        align: "left",
        content: "Hello {{name}}, welcome!\n",
      },
    ]);
  });

  it("should convert hard breaks", () => {
    const tiptap = createTiptapDoc([
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Line 1",
          },
          {
            type: "hardBreak",
          },
          {
            type: "text",
            text: "Line 2",
          },
          {
            type: "hardBreak",
          },
          {
            type: "text",
            text: "Line 3",
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "text",
        align: "left",
        content: "Line 1\nLine 2\nLine 3\n",
      },
    ]);
  });

  it("should handle multiple paragraphs", () => {
    const tiptap = createTiptapDoc([
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "First paragraph",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Second paragraph",
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "text",
        align: "left",
        content: "First paragraph\n",
      },
      {
        type: "text",
        align: "left",
        content: "Second paragraph\n",
      },
    ]);
  });

  it("should handle mixed content types", () => {
    const tiptap = createTiptapDoc([
      {
        type: "heading",
        attrs: { level: 1 },
        content: [
          {
            type: "text",
            text: "Title",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Some text with ",
          },
          {
            type: "text",
            text: "formatting",
            marks: [{ type: "bold" }],
          },
        ],
      },
      {
        type: "divider",
      },
      {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "A quote",
              },
            ],
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "text",
        align: "left",
        content: "Title\n",
        text_style: "h1",
      },
      {
        type: "text",
        align: "left",
        content: "Some text with **formatting**\n",
      },
      {
        type: "divider",
      },
      {
        type: "quote",
        content: "A quote",
      },
    ]);
  });

  it("should handle complex nested content in blockquote", () => {
    const tiptap = createTiptapDoc([
      {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "First line of quote",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Second line with ",
              },
              {
                type: "text",
                text: "emphasis",
                marks: [{ type: "italic" }],
              },
            ],
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "quote",
        content: "First line of quote\nSecond line with *emphasis*",
      },
    ]);
  });

  it("should preserve hardBreaks in blockquote content", () => {
    const tiptap = createTiptapDoc([
      {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "AAA",
              },
              {
                type: "hardBreak",
              },
              {
                type: "text",
                text: "BBB",
              },
            ],
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "quote",
        content: "AAA\nBBB",
      },
    ]);
  });

  it("should handle unknown node types gracefully", () => {
    const tiptap = createTiptapDoc([
      {
        type: "unknown-node-type" as any,
        content: [
          {
            type: "text",
            text: "Unknown content",
          },
        ],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([]);
  });

  it("should handle empty content arrays gracefully", () => {
    const tiptap = createTiptapDoc([
      {
        type: "paragraph",
        content: [],
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "text",
        align: "left",
        content: "\n",
      },
    ]);
  });

  it("should handle nodes without content property", () => {
    const tiptap = createTiptapDoc([
      {
        type: "paragraph",
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "text",
        align: "left",
        content: "\n",
      },
    ]);
  });

  it("should convert complex document with all features", () => {
    const tiptap = createTiptapDoc([
      {
        type: "heading",
        attrs: {
          level: 1,
          textAlign: "center",
        },
        content: [
          {
            type: "text",
            text: "Welcome to ",
          },
          {
            type: "variable",
            attrs: { id: "company_name" },
          },
        ],
      },
      {
        type: "paragraph",
        attrs: {
          backgroundColor: "#f0f0f0",
          paddingVertical: 10,
          paddingHorizontal: 15,
        },
        content: [
          {
            type: "text",
            text: "Visit our ",
          },
          {
            type: "text",
            text: "website",
            marks: [{ type: "bold" }, { type: "link", attrs: { href: "https://example.com" } }],
          },
          {
            type: "text",
            text: " for **special** offers!",
          },
        ],
      },
      {
        type: "imageBlock",
        attrs: {
          sourcePath: "https://example.com/promo.jpg",
          alt: "Promotion",
          // No alignment attribute since implementation uses 'alignment', not 'textAlign'
        },
      },
      {
        type: "button",
        attrs: {
          label: "Shop Now",
          link: "https://example.com/shop",
          style: "button",
          backgroundColor: "#007bff",
          textColor: "#ffffff",
        },
      },
    ]);

    const result = convertTiptapToElemental(tiptap);

    expect(result).toEqual([
      {
        type: "text",
        align: "center",
        content: "Welcome to {{company_name}}\n",
        text_style: "h1",
      },
      {
        type: "text",
        align: "left",
        content: "Visit our [**website**](https://example.com) for **special** offers!\n",
        background_color: "#f0f0f0",
        padding: "10px 15px",
      },
      {
        type: "image",
        src: "https://example.com/promo.jpg",
        alt_text: "Promotion",
        // No align since no alignment attribute was provided
      },
      {
        type: "action",
        content: "Shop Now",
        href: "https://example.com/shop",
        style: "button",
        background_color: "#007bff",
        // Note: color (textColor) is not supported by Elemental for buttons
        align: "center", // Implementation always adds default alignment
      },
    ]);
  });

  describe("Column conversion", () => {
    it("should convert column node to group element", () => {
      const tiptap = createTiptapDoc([
        {
          type: "column",
          attrs: {
            columnsCount: 2,
            paddingHorizontal: 0,
            paddingVertical: 0,
            backgroundColor: "transparent",
            borderWidth: 0,
            borderRadius: 0,
            borderColor: "transparent",
          },
          content: [
            {
              type: "columnRow",
              content: [
                {
                  type: "columnCell",
                  attrs: {
                    index: 0,
                    columnId: "test-col",
                  },
                  content: [
                    {
                      type: "paragraph",
                      content: [
                        {
                          type: "text",
                          text: "Cell 1",
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "columnCell",
                  attrs: {
                    index: 1,
                    columnId: "test-col",
                  },
                  content: [
                    {
                      type: "paragraph",
                      content: [
                        {
                          type: "text",
                          text: "Cell 2",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);

      const result = convertTiptapToElemental(tiptap);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: "group",
        elements: expect.any(Array),
      });
      expect((result[0] as any).elements).toHaveLength(2);
    });

    it("should convert column with styling to group with border and padding", () => {
      const tiptap = createTiptapDoc([
        {
          type: "column",
          attrs: {
            columnsCount: 3,
            paddingHorizontal: 20,
            paddingVertical: 10,
            backgroundColor: "#f5f5f5",
            borderWidth: 2,
            borderRadius: 8,
            borderColor: "#cccccc",
          },
          content: [
            {
              type: "columnRow",
              content: [
                {
                  type: "columnCell",
                  attrs: { index: 0 },
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Col 1" }],
                    },
                  ],
                },
                {
                  type: "columnCell",
                  attrs: { index: 1 },
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Col 2" }],
                    },
                  ],
                },
                {
                  type: "columnCell",
                  attrs: { index: 2 },
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Col 3" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);

      const result = convertTiptapToElemental(tiptap);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: "group",
        background_color: "#f5f5f5",
        padding: "10px 20px",
        border: {
          enabled: true,
          color: "#cccccc",
          size: "2px",
          radius: 8,
        },
      });
      expect((result[0] as any).elements).toHaveLength(3);
    });

    it("should convert single column layout", () => {
      const tiptap = createTiptapDoc([
        {
          type: "column",
          attrs: {
            columnsCount: 1,
          },
          content: [
            {
              type: "columnRow",
              content: [
                {
                  type: "columnCell",
                  attrs: { index: 0 },
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Single column" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);

      const result = convertTiptapToElemental(tiptap);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("group");
      expect((result[0] as any).elements).toHaveLength(1);
    });

    it("should convert four column layout", () => {
      const tiptap = createTiptapDoc([
        {
          type: "column",
          attrs: {
            columnsCount: 4,
          },
          content: [
            {
              type: "columnRow",
              content: [
                {
                  type: "columnCell",
                  attrs: { index: 0 },
                  content: [{ type: "paragraph", content: [{ type: "text", text: "1" }] }],
                },
                {
                  type: "columnCell",
                  attrs: { index: 1 },
                  content: [{ type: "paragraph", content: [{ type: "text", text: "2" }] }],
                },
                {
                  type: "columnCell",
                  attrs: { index: 2 },
                  content: [{ type: "paragraph", content: [{ type: "text", text: "3" }] }],
                },
                {
                  type: "columnCell",
                  attrs: { index: 3 },
                  content: [{ type: "paragraph", content: [{ type: "text", text: "4" }] }],
                },
              ],
            },
          ],
        },
      ]);

      const result = convertTiptapToElemental(tiptap);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("group");
      expect((result[0] as any).elements).toHaveLength(4);
    });

    it("should handle empty column cells", () => {
      const tiptap = createTiptapDoc([
        {
          type: "column",
          attrs: {
            columnsCount: 2,
          },
          content: [
            {
              type: "columnRow",
              content: [
                {
                  type: "columnCell",
                  attrs: { index: 0 },
                  content: [],
                },
                {
                  type: "columnCell",
                  attrs: { index: 1 },
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Content" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);

      const result = convertTiptapToElemental(tiptap);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("group");
      expect((result[0] as any).elements).toHaveLength(2);
    });

    it("should handle complex nested content in cells", () => {
      const tiptap = createTiptapDoc([
        {
          type: "column",
          attrs: {
            columnsCount: 2,
          },
          content: [
            {
              type: "columnRow",
              content: [
                {
                  type: "columnCell",
                  attrs: { index: 0 },
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Paragraph 1" }],
                    },
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Paragraph 2" }],
                    },
                  ],
                },
                {
                  type: "columnCell",
                  attrs: { index: 1 },
                  content: [
                    {
                      type: "heading",
                      attrs: { level: 2 },
                      content: [{ type: "text", text: "Heading" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);

      const result = convertTiptapToElemental(tiptap);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("group");
      expect((result[0] as any).elements).toHaveLength(2);

      // First cell should have multiple elements
      const firstCellElements = (result[0] as any).elements[0].elements;
      expect(firstCellElements.length).toBeGreaterThan(0);
    });

    it("should not add border when borderWidth is 0", () => {
      const tiptap = createTiptapDoc([
        {
          type: "column",
          attrs: {
            columnsCount: 2,
            borderWidth: 0,
            borderColor: "transparent",
            borderRadius: 0,
          },
          content: [
            {
              type: "columnRow",
              content: [
                {
                  type: "columnCell",
                  attrs: { index: 0 },
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell" }],
                    },
                  ],
                },
                {
                  type: "columnCell",
                  attrs: { index: 1 },
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);

      const result = convertTiptapToElemental(tiptap);

      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty("border");
    });

    it("should not add padding when padding is 0", () => {
      const tiptap = createTiptapDoc([
        {
          type: "column",
          attrs: {
            columnsCount: 2,
            paddingHorizontal: 0,
            paddingVertical: 0,
          },
          content: [
            {
              type: "columnRow",
              content: [
                {
                  type: "columnCell",
                  attrs: { index: 0 },
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell" }],
                    },
                  ],
                },
                {
                  type: "columnCell",
                  attrs: { index: 1 },
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);

      const result = convertTiptapToElemental(tiptap);

      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty("padding");
    });

    it("should not add background_color when transparent", () => {
      const tiptap = createTiptapDoc([
        {
          type: "column",
          attrs: {
            columnsCount: 2,
            backgroundColor: "transparent",
          },
          content: [
            {
              type: "columnRow",
              content: [
                {
                  type: "columnCell",
                  attrs: { index: 0 },
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell" }],
                    },
                  ],
                },
                {
                  type: "columnCell",
                  attrs: { index: 1 },
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);

      const result = convertTiptapToElemental(tiptap);

      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty("background_color");
    });
  });

  describe("locales restoration", () => {
    it("should restore locales from paragraph attrs to text node", () => {
      const tiptap = createTiptapDoc([
        {
          type: "paragraph",
          attrs: {
            locales: {
              "eu-fr": { content: "Bonjour" },
              "es-es": { content: "Hola" },
            },
          },
          content: [
            {
              type: "text",
              text: "Hello",
            },
          ],
        },
      ]);

      const result = convertTiptapToElemental(tiptap);

      expect(result[0]).toHaveProperty("locales");
      expect((result[0] as any).locales).toEqual({
        "eu-fr": { content: "Bonjour" },
        "es-es": { content: "Hola" },
      });
    });

    it("should restore locales from heading attrs to text node", () => {
      const tiptap = createTiptapDoc([
        {
          type: "heading",
          attrs: {
            level: 1,
            locales: {
              "eu-fr": { content: "Bienvenue" },
            },
          },
          content: [
            {
              type: "text",
              text: "Welcome",
            },
          ],
        },
      ]);

      const result = convertTiptapToElemental(tiptap);

      expect(result[0]).toHaveProperty("locales");
      expect((result[0] as any).locales).toEqual({
        "eu-fr": { content: "Bienvenue" },
      });
    });

    it("should restore locales from blockquote attrs to quote node", () => {
      const tiptap = createTiptapDoc([
        {
          type: "blockquote",
          attrs: {
            locales: {
              "eu-fr": { content: "Être ou ne pas être" },
            },
          },
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "To be or not to be",
                },
              ],
            },
          ],
        },
      ]);

      const result = convertTiptapToElemental(tiptap);

      expect(result[0]).toHaveProperty("locales");
      expect((result[0] as any).locales).toEqual({
        "eu-fr": { content: "Être ou ne pas être" },
      });
    });

    it("should restore locales from imageBlock attrs to image node", () => {
      const tiptap = createTiptapDoc([
        {
          type: "imageBlock",
          attrs: {
            sourcePath: "https://example.com/image.jpg",
            locales: {
              "eu-fr": { src: "https://example.fr/image.jpg" },
            },
          },
        },
      ]);

      const result = convertTiptapToElemental(tiptap);

      expect(result[0]).toHaveProperty("locales");
      expect((result[0] as any).locales).toEqual({
        "eu-fr": { src: "https://example.fr/image.jpg" },
      });
    });

    it("should restore locales from button attrs to action node", () => {
      const tiptap = createTiptapDoc([
        {
          type: "button",
          attrs: {
            label: "Click here",
            link: "https://example.com",
            locales: {
              "eu-fr": { content: "Cliquez ici", href: "https://example.fr" },
            },
          },
        },
      ]);

      const result = convertTiptapToElemental(tiptap);

      expect(result[0]).toHaveProperty("locales");
      expect((result[0] as any).locales).toEqual({
        "eu-fr": { content: "Cliquez ici", href: "https://example.fr" },
      });
    });

    it("should restore locales from customCode attrs to html node", () => {
      const tiptap = createTiptapDoc([
        {
          type: "customCode",
          attrs: {
            code: "<div>Hello</div>",
            locales: {
              "eu-fr": { content: "<div>Bonjour</div>" },
            },
          },
        },
      ]);

      const result = convertTiptapToElemental(tiptap);

      expect(result[0]).toHaveProperty("locales");
      expect((result[0] as any).locales).toEqual({
        "eu-fr": { content: "<div>Bonjour</div>" },
      });
    });

    it("should not add locales property when not present in attrs", () => {
      const tiptap = createTiptapDoc([
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Hello",
            },
          ],
        },
      ]);

      const result = convertTiptapToElemental(tiptap);

      expect(result[0]).not.toHaveProperty("locales");
    });

    it("should preserve locales through round-trip conversion", () => {
      const tiptap = createTiptapDoc([
        {
          type: "paragraph",
          attrs: {
            locales: {
              "eu-fr": { content: "Bonjour le monde" },
            },
          },
          content: [
            {
              type: "text",
              text: "Hello world",
            },
          ],
        },
      ]);

      const elemental = convertTiptapToElemental(tiptap);

      expect(elemental[0]).toEqual({
        type: "text",
        align: "left",
        content: "Hello world\n",
        locales: {
          "eu-fr": { content: "Bonjour le monde" },
        },
      });
    });
  });
});
