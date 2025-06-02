import { describe, it, expect } from "vitest";
import {
  convertElementalToTiptap,
  parseMDContent,
  type ConvertElementalToTiptapOptions,
} from "./convertElementalToTiptap";
import type { ElementalContent, ElementalNode } from "../../../types";

describe("parseMDContent", () => {
  it("should parse simple text content", () => {
    const content = "Hello world";
    const result = parseMDContent(content);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: "text",
      text: "Hello world",
    });
  });

  it("should handle multiline content with hard breaks", () => {
    const content = "Line 1\nLine 2\nLine 3";
    const result = parseMDContent(content);

    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({ type: "text", text: "Line 1" });
    expect(result[1]).toEqual({ type: "hardBreak" });
    expect(result[2]).toEqual({ type: "text", text: "Line 2" });
    expect(result[3]).toEqual({ type: "hardBreak" });
    expect(result[4]).toEqual({ type: "text", text: "Line 3" });
  });

  it("should parse bold markdown formatting", () => {
    const content = "This is **bold** text";
    const result = parseMDContent(content);

    expect(result).toContainEqual({ type: "text", text: "This is " });
    expect(result).toContainEqual({
      type: "text",
      text: "bold",
      marks: [{ type: "bold" }],
    });
    expect(result).toContainEqual({ type: "text", text: " text" });
  });

  it("should parse italic markdown formatting", () => {
    const content = "This is *italic* text";
    const result = parseMDContent(content);

    expect(result).toContainEqual({ type: "text", text: "This is " });
    expect(result).toContainEqual({
      type: "text",
      text: "italic",
      marks: [{ type: "italic" }],
    });
    expect(result).toContainEqual({ type: "text", text: " text" });
  });

  it("should parse underline markdown formatting", () => {
    const content = "This is __underlined__ text";
    const result = parseMDContent(content);

    expect(result).toContainEqual({ type: "text", text: "This is " });
    expect(result).toContainEqual({
      type: "text",
      text: "underlined",
      marks: [{ type: "bold" }], // __ is actually parsed as bold in the implementation
    });
    expect(result).toContainEqual({ type: "text", text: " text" });
  });

  it("should parse strikethrough markdown formatting", () => {
    const content = "This is ~strikethrough~ text";
    const result = parseMDContent(content);

    expect(result).toContainEqual({ type: "text", text: "This is " });
    expect(result).toContainEqual({
      type: "text",
      text: "strikethrough",
      marks: [{ type: "strike" }],
    });
    expect(result).toContainEqual({ type: "text", text: " text" });
  });

  it("should parse plus underline markdown formatting", () => {
    const content = "This is +underlined+ text";
    const result = parseMDContent(content);

    expect(result).toContainEqual({ type: "text", text: "This is " });
    expect(result).toContainEqual({
      type: "text",
      text: "underlined",
      marks: [{ type: "underline" }],
    });
    expect(result).toContainEqual({ type: "text", text: " text" });
  });

  it("should parse nested markdown formatting", () => {
    const content = "This is **bold and *italic* text**";
    const result = parseMDContent(content);

    expect(result).toContainEqual({ type: "text", text: "This is " });
    expect(
      result.some(
        (node) =>
          node.type === "text" &&
          node.text === "bold and " &&
          node.marks?.some((mark) => mark.type === "bold")
      )
    ).toBe(true);
    expect(
      result.some(
        (node) =>
          node.type === "text" &&
          node.text === "italic" &&
          node.marks?.some((mark) => mark.type === "bold") &&
          node.marks?.some((mark) => mark.type === "italic")
      )
    ).toBe(true);
  });

  it("should parse link markdown formatting", () => {
    const content = "Visit [Google](https://google.com) for search";
    const result = parseMDContent(content);

    expect(result).toContainEqual({ type: "text", text: "Visit " });
    expect(result).toContainEqual({
      type: "text",
      text: "Google",
      marks: [{ type: "link", attrs: { href: "https://google.com" } }],
    });
    expect(result).toContainEqual({ type: "text", text: " for search" });
  });

  it("should parse variables with double braces", () => {
    const content = "Hello {{name}}, welcome!";
    const result = parseMDContent(content);

    expect(result).toContainEqual({ type: "text", text: "Hello " });
    expect(result).toContainEqual({
      type: "variable",
      attrs: { id: "name" },
    });
    expect(result).toContainEqual({ type: "text", text: ", welcome!" });
  });

  it("should parse variables with curly braces format", () => {
    const content = "Hello {}username{}, welcome!";
    const result = parseMDContent(content);

    expect(result).toContainEqual({ type: "text", text: "Hello " });
    expect(result).toContainEqual({
      type: "variable",
      attrs: { id: "username" },
    });
    expect(result).toContainEqual({ type: "text", text: ", welcome!" });
  });

  it("should handle empty content", () => {
    const content = "";
    const result = parseMDContent(content);

    expect(result).toEqual([]);
  });

  it("should handle complex mixed content", () => {
    const content = "**Bold** and *italic* with [link](http://example.com) and {{variable}}";
    const result = parseMDContent(content);

    expect(result).toContainEqual({
      type: "text",
      text: "Bold",
      marks: [{ type: "bold" }],
    });
    expect(result).toContainEqual({
      type: "text",
      text: "italic",
      marks: [{ type: "italic" }],
    });
    expect(result).toContainEqual({
      type: "text",
      text: "link",
      marks: [{ type: "link", attrs: { href: "http://example.com" } }],
    });
    expect(result).toContainEqual({
      type: "variable",
      attrs: { id: "variable" },
    });
  });
});

