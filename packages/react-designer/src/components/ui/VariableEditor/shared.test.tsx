import { describe, it, expect } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { parseStringToContent, contentToString } from "./shared";

describe("parseStringToContent", () => {
  it("should parse empty string to empty document", () => {
    const result = parseStringToContent("");
    expect(result).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
  });

  it("should parse null/undefined as empty", () => {
    const result = parseStringToContent(undefined as unknown as string);
    expect(result).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
  });

  it("should parse plain text without variables", () => {
    const result = parseStringToContent("Hello world");
    expect(result).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
      ],
    });
  });

  it("should parse a single variable", () => {
    const result = parseStringToContent("{{user.name}}");
    expect(result).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "variable", attrs: { id: "user.name" } }],
        },
      ],
    });
  });

  it("should parse text with a variable in the middle", () => {
    const result = parseStringToContent("Hello {{user.name}}, welcome!");
    expect(result).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello " },
            { type: "variable", attrs: { id: "user.name" } },
            { type: "text", text: ", welcome!" },
          ],
        },
      ],
    });
  });

  it("should parse multiple variables", () => {
    const result = parseStringToContent("{{greeting}} {{user.name}}!");
    expect(result).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "variable", attrs: { id: "greeting" } },
            { type: "text", text: " " },
            { type: "variable", attrs: { id: "user.name" } },
            { type: "text", text: "!" },
          ],
        },
      ],
    });
  });

  it("should parse variable at the start of text", () => {
    const result = parseStringToContent("{{name}} is here");
    expect(result).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "variable", attrs: { id: "name" } },
            { type: "text", text: " is here" },
          ],
        },
      ],
    });
  });

  it("should parse variable at the end of text", () => {
    const result = parseStringToContent("Welcome {{name}}");
    expect(result).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Welcome " },
            { type: "variable", attrs: { id: "name" } },
          ],
        },
      ],
    });
  });

  it("should trim whitespace from variable names", () => {
    const result = parseStringToContent("{{ user.name }}");
    expect(result).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "variable", attrs: { id: "user.name" } }],
        },
      ],
    });
  });

  it("should handle nested property paths in variable names", () => {
    const result = parseStringToContent("{{user.profile.firstName}}");
    expect(result).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "variable", attrs: { id: "user.profile.firstName" } }],
        },
      ],
    });
  });

  it("should keep invalid variable names as plain text", () => {
    // Empty variable name is invalid
    const result = parseStringToContent("{{}}");
    expect(result).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "{{}}" }],
        },
      ],
    });
  });
});

describe("contentToString", () => {
  it("should convert empty document to empty string", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [],
    };
    expect(contentToString(doc)).toBe("");
  });

  it("should convert document without content property to empty string", () => {
    const doc: JSONContent = {
      type: "doc",
    };
    expect(contentToString(doc)).toBe("");
  });

  it("should convert plain text", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
      ],
    };
    expect(contentToString(doc)).toBe("Hello world");
  });

  it("should convert a single variable", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "variable", attrs: { id: "user.name" } }],
        },
      ],
    };
    expect(contentToString(doc)).toBe("{{user.name}}");
  });

  it("should convert mixed text and variables", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello " },
            { type: "variable", attrs: { id: "user.name" } },
            { type: "text", text: ", welcome!" },
          ],
        },
      ],
    };
    expect(contentToString(doc)).toBe("Hello {{user.name}}, welcome!");
  });

  it("should convert multiple variables", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "variable", attrs: { id: "greeting" } },
            { type: "text", text: " " },
            { type: "variable", attrs: { id: "user.name" } },
          ],
        },
      ],
    };
    expect(contentToString(doc)).toBe("{{greeting}} {{user.name}}");
  });

  it("should handle empty paragraph", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
        },
      ],
    };
    expect(contentToString(doc)).toBe("");
  });

  it("should ignore variable nodes without id", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello " },
            { type: "variable", attrs: {} },
          ],
        },
      ],
    };
    expect(contentToString(doc)).toBe("Hello ");
  });
});

describe("parseStringToContent and contentToString roundtrip", () => {
  const testCases = [
    "",
    "Hello world",
    "{{user.name}}",
    "Hello {{user.name}}",
    "{{greeting}} {{user.name}}!",
    "Subject: {{title}} - {{date}}",
    "Order #{{order.id}} for {{customer.name}}",
  ];

  testCases.forEach((input) => {
    it(`should roundtrip "${input}"`, () => {
      const parsed = parseStringToContent(input);
      const result = contentToString(parsed as JSONContent);
      expect(result).toBe(input);
    });
  });
});
