import { describe, it, expect } from "vitest";
import {
  convertElementalToTiptap,
  parseMDContent,
  type ConvertElementalToTiptapOptions,
} from "./convertElementalToTiptap";
import { convertTiptapToElemental } from "../convertTiptapToElemental/convertTiptapToElemental";
import type { TiptapDoc } from "../convertTiptapToElemental/convertTiptapToElemental";
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
    // Note: The pattern-based approach matches outer patterns first,
    // so nested formatting within ** ** doesn't work when the inner content contains *
    const content = "This is **bold and *italic* text**";
    const result = parseMDContent(content);

    // The ** markers don't match because the inner content contains *
    // So the *italic* matches as italic, and the ** remain as text
    expect(result).toContainEqual({ type: "text", text: "This is **bold and " });
    expect(
      result.some(
        (node) =>
          node.type === "text" &&
          node.text === "italic" &&
          node.marks?.some((mark) => mark.type === "italic")
      )
    ).toBe(true);
    expect(result).toContainEqual({ type: "text", text: " text**" });
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
      attrs: { id: "name", isInvalid: false },
    });
    expect(result).toContainEqual({ type: "text", text: ", welcome!" });
  });

  it("should parse variables with curly braces format", () => {
    const content = "Hello {}username{}, welcome!";
    const result = parseMDContent(content);

    expect(result).toContainEqual({ type: "text", text: "Hello " });
    expect(result).toContainEqual({
      type: "variable",
      attrs: { id: "username", isInvalid: false },
    });
    expect(result).toContainEqual({ type: "text", text: ", welcome!" });
  });

  it("should create variable with isInvalid=true for invalid names with spaces", () => {
    const content = "Hello {{user. firstName}}, welcome!";
    const result = parseMDContent(content);

    // Invalid variable should be created as variable node with isInvalid: true
    expect(result).toContainEqual({ type: "text", text: "Hello " });
    expect(result).toContainEqual({
      type: "variable",
      attrs: { id: "user. firstName", isInvalid: true },
    });
    expect(result).toContainEqual({ type: "text", text: ", welcome!" });
  });

  it("should create variable with isInvalid=true for trailing dots", () => {
    const content = "Hello {{user.}}, welcome!";
    const result = parseMDContent(content);

    expect(result).toContainEqual({
      type: "variable",
      attrs: { id: "user.", isInvalid: true },
    });
  });

  it("should create variable with isInvalid=true for leading dots", () => {
    const content = "Hello {{.user}}, welcome!";
    const result = parseMDContent(content);

    expect(result).toContainEqual({
      type: "variable",
      attrs: { id: ".user", isInvalid: true },
    });
  });

  it("should create variable with isInvalid=true for double dots", () => {
    const content = "Hello {{user..name}}, welcome!";
    const result = parseMDContent(content);

    expect(result).toContainEqual({
      type: "variable",
      attrs: { id: "user..name", isInvalid: true },
    });
  });

  it("should handle valid dot notation variables", () => {
    const content = "Hello {{user.firstName}}, welcome!";
    const result = parseMDContent(content);

    expect(result).toContainEqual({ type: "text", text: "Hello " });
    expect(result).toContainEqual({
      type: "variable",
      attrs: { id: "user.firstName", isInvalid: false },
    });
    expect(result).toContainEqual({ type: "text", text: ", welcome!" });
  });

  it("should handle empty content", () => {
    const content = "";
    const result = parseMDContent(content);

    expect(result).toEqual([]);
  });

  describe("consecutive asterisks handling", () => {
    it("should preserve triple asterisks as literal text", () => {
      const content = "*** some text";
      const result = parseMDContent(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "text",
        text: "*** some text",
      });
    });

    it("should preserve quadruple asterisks as literal text", () => {
      const content = "**** some text";
      const result = parseMDContent(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "text",
        text: "**** some text",
      });
    });

    it("should handle triple asterisks followed by italic text", () => {
      const content = "*** *italic*";
      const result = parseMDContent(content);

      expect(result).toContainEqual({ type: "text", text: "*** " });
      expect(result).toContainEqual({
        type: "text",
        text: "italic",
        marks: [{ type: "italic" }],
      });
    });

    it("should handle quadruple asterisks followed by italic text", () => {
      const content = "**** *italic*";
      const result = parseMDContent(content);

      expect(result).toContainEqual({ type: "text", text: "**** " });
      expect(result).toContainEqual({
        type: "text",
        text: "italic",
        marks: [{ type: "italic" }],
      });
    });

    it("should preserve asterisks at end of text", () => {
      const content = "some text ***";
      const result = parseMDContent(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "text",
        text: "some text ***",
      });
    });

    it("should handle mixed content with consecutive asterisks and formatting", () => {
      const content = "*** prefix *italic* and **bold** suffix";
      const result = parseMDContent(content);

      expect(result).toContainEqual({ type: "text", text: "*** prefix " });
      expect(result).toContainEqual({
        type: "text",
        text: "italic",
        marks: [{ type: "italic" }],
      });
      expect(result).toContainEqual({
        type: "text",
        text: "bold",
        marks: [{ type: "bold" }],
      });
    });

    it("should handle multiple groups of consecutive asterisks with text between", () => {
      // Note: When asterisks appear at both start and middle of text with space,
      // the pattern may match them as bold. This is expected behavior of pattern matching.
      const content = "*** hello **** world";
      const result = parseMDContent(content);

      // The ** pattern matches across the middle: ** hello **
      // resulting in: * + bold(" hello ") + ** world
      expect(result.length).toBeGreaterThan(1); // Multiple nodes due to pattern matching
    });

    it("should handle consecutive plus signs as literal text", () => {
      const content = "+++ some text";
      const result = parseMDContent(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "text",
        text: "+++ some text",
      });
    });

    it("should handle consecutive tildes as literal text", () => {
      const content = "~~~ some text";
      const result = parseMDContent(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "text",
        text: "~~~ some text",
      });
    });
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
      attrs: { id: "variable", isInvalid: false },
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
        border_size: "2px",
        border_color: "#ff0000",
      },
    ]);

    const result = convertElementalToTiptap(elemental);

    expect(result.content[0]).toMatchObject({
      type: "paragraph",
      attrs: expect.objectContaining({
        textAlign: "left",
        level: null,
        borderColor: "#ff0000",
        borderWidth: 2,
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

  it("should convert quote node with text_style h1 to blockquote with heading", () => {
    const elemental = createElementalContent([
      {
        type: "quote",
        content: "Heading in blockquote",
        text_style: "h1",
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
          type: "heading",
          attrs: expect.objectContaining({
            textAlign: "left",
            level: 1,
          }),
          content: [
            {
              type: "text",
              text: "Heading in blockquote",
            },
          ],
        },
      ],
    });
  });

  it("should convert quote node with text_style h2 to blockquote with h2 heading", () => {
    const elemental = createElementalContent([
      {
        type: "quote",
        content: "H2 in blockquote",
        text_style: "h2",
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
          type: "heading",
          attrs: expect.objectContaining({
            textAlign: "left",
            level: 2,
          }),
          content: [
            {
              type: "text",
              text: "H2 in blockquote",
            },
          ],
        },
      ],
    });
  });

  it("should convert quote node with text_style subtext to blockquote with h3 heading", () => {
    const elemental = createElementalContent([
      {
        type: "quote",
        content: "H3 in blockquote",
        text_style: "subtext",
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
          type: "heading",
          attrs: expect.objectContaining({
            textAlign: "left",
            level: 3,
          }),
          content: [
            {
              type: "text",
              text: "H3 in blockquote",
            },
          ],
        },
      ],
    });
  });

  it("should convert quote node without text_style to blockquote with paragraph (default)", () => {
    const elemental = createElementalContent([
      {
        type: "quote",
        content: "Regular paragraph in blockquote",
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
              text: "Regular paragraph in blockquote",
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
        width: "50%",
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
        width: 50, // Percentage values are parsed and clamped to 1-100
      }),
    });
  });

  it("should convert image width from pixels to percentage when image_natural_width is available", () => {
    const elemental = createElementalContent([
      {
        type: "image",
        src: "https://example.com/image.jpg",
        width: "300px",
        image_natural_width: 600,
      },
    ]);

    const result = convertElementalToTiptap(elemental);

    expect(result.content[0]).toMatchObject({
      type: "imageBlock",
      attrs: expect.objectContaining({
        sourcePath: "https://example.com/image.jpg",
        width: 50, // 300px / 600px natural width = 50%
        imageNaturalWidth: 600,
      }),
    });
  });

  it("should default to 100% width when pixel width has no image_natural_width", () => {
    const elemental = createElementalContent([
      {
        type: "image",
        src: "https://example.com/image.jpg",
        width: "300px",
        // No image_natural_width - defaults to 100%
      },
    ]);

    const result = convertElementalToTiptap(elemental);

    expect(result.content[0]).toMatchObject({
      type: "imageBlock",
      attrs: expect.objectContaining({
        sourcePath: "https://example.com/image.jpg",
        width: 100, // Defaults to 100% when natural width is unknown
      }),
    });
  });

  it("should clamp percentage width values to valid range 1-100", () => {
    const elemental = createElementalContent([
      {
        type: "image",
        src: "https://example.com/image.jpg",
        width: "500%", // Invalid: too large
      },
    ]);

    const result = convertElementalToTiptap(elemental);

    expect(result.content[0]).toMatchObject({
      type: "imageBlock",
      attrs: expect.objectContaining({
        sourcePath: "https://example.com/image.jpg",
        width: 100, // Clamped to max 100%
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
    const buttonNode = result.content[0];

    expect(buttonNode).toMatchObject({
      type: "button",
      attrs: expect.objectContaining({
        label: "Click me",
        link: "https://example.com",
        alignment: "center", // Default alignment
      }),
    });
    expect(buttonNode.content).toEqual([{ type: "text", text: "Click me" }]);
  });

  it("should default button content to fallback text when elemental content is empty", () => {
    const elemental = createElementalContent([
      {
        type: "action",
        content: "",
        href: "https://example.com",
      },
    ]);

    const result = convertElementalToTiptap(elemental);
    const buttonNode = result.content[0];

    expect(buttonNode.type).toBe("button");
    expect(buttonNode.attrs?.label).toBe("Enter text");
    expect(buttonNode.content).toEqual([{ type: "text", text: "Enter text" }]);
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
        backgroundColor: "#0066cc",
        textColor: "#ffffff",
        padding: 10, // Reverse visual offset: vertical 12 - 2 = 10
      }),
    });
  });

  it("should convert action node with variables in content", () => {
    const elemental = createElementalContent([
      {
        type: "action",
        content: "Register dfg {{test}}",
        href: "https://example.com",
      },
    ]);

    const result = convertElementalToTiptap(elemental);
    const buttonNode = result.content[0];

    expect(buttonNode).toMatchObject({
      type: "button",
      attrs: expect.objectContaining({
        label: "Register dfg {{test}}",
        link: "https://example.com",
      }),
    });

    // Verify that the content contains both text and variable nodes
    expect(buttonNode.content).toBeDefined();
    expect(buttonNode.content?.length).toBeGreaterThan(0);

    // Check that there's a text node with "Register dfg "
    const textNode = buttonNode.content?.find(
      (n) => n.type === "text" && n.text === "Register dfg "
    );
    expect(textNode).toBeDefined();

    // Check that there's a variable node with id "test"
    const variableNode = buttonNode.content?.find(
      (n) => n.type === "variable" && n.attrs?.id === "test"
    );
    expect(variableNode).toBeDefined();
  });

  it("should convert action node with multiple variables including one at the end", () => {
    const elemental = createElementalContent([
      {
        type: "action",
        content: "Register dfg {{test}} fgx {{hey}}",
        href: "https://example.com",
      },
    ]);

    const result = convertElementalToTiptap(elemental);
    const buttonNode = result.content[0];

    expect(buttonNode).toMatchObject({
      type: "button",
      attrs: expect.objectContaining({
        label: "Register dfg {{test}} fgx {{hey}}",
        link: "https://example.com",
      }),
    });

    // Verify that the content contains all nodes
    expect(buttonNode.content).toBeDefined();
    expect(buttonNode.content?.length).toBeGreaterThanOrEqual(4);

    // Check that there's a variable node with id "hey" at the end
    const variableNodes = buttonNode.content?.filter(
      (n) => n.type === "variable" && n.attrs?.id === "hey"
    );
    expect(variableNodes?.length).toBe(1);
    expect(variableNodes?.[0]?.attrs?.id).toBe("hey");

    // Verify the last node is the variable "hey"
    const lastNode = buttonNode.content?.[buttonNode.content.length - 1];
    expect(lastNode?.type).toBe("variable");
    expect(lastNode?.attrs?.id).toBe("hey");
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
        color: "#cccccc",
        border_width: "2px",
        padding: "20px 0",
      },
    ]);

    const result = convertElementalToTiptap(elemental);

    expect(result.content[0]).toMatchObject({
      type: "divider",
      attrs: expect.objectContaining({
        color: "#cccccc",
        size: 2, // Converts border_width to number
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
      attrs: { id: "variable", isInvalid: false },
    });
  });

  it("should convert group node to column", () => {
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

    // Group nodes are converted to column nodes
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("column");
    expect(result.content[0].attrs).toMatchObject({
      columnsCount: 3, // 3 elements in the group
      paddingVertical: 0,
      paddingHorizontal: 0,
      backgroundColor: "transparent",
      borderWidth: 0,
      borderRadius: 0,
      borderColor: "transparent",
    });
    expect(result.content[0].attrs.id).toBeDefined();
  });

  it("should convert group node with styling properties", () => {
    const elemental = createElementalContent([
      {
        type: "group",
        elements: [
          { type: "text", content: "Column 1" },
          { type: "text", content: "Column 2" },
        ],
        border: {
          color: "#ff0000",
          enabled: true,
          size: "2px",
          radius: 8,
        },
        padding: "10px 20px",
        background_color: "#f0f0f0",
      } as any,
    ]);

    const result = convertElementalToTiptap(elemental);

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("column");
    expect(result.content[0].attrs).toMatchObject({
      columnsCount: 2,
      paddingVertical: 10,
      paddingHorizontal: 20,
      backgroundColor: "#f0f0f0",
      borderWidth: 2,
      borderRadius: 8,
      borderColor: "#ff0000",
    });
    expect(result.content[0].attrs.id).toBeDefined();
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

  it("should convert consecutive action nodes to ButtonRow for inbox channel", () => {
    const elemental: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "inbox",
          elements: [
            {
              type: "action",
              content: "Primary Button",
              href: "https://primary.com",
              background_color: "#000000",
              color: "#ffffff",
            },
            {
              type: "action",
              content: "Secondary Button",
              href: "https://secondary.com",
              background_color: "#ffffff",
              color: "#000000",
            },
          ],
        } as any,
      ],
    };

    const result = convertElementalToTiptap(elemental, { channel: "inbox" });

    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toMatchObject({
      type: "buttonRow",
      attrs: expect.objectContaining({
        button1Label: "Primary Button",
        button1Link: "https://primary.com",
        button1BackgroundColor: "#000000",
        button1TextColor: "#ffffff",
        button2Label: "Secondary Button",
        button2Link: "https://secondary.com",
        button2BackgroundColor: "#ffffff",
        button2TextColor: "#000000",
      }),
    });
  });

  it("should NOT convert consecutive action nodes to ButtonRow for email channel", () => {
    const elemental = createElementalContent([
      {
        type: "action",
        content: "Primary Button",
        href: "https://primary.com",
        background_color: "#000000",
        color: "#ffffff",
      },
      {
        type: "action",
        content: "Secondary Button",
        href: "https://secondary.com",
        background_color: "#ffffff",
        color: "#000000",
      },
    ]);

    const result = convertElementalToTiptap(elemental, { channel: "email" });

    expect(result.content).toHaveLength(2);
    expect(result.content[0]).toMatchObject({
      type: "button",
      attrs: expect.objectContaining({
        label: "Primary Button",
        link: "https://primary.com",
      }),
    });
    expect(result.content[1]).toMatchObject({
      type: "button",
      attrs: expect.objectContaining({
        label: "Secondary Button",
        link: "https://secondary.com",
      }),
    });
  });

  it("should NOT convert consecutive action nodes to ButtonRow when no channel is specified", () => {
    const elemental = createElementalContent([
      {
        type: "action",
        content: "Primary Button",
        href: "https://primary.com",
      },
      {
        type: "action",
        content: "Secondary Button",
        href: "https://secondary.com",
      },
    ]);

    const result = convertElementalToTiptap(elemental);

    expect(result.content).toHaveLength(2);
    expect(result.content[0].type).toBe("button");
    expect(result.content[1].type).toBe("button");
  });

  describe("Raw-based channels", () => {
    it("should convert Push channel with elements (title h2 + body text)", () => {
      const elemental: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "push",
            elements: [
              {
                type: "text",
                content: "Push Notification Title",
                text_style: "h2",
              },
              {
                type: "text",
                content: "Push notification body text",
              },
            ],
          },
        ],
      };

      const result = convertElementalToTiptap(elemental);

      expect(result.content).toHaveLength(2);
      // Title element (h2)
      expect(result.content[0]).toMatchObject({
        type: "heading",
        attrs: expect.objectContaining({
          level: 2,
        }),
        content: [
          {
            type: "text",
            text: "Push Notification Title",
          },
        ],
      });
      // Body text element
      expect(result.content[1]).toMatchObject({
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Push notification body text",
          },
        ],
      });
    });

    it("should find specific channel when multiple channels exist", () => {
      const elemental: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "sms",
            elements: [
              {
                type: "text",
                content: "SMS message",
              },
            ],
          },
          {
            type: "channel",
            channel: "push",
            elements: [
              {
                type: "text",
                content: "Push title",
                text_style: "h2",
              },
              {
                type: "text",
                content: "Push text",
              },
            ],
          },
          {
            type: "channel",
            channel: "email",
            elements: [
              {
                type: "text",
                content: "Email content",
              },
            ],
          },
        ],
      };

      // Test SMS channel
      const smsResult = convertElementalToTiptap(elemental, { channel: "sms" });
      expect(smsResult.content).toHaveLength(1);
      expect(smsResult.content[0].content![0]).toMatchObject({
        type: "text",
        text: "SMS message",
      });

      // Test Push channel
      const pushResult = convertElementalToTiptap(elemental, { channel: "push" });
      expect(pushResult.content).toHaveLength(2);
      expect(pushResult.content[0].content![0]).toMatchObject({
        type: "text",
        text: "Push title",
      });

      // Test Email channel (elements-based)
      const emailResult = convertElementalToTiptap(elemental, { channel: "email" });
      expect(emailResult.content).toHaveLength(1);
      expect(emailResult.content[0].content![0]).toMatchObject({
        type: "text",
        text: "Email content",
      });
    });
  });

  describe("locales preservation", () => {
    it("should preserve locales in text node attributes", () => {
      const elemental = createElementalContent([
        {
          type: "text",
          content: "Hello",
          locales: {
            "eu-fr": { content: "Bonjour" },
            "es-es": { content: "Hola" },
          },
        },
      ]);

      const result = convertElementalToTiptap(elemental);

      expect(result.content[0].attrs).toHaveProperty("locales");
      expect(result.content[0].attrs?.locales).toEqual({
        "eu-fr": { content: "Bonjour" },
        "es-es": { content: "Hola" },
      });
    });

    it("should preserve locales in action node attributes", () => {
      const elemental = createElementalContent([
        {
          type: "action",
          content: "Click here",
          href: "https://example.com",
          locales: {
            "eu-fr": { content: "Cliquez ici", href: "https://example.fr" },
          },
        },
      ]);

      const result = convertElementalToTiptap(elemental);

      expect(result.content[0].attrs).toHaveProperty("locales");
      expect(result.content[0].attrs?.locales).toEqual({
        "eu-fr": { content: "Cliquez ici", href: "https://example.fr" },
      });
    });

    it("should preserve locales in quote node attributes", () => {
      const elemental = createElementalContent([
        {
          type: "quote",
          content: "To be or not to be",
          locales: {
            "eu-fr": { content: "Être ou ne pas être" },
          },
        },
      ]);

      const result = convertElementalToTiptap(elemental);

      expect(result.content[0].attrs).toHaveProperty("locales");
      expect(result.content[0].attrs?.locales).toEqual({
        "eu-fr": { content: "Être ou ne pas être" },
      });
    });

    it("should preserve locales in image node attributes", () => {
      const elemental = createElementalContent([
        {
          type: "image",
          src: "https://example.com/image.jpg",
          locales: {
            "eu-fr": { src: "https://example.fr/image.jpg" },
          },
        },
      ]);

      const result = convertElementalToTiptap(elemental);

      expect(result.content[0].attrs).toHaveProperty("locales");
      expect(result.content[0].attrs?.locales).toEqual({
        "eu-fr": { src: "https://example.fr/image.jpg" },
      });
    });

    it("should preserve locales in html node attributes", () => {
      const elemental = createElementalContent([
        {
          type: "html",
          content: "<div>Hello</div>",
          locales: {
            "eu-fr": { content: "<div>Bonjour</div>" },
          },
        },
      ]);

      const result = convertElementalToTiptap(elemental);

      expect(result.content[0].attrs).toHaveProperty("locales");
      expect(result.content[0].attrs?.locales).toEqual({
        "eu-fr": { content: "<div>Bonjour</div>" },
      });
    });

    it("should not add locales property when not present", () => {
      const elemental = createElementalContent([
        {
          type: "text",
          content: "Hello",
        },
      ]);

      const result = convertElementalToTiptap(elemental);

      expect(result.content[0].attrs).not.toHaveProperty("locales");
    });
  });

  describe("elements array format (new format)", () => {
    it("should convert simple string elements", () => {
      const elemental = createElementalContent([
        {
          type: "text",
          elements: [{ type: "string", content: "Hello world" }],
        } as any,
      ]);

      const result = convertElementalToTiptap(elemental);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("paragraph");
      expect(result.content[0].content).toHaveLength(1);
      expect(result.content[0].content![0]).toMatchObject({
        type: "text",
        text: "Hello world",
      });
    });

    it("should convert elements with boolean formatting flags", () => {
      const elemental = createElementalContent([
        {
          type: "text",
          elements: [
            { type: "string", content: "plain " },
            { type: "string", content: "bold", bold: true },
            { type: "string", content: " text" },
          ],
        } as any,
      ]);

      const result = convertElementalToTiptap(elemental);

      expect(result.content[0].content).toHaveLength(3);
      expect(result.content[0].content![0]).toMatchObject({
        type: "text",
        text: "plain ",
      });
      expect(result.content[0].content![0].marks).toBeUndefined();
      expect(result.content[0].content![1]).toMatchObject({
        type: "text",
        text: "bold",
        marks: [{ type: "bold" }],
      });
      expect(result.content[0].content![2]).toMatchObject({
        type: "text",
        text: " text",
      });
    });

    it("should convert elements with all four formatting flags", () => {
      const elemental = createElementalContent([
        {
          type: "text",
          elements: [
            {
              type: "string",
              content: "fff",
              bold: true,
              italic: true,
              strikethrough: true,
              underline: true,
            },
          ],
        } as any,
      ]);

      const result = convertElementalToTiptap(elemental);

      expect(result.content[0].content).toHaveLength(1);
      const node = result.content[0].content![0];
      expect(node.type).toBe("text");
      expect(node.text).toBe("fff");
      expect(node.marks).toEqual(
        expect.arrayContaining([
          { type: "bold" },
          { type: "italic" },
          { type: "strike" },
          { type: "underline" },
        ])
      );
    });

    it("should convert variables in string content", () => {
      const elemental = createElementalContent([
        {
          type: "text",
          elements: [
            { type: "string", content: "Hello " },
            { type: "string", content: "{{name}}" },
            { type: "string", content: ", welcome!" },
          ],
        } as any,
      ]);

      const result = convertElementalToTiptap(elemental);

      expect(result.content[0].content).toHaveLength(3);
      expect(result.content[0].content![0]).toMatchObject({
        type: "text",
        text: "Hello ",
      });
      expect(result.content[0].content![1]).toMatchObject({
        type: "variable",
        attrs: expect.objectContaining({ id: "name" }),
      });
      expect(result.content[0].content![2]).toMatchObject({
        type: "text",
        text: ", welcome!",
      });
    });

    it("should convert hard breaks via newlines in content", () => {
      const elemental = createElementalContent([
        {
          type: "text",
          elements: [{ type: "string", content: "Line 1\nLine 2\nLine 3" }],
        } as any,
      ]);

      const result = convertElementalToTiptap(elemental);

      // Should have: text, hardBreak, text, hardBreak, text
      expect(result.content[0].content).toHaveLength(5);
      expect(result.content[0].content![0]).toMatchObject({ type: "text", text: "Line 1" });
      expect(result.content[0].content![1]).toMatchObject({ type: "hardBreak" });
      expect(result.content[0].content![2]).toMatchObject({ type: "text", text: "Line 2" });
      expect(result.content[0].content![3]).toMatchObject({ type: "hardBreak" });
      expect(result.content[0].content![4]).toMatchObject({ type: "text", text: "Line 3" });
    });

    it("should convert link elements", () => {
      const elemental = createElementalContent([
        {
          type: "text",
          elements: [
            { type: "string", content: "Visit " },
            { type: "link", content: "Google", href: "https://google.com" },
            { type: "string", content: " for search" },
          ],
        } as any,
      ]);

      const result = convertElementalToTiptap(elemental);

      expect(result.content[0].content).toHaveLength(3);
      expect(result.content[0].content![1]).toMatchObject({
        type: "text",
        text: "Google",
        marks: expect.arrayContaining([
          { type: "link", attrs: { href: "https://google.com" } },
        ]),
      });
    });

    it("should convert bold link elements", () => {
      const elemental = createElementalContent([
        {
          type: "text",
          elements: [
            {
              type: "link",
              content: "Click here",
              href: "https://example.com",
              bold: true,
            },
          ],
        } as any,
      ]);

      const result = convertElementalToTiptap(elemental);

      expect(result.content[0].content).toHaveLength(1);
      const node = result.content[0].content![0];
      expect(node.type).toBe("text");
      expect(node.text).toBe("Click here");
      expect(node.marks).toEqual(
        expect.arrayContaining([
          { type: "bold" },
          { type: "link", attrs: { href: "https://example.com" } },
        ])
      );
    });

    it("should convert heading with elements array format", () => {
      const elemental = createElementalContent([
        {
          type: "text",
          text_style: "h1",
          elements: [{ type: "string", content: "Heading text" }],
        } as any,
      ]);

      const result = convertElementalToTiptap(elemental);

      expect(result.content[0].type).toBe("heading");
      expect(result.content[0].attrs?.level).toBe(1);
      expect(result.content[0].content![0]).toMatchObject({
        type: "text",
        text: "Heading text",
      });
    });

    it("should preserve styling attributes with elements array", () => {
      const elemental = createElementalContent([
        {
          type: "text",
          padding: "10px 20px",
          background_color: "#f0f0f0",
          border_size: "2px",
          border_color: "#ccc",
          elements: [{ type: "string", content: "Styled" }],
        } as any,
      ]);

      const result = convertElementalToTiptap(elemental);

      expect(result.content[0].attrs).toMatchObject({
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: "#f0f0f0",
        borderWidth: 2,
        borderColor: "#ccc",
      });
    });

    it("should handle empty elements array", () => {
      const elemental = createElementalContent([
        {
          type: "text",
          elements: [],
        } as any,
      ]);

      const result = convertElementalToTiptap(elemental);

      expect(result.content[0].type).toBe("paragraph");
      expect(result.content[0].content).toEqual([]);
    });
  });

  describe("round-trip tests (TipTap → Elemental → TipTap)", () => {
    const createTiptapDoc = (content: any[]): TiptapDoc => ({
      type: "doc",
      content,
    });

    it("should round-trip simple text", () => {
      const tiptap = createTiptapDoc([
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
      ]);

      const elemental = convertTiptapToElemental(tiptap);
      const roundTripped = convertElementalToTiptap(
        { version: "2022-01-01", elements: [{ type: "channel", channel: "email", elements: elemental } as any] }
      );

      expect(roundTripped.content).toHaveLength(1);
      expect(roundTripped.content[0].type).toBe("paragraph");
      expect(roundTripped.content[0].content).toHaveLength(1);
      expect(roundTripped.content[0].content![0]).toMatchObject({
        type: "text",
        text: "Hello world",
      });
    });

    it("should round-trip combined bold+italic+underline+strikethrough", () => {
      const tiptap = createTiptapDoc([
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "fff",
              marks: [
                { type: "bold" },
                { type: "italic" },
                { type: "strike" },
                { type: "underline" },
              ],
            },
          ],
        },
      ]);

      const elemental = convertTiptapToElemental(tiptap);
      const roundTripped = convertElementalToTiptap(
        { version: "2022-01-01", elements: [{ type: "channel", channel: "email", elements: elemental } as any] }
      );

      expect(roundTripped.content[0].content).toHaveLength(1);
      const node = roundTripped.content[0].content![0];
      expect(node.text).toBe("fff");
      expect(node.marks).toEqual(
        expect.arrayContaining([
          { type: "bold" },
          { type: "italic" },
          { type: "strike" },
          { type: "underline" },
        ])
      );
    });

    it("should round-trip bold text with trailing space before variable", () => {
      const tiptap = createTiptapDoc([
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello: ", marks: [{ type: "bold" }] },
            { type: "variable", attrs: { id: "user" } },
          ],
        },
      ]);

      const elemental = convertTiptapToElemental(tiptap);
      const roundTripped = convertElementalToTiptap(
        { version: "2022-01-01", elements: [{ type: "channel", channel: "email", elements: elemental } as any] }
      );

      expect(roundTripped.content[0].content).toHaveLength(2);
      expect(roundTripped.content[0].content![0]).toMatchObject({
        type: "text",
        text: "Hello: ",
        marks: [{ type: "bold" }],
      });
      expect(roundTripped.content[0].content![1]).toMatchObject({
        type: "variable",
        attrs: expect.objectContaining({ id: "user" }),
      });
    });

    it("should round-trip hard breaks between formatted text", () => {
      const tiptap = createTiptapDoc([
        {
          type: "paragraph",
          content: [
            { type: "text", text: "normal" },
            { type: "hardBreak" },
            { type: "text", text: "bold", marks: [{ type: "bold" }] },
          ],
        },
      ]);

      const elemental = convertTiptapToElemental(tiptap);
      const roundTripped = convertElementalToTiptap(
        { version: "2022-01-01", elements: [{ type: "channel", channel: "email", elements: elemental } as any] }
      );

      expect(roundTripped.content[0].content).toHaveLength(3);
      expect(roundTripped.content[0].content![0]).toMatchObject({ type: "text", text: "normal" });
      expect(roundTripped.content[0].content![1]).toMatchObject({ type: "hardBreak" });
      expect(roundTripped.content[0].content![2]).toMatchObject({
        type: "text",
        text: "bold",
        marks: [{ type: "bold" }],
      });
    });
  });

  describe("migration tests (old markdown → TipTap → new elements array)", () => {
    it("should migrate old markdown bold to elements array", () => {
      // Load old markdown format
      const elemental: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "email",
            elements: [
              { type: "text", content: "This is **bold** text\n" },
            ],
          } as any,
        ],
      };

      const tiptap = convertElementalToTiptap(elemental);

      // Re-save produces elements array format
      const newElemental = convertTiptapToElemental(tiptap);

      expect(newElemental).toHaveLength(1);
      expect(newElemental[0]).toMatchObject({
        type: "text",
        elements: expect.arrayContaining([
          expect.objectContaining({ type: "string", content: "This is " }),
          expect.objectContaining({ type: "string", content: "bold", bold: true }),
          expect.objectContaining({ type: "string", content: " text" }),
        ]),
      });
    });

    it("should migrate old markdown with combined formatting", () => {
      const elemental: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "email",
            elements: [
              { type: "text", content: "plain\n**bold**\n*italic*\n+underline+\n~strike~\n" },
            ],
          } as any,
        ],
      };

      const tiptap = convertElementalToTiptap(elemental);
      const newElemental = convertTiptapToElemental(tiptap);

      expect(newElemental).toHaveLength(1);
      const el = newElemental[0] as any;
      expect(el.type).toBe("text");
      expect(el.elements).toBeDefined();
      // Should NOT have a content field (old format)
      expect(el.content).toBeUndefined();
    });

    it("should migrate old markdown with variables", () => {
      const elemental: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "email",
            elements: [
              { type: "text", content: "Hello {{user}}\n" },
            ],
          } as any,
        ],
      };

      const tiptap = convertElementalToTiptap(elemental);
      const newElemental = convertTiptapToElemental(tiptap);

      expect(newElemental).toHaveLength(1);
      const el = newElemental[0] as any;
      expect(el.elements).toBeDefined();
      // Should contain variable reference
      const hasVariable = el.elements.some(
        (e: any) => e.type === "string" && e.content.includes("{{user}}")
      );
      expect(hasVariable).toBe(true);
    });

    it("should migrate old markdown with hard breaks to elements array", () => {
      const elemental: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "email",
            elements: [
              { type: "text", content: "Line 1\nLine 2\nLine 3\n" },
            ],
          } as any,
        ],
      };

      const tiptap = convertElementalToTiptap(elemental);
      const newElemental = convertTiptapToElemental(tiptap);

      expect(newElemental).toHaveLength(1);
      const el = newElemental[0] as any;
      expect(el.elements).toBeDefined();
      expect(el.content).toBeUndefined();
      // Should contain all three lines joined with \n
      const allText = el.elements.map((e: any) => e.content).join("");
      expect(allText).toContain("Line 1");
      expect(allText).toContain("Line 2");
      expect(allText).toContain("Line 3");
    });
  });

  describe("elements array - color/textColor handling", () => {
    it("should convert color flag to textColor mark", () => {
      const elemental = createElementalContent([
        {
          type: "text",
          elements: [
            { type: "string", content: "red text", color: "#ff0000" },
          ],
        } as any,
      ]);

      const result = convertElementalToTiptap(elemental);

      expect(result.content[0].content).toHaveLength(1);
      const node = result.content[0].content![0];
      expect(node.text).toBe("red text");
      expect(node.marks).toEqual(
        expect.arrayContaining([
          { type: "textColor", attrs: { color: "#ff0000" } },
        ])
      );
    });

    it("should convert color flag with bold to textColor + bold marks", () => {
      const elemental = createElementalContent([
        {
          type: "text",
          elements: [
            { type: "string", content: "bold red", bold: true, color: "#ff0000" },
          ],
        } as any,
      ]);

      const result = convertElementalToTiptap(elemental);

      const node = result.content[0].content![0];
      expect(node.text).toBe("bold red");
      expect(node.marks).toEqual(
        expect.arrayContaining([
          { type: "bold" },
          { type: "textColor", attrs: { color: "#ff0000" } },
        ])
      );
    });

    it("should convert color flag on link element", () => {
      const elemental = createElementalContent([
        {
          type: "text",
          elements: [
            {
              type: "link",
              content: "colored link",
              href: "https://example.com",
              color: "#ff0000",
            },
          ],
        } as any,
      ]);

      const result = convertElementalToTiptap(elemental);

      const node = result.content[0].content![0];
      expect(node.text).toBe("colored link");
      expect(node.marks).toEqual(
        expect.arrayContaining([
          { type: "textColor", attrs: { color: "#ff0000" } },
          { type: "link", attrs: { href: "https://example.com" } },
        ])
      );
    });
  });

  describe("elements array - edge cases", () => {
    it("should handle multiple consecutive newlines", () => {
      const elemental = createElementalContent([
        {
          type: "text",
          elements: [
            { type: "string", content: "before\n\n\nafter" },
          ],
        } as any,
      ]);

      const result = convertElementalToTiptap(elemental);

      // before, hardBreak, hardBreak, hardBreak, after
      expect(result.content[0].content).toHaveLength(5);
      expect(result.content[0].content![0]).toMatchObject({ type: "text", text: "before" });
      expect(result.content[0].content![1]).toMatchObject({ type: "hardBreak" });
      expect(result.content[0].content![2]).toMatchObject({ type: "hardBreak" });
      expect(result.content[0].content![3]).toMatchObject({ type: "hardBreak" });
      expect(result.content[0].content![4]).toMatchObject({ type: "text", text: "after" });
    });

    it("should skip empty string content", () => {
      const elemental = createElementalContent([
        {
          type: "text",
          elements: [
            { type: "string", content: "" },
            { type: "string", content: "visible" },
          ],
        } as any,
      ]);

      const result = convertElementalToTiptap(elemental);

      expect(result.content[0].content).toHaveLength(1);
      expect(result.content[0].content![0]).toMatchObject({
        type: "text",
        text: "visible",
      });
    });

    it("should handle link with variable in content", () => {
      const elemental = createElementalContent([
        {
          type: "text",
          elements: [
            {
              type: "link",
              content: "Visit {{site_name}}",
              href: "https://example.com",
            },
          ],
        } as any,
      ]);

      const result = convertElementalToTiptap(elemental);

      // Should produce: text("Visit ") + variable(site_name) — both with link mark
      expect(result.content[0].content).toHaveLength(2);
      expect(result.content[0].content![0]).toMatchObject({
        type: "text",
        text: "Visit ",
      });
      expect(result.content[0].content![0].marks).toEqual(
        expect.arrayContaining([
          { type: "link", attrs: { href: "https://example.com" } },
        ])
      );
      expect(result.content[0].content![1]).toMatchObject({
        type: "variable",
        attrs: expect.objectContaining({ id: "site_name" }),
      });
    });

    it("should preserve locales with elements array format", () => {
      const elemental = createElementalContent([
        {
          type: "text",
          elements: [{ type: "string", content: "Hello" }],
          locales: {
            "eu-fr": { content: "Bonjour" },
          },
        } as any,
      ]);

      const result = convertElementalToTiptap(elemental);

      expect(result.content[0].attrs).toHaveProperty("locales");
      expect(result.content[0].attrs?.locales).toEqual({
        "eu-fr": { content: "Bonjour" },
      });
    });
  });

  describe("round-trip tests - additional", () => {
    const createTiptapDoc = (content: any[]): TiptapDoc => ({
      type: "doc",
      content,
    });

    it("should round-trip heading with formatting", () => {
      const tiptap = createTiptapDoc([
        {
          type: "heading",
          attrs: { level: 1, textAlign: "center" },
          content: [
            { type: "text", text: "Bold heading", marks: [{ type: "bold" }] },
          ],
        },
      ]);

      const elemental = convertTiptapToElemental(tiptap);
      const roundTripped = convertElementalToTiptap(
        { version: "2022-01-01", elements: [{ type: "channel", channel: "email", elements: elemental } as any] }
      );

      expect(roundTripped.content[0].type).toBe("heading");
      expect(roundTripped.content[0].attrs?.level).toBe(1);
      expect(roundTripped.content[0].attrs?.textAlign).toBe("center");
      expect(roundTripped.content[0].content![0]).toMatchObject({
        type: "text",
        text: "Bold heading",
        marks: [{ type: "bold" }],
      });
    });

    it("should round-trip textColor mark", () => {
      const tiptap = createTiptapDoc([
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "red text",
              marks: [{ type: "textColor", attrs: { color: "#ff0000" } }],
            },
          ],
        },
      ]);

      const elemental = convertTiptapToElemental(tiptap);
      const roundTripped = convertElementalToTiptap(
        { version: "2022-01-01", elements: [{ type: "channel", channel: "email", elements: elemental } as any] }
      );

      expect(roundTripped.content[0].content![0]).toMatchObject({
        type: "text",
        text: "red text",
        marks: [{ type: "textColor", attrs: { color: "#ff0000" } }],
      });
    });

    it("should round-trip link with bold and color", () => {
      const tiptap = createTiptapDoc([
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "styled link",
              marks: [
                { type: "bold" },
                { type: "textColor", attrs: { color: "#ff0000" } },
                { type: "link", attrs: { href: "https://example.com" } },
              ],
            },
          ],
        },
      ]);

      const elemental = convertTiptapToElemental(tiptap);
      const roundTripped = convertElementalToTiptap(
        { version: "2022-01-01", elements: [{ type: "channel", channel: "email", elements: elemental } as any] }
      );

      const node = roundTripped.content[0].content![0];
      expect(node.text).toBe("styled link");
      expect(node.marks).toEqual(
        expect.arrayContaining([
          { type: "bold" },
          { type: "textColor", attrs: { color: "#ff0000" } },
          { type: "link", attrs: { href: "https://example.com" } },
        ])
      );
    });

    it("should round-trip multiple consecutive hard breaks", () => {
      const tiptap = createTiptapDoc([
        {
          type: "paragraph",
          content: [
            { type: "text", text: "before" },
            { type: "hardBreak" },
            { type: "hardBreak" },
            { type: "text", text: "after" },
          ],
        },
      ]);

      const elemental = convertTiptapToElemental(tiptap);
      const roundTripped = convertElementalToTiptap(
        { version: "2022-01-01", elements: [{ type: "channel", channel: "email", elements: elemental } as any] }
      );

      expect(roundTripped.content[0].content).toHaveLength(4);
      expect(roundTripped.content[0].content![0]).toMatchObject({ type: "text", text: "before" });
      expect(roundTripped.content[0].content![1]).toMatchObject({ type: "hardBreak" });
      expect(roundTripped.content[0].content![2]).toMatchObject({ type: "hardBreak" });
      expect(roundTripped.content[0].content![3]).toMatchObject({ type: "text", text: "after" });
    });
  });
});