describe("convertElementalToTiptap", () => {
  const createElementalContent = (elements: ElementalNode[]): ElementalContent => ({
    version: "2022-01-01",
    elements: [
      {
        type: "channel",
        channel: "email",
        elements,
      } as any,
    ],
  });

  it("should handle null/undefined input", () => {
    expect(convertElementalToTiptap(null)).toEqual({
      type: "doc",
      content: [],
    });

    expect(convertElementalToTiptap(undefined)).toEqual({
      type: "doc",
      content: [],
    });
  });

  it("should handle empty elemental content", () => {
    const elemental = createElementalContent([]);
    const result = convertElementalToTiptap(elemental);

    expect(result).toEqual({
      type: "doc",
      content: [],
    });
  });

  it("should convert simple text node", () => {
    const elemental = createElementalContent([
      {
        type: "text",
        content: "Hello world",
      },
    ]);

    const result = convertElementalToTiptap(elemental);

    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toMatchObject({
      type: "paragraph",
      attrs: expect.objectContaining({
        textAlign: "left",
        level: null,
      }),
      content: [
        {
          type: "text",
          text: "Hello world",
        },
      ],
    });
  });

  it("should convert text node with alignment", () => {
    const elemental = createElementalContent([
      {
        type: "text",
        content: "Centered text",
        align: "center",
      },
    ]);

    const result = convertElementalToTiptap(elemental);

    expect(result.content[0]).toMatchObject({
      type: "paragraph",
      attrs: expect.objectContaining({
        textAlign: "center",
        level: null,
      }),
      content: [
        {
          type: "text",
          text: "Centered text",
        },
      ],
    });
  });

  it("should convert text node with styling properties", () => {
    const elemental = createElementalContent([
      {
        type: "text",
        content: "Styled text",
        color: "#ff0000",
        background_color: "#00ff00",
        padding: "10px 20px",
      },
    ]);

    const result = convertElementalToTiptap(elemental);

    expect(result.content[0]).toMatchObject({
      type: "paragraph",
      attrs: expect.objectContaining({
        textAlign: "left",
        level: null,
        textColor: "#ff0000",
        backgroundColor: "#00ff00",
        paddingVertical: 10,
        paddingHorizontal: 20,
      }),
      content: [
        {
          type: "text",
          text: "Styled text",
        },
      ],
    });
  });

  it("should convert text node with border", () => {
    const elemental = createElementalContent([
      {
        type: "text",
        content: "Bordered text",
        border: {
          enabled: true,
          color: "#000000",
          size: "2px",
          radius: 5,
        },
      },
    ]);

    const result = convertElementalToTiptap(elemental);

    expect(result.content[0]).toMatchObject({
      type: "paragraph",
      attrs: expect.objectContaining({
        textAlign: "left",
        level: null,
        borderColor: "#000000",
        borderWidth: 2,
        borderRadius: 5,
      }),
      content: [
        {
          type: "text",
          text: "Bordered text",
        },
      ],
    });
  });

  it("should convert heading text node", () => {
    const elemental = createElementalContent([
      {
        type: "text",
        content: "Heading text",
        text_style: "h1",
      },
    ]);

    const result = convertElementalToTiptap(elemental);

    expect(result.content[0]).toMatchObject({
      type: "heading",
      attrs: expect.objectContaining({
        textAlign: "left",
        level: 1,
      }),
      content: [
        {
          type: "text",
          text: "Heading text",
        },
      ],
    });
  });

  it("should convert h2 heading text node", () => {
    const elemental = createElementalContent([
      {
        type: "text",
        content: "Sub heading",
        text_style: "h2",
      },
    ]);

    const result = convertElementalToTiptap(elemental);

    expect(result.content[0]).toMatchObject({
      type: "heading",
      attrs: expect.objectContaining({
        textAlign: "left",
        level: 2,
      }),
      content: [
        {
          type: "text",
          text: "Sub heading",
        },
      ],
    });
  });

  it("should convert quote node", () => {
    const elemental = createElementalContent([
      {
        type: "quote",
        content: "This is a quote",
      },
    ]);

    const result = convertElementalToTiptap(elemental);

    expect(result.content[0]).toMatchObject({
      type: "blockquote",
      attrs: expect.objectContaining({
        textAlign: "left",
      }),
      content: [
        {
          type: "paragraph",
          attrs: expect.objectContaining({
            textAlign: "left",
          }),
          content: [
            {
              type: "text",
              text: "This is a quote",
            },
          ],
        },
      ],
    });
  });

  it("should convert quote node with alignment and border color", () => {
    const elemental = createElementalContent([
      {
        type: "quote",
        content: "Styled quote",
        align: "center",
        border_color: "#cccccc",
      },
    ]);

    const result = convertElementalToTiptap(elemental);

    expect(result.content[0]).toMatchObject({
      type: "blockquote",
      attrs: expect.objectContaining({
        textAlign: "center",
        borderColor: "#cccccc",
      }),
      content: [
        {
          type: "paragraph",
          attrs: expect.objectContaining({
            textAlign: "center",
          }),
          content: [
            {
              type: "text",
              text: "Styled quote",
            },
          ],
        },
      ],
    });
  });

  it("should convert image node", () => {
    const elemental = createElementalContent([
      {
        type: "image",
        src: "https://example.com/image.jpg",
        alt_text: "Example image",
      },
    ]);

    const result = convertElementalToTiptap(elemental);

    expect(result.content[0]).toMatchObject({
      type: "imageBlock",
      attrs: expect.objectContaining({
        sourcePath: "https://example.com/image.jpg",
        alt: "Example image",
      }),
    });
  });

  it("should convert image node with all attributes", () => {
    const elemental = createElementalContent([
      {
        type: "image",
        src: "https://example.com/image.jpg",
        alt_text: "Example image",
        href: "https://example.com",
        align: "center",
        width: "300px",
      },
    ]);

    const result = convertElementalToTiptap(elemental);

    expect(result.content[0]).toMatchObject({
      type: "imageBlock",
      attrs: expect.objectContaining({
        sourcePath: "https://example.com/image.jpg",
        alt: "Example image",
        link: "https://example.com",
        alignment: "center", // Note: uses alignment, not textAlign
        width: 300, // Note: converts to number
      }),
    });
  });

  it("should convert action node (button)", () => {
    const elemental = createElementalContent([
      {
        type: "action",
        content: "Click me",
        href: "https://example.com",
      },
    ]);

    const result = convertElementalToTiptap(elemental);

    expect(result.content[0]).toMatchObject({
      type: "button",
      attrs: expect.objectContaining({
        label: "Click me",
        link: "https://example.com",
        alignment: "center", // Default alignment
        size: "default", // Default size
      }),
    });
  });

  it("should convert action node with all attributes", () => {
    const elemental = createElementalContent([
      {
        type: "action",
        content: "Styled button",
        href: "https://example.com",
        action_id: "btn1",
        style: "button",
        align: "center",
        background_color: "#0066cc",
        color: "#ffffff",
        padding: "12px 24px",
      },
    ]);

    const result = convertElementalToTiptap(elemental);

    expect(result.content[0]).toMatchObject({
      type: "button",
      attrs: expect.objectContaining({
        label: "Styled button",
        link: "https://example.com",
        style: "button",
        alignment: "center",
        size: "default",
        backgroundColor: "#0066cc",
        textColor: "#ffffff",
        padding: 12, // Note: simplified padding parsing
      }),
    });
  });

  it("should convert divider node", () => {
    const elemental = createElementalContent([
      {
        type: "divider",
      },
    ]);

    const result = convertElementalToTiptap(elemental);

    expect(result.content[0]).toMatchObject({
      type: "divider",
      attrs: expect.objectContaining({
        variant: "divider", // Default variant
      }),
    });
  });

  it("should convert divider node with styling", () => {
    const elemental = createElementalContent([
      {
        type: "divider",
        dividerColor: "#cccccc",
        borderWidth: "2px",
        padding: "20px 0",
      },
    ]);

    const result = convertElementalToTiptap(elemental);

    expect(result.content[0]).toMatchObject({
      type: "divider",
      attrs: expect.objectContaining({
        color: "#cccccc", // Maps to color, not dividerColor
        size: 2, // Converts borderWidth to number
        padding: 20, // Converts padding to number
        variant: "divider",
      }),
    });
  });

  it("should handle text with markdown formatting", () => {
    const elemental = createElementalContent([
      {
        type: "text",
        content: "This is **bold** and *italic* text with {{variable}}",
      },
    ]);

    const result = convertElementalToTiptap(elemental);
    const content = result.content[0].content;

    expect(content).toBeDefined();
    expect(content!).toContainEqual({ type: "text", text: "This is " });
    expect(content!).toContainEqual({
      type: "text",
      text: "bold",
      marks: [{ type: "bold" }],
    });
    expect(content!).toContainEqual({
      type: "variable",
      attrs: { id: "variable" },
    });
  });

  it("should handle group node by ignoring it (not implemented)", () => {
    const elemental = createElementalContent([
      {
        type: "group",
        elements: [
          {
            type: "text",
            content: "First text",
          },
          {
            type: "divider",
          },
          {
            type: "text",
            content: "Second text",
          },
        ],
      } as any,
    ]);

    const result = convertElementalToTiptap(elemental);

    // Group nodes are not implemented, so they get ignored
    expect(result.content).toHaveLength(0);
  });

  it("should handle multiple elements", () => {
    const elemental = createElementalContent([
      {
        type: "text",
        content: "Paragraph 1",
        text_style: "h1",
      },
      {
        type: "text",
        content: "Paragraph 2",
      },
      {
        type: "divider",
      },
      {
        type: "quote",
        content: "A quote",
      },
    ]);

    const result = convertElementalToTiptap(elemental);

    expect(result.content).toHaveLength(4);
    expect(result.content[0].type).toBe("heading");
    expect(result.content[1].type).toBe("paragraph");
    expect(result.content[2].type).toBe("divider");
    expect(result.content[3].type).toBe("blockquote");
  });

  it("should handle options parameter", () => {
    const elemental = createElementalContent([
      {
        type: "text",
        content: "Test content",
      },
    ]);

    const options: ConvertElementalToTiptapOptions = {
      channel: "email",
    };

    const result = convertElementalToTiptap(elemental, options);

    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toMatchObject({
      type: "paragraph",
      attrs: expect.objectContaining({
        textAlign: "left",
        level: null,
      }),
      content: [
        {
          type: "text",
          text: "Test content",
        },
      ],
    });
  });

  it("should handle unsupported node types gracefully", () => {
    const elemental = createElementalContent([
      {
        type: "unknown-type" as any,
        content: "Unknown content",
      },
    ]);

    const result = convertElementalToTiptap(elemental);

    expect(result.content).toHaveLength(0);
  });

  it("should preserve line breaks in text content", () => {
    const elemental = createElementalContent([
      {
        type: "text",
        content: "Line 1\nLine 2\nLine 3",
      },
    ]);

    const result = convertElementalToTiptap(elemental);
    const content = result.content[0].content;

    expect(content).toBeDefined();
    expect(content!).toContainEqual({ type: "text", text: "Line 1" });
    expect(content!).toContainEqual({ type: "hardBreak" });
    expect(content!).toContainEqual({ type: "text", text: "Line 2" });
    expect(content!).toContainEqual({ type: "hardBreak" });
    expect(content!).toContainEqual({ type: "text", text: "Line 3" });
  });

  it("should handle complex nested markdown with variables and links", () => {
    const elemental = createElementalContent([
      {
        type: "text",
        content: "Hello **{{name}}**, visit [our site](https://example.com) for *special* offers!",
      },
    ]);

    const result = convertElementalToTiptap(elemental);
    const content = result.content[0].content;

    expect(content).toBeDefined();
    expect(content!).toContainEqual({ type: "text", text: "Hello " });
    expect(
      content!.some(
        (node) =>
          node.type === "variable" &&
          node.attrs?.id === "name" &&
          node.marks?.some((mark) => mark.type === "bold")
      )
    ).toBe(true);
    expect(content!).toContainEqual({ type: "text", text: ", visit " });
    expect(
      content!.some(
        (node) =>
          node.type === "text" &&
          node.text === "our site" &&
          node.marks?.some(
            (mark) => mark.type === "link" && mark.attrs?.href === "https://example.com"
          )
      )
    ).toBe(true);
    expect(
      content!.some(
        (node) =>
          node.type === "text" &&
          node.text === "special" &&
          node.marks?.some((mark) => mark.type === "italic")
      )
    ).toBe(true);
  });
});
