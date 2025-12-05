import { describe, it, expect } from "vitest";
import type { Content, JSONContent } from "@tiptap/core";
import { isValidVariableName } from "../../utils/validateVariableName";

/**
 * Parses a string with {{variable}} syntax into TipTap JSON content
 * (copied from VariableInput.tsx for testing)
 */
function parseStringToContent(text: string): Content {
  if (!text) {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
  }

  const variableRegex = /\{\{([^}]+)\}\}/g;
  const nodes: JSONContent[] = [];
  let lastIndex = 0;
  let match;

  while ((match = variableRegex.exec(text)) !== null) {
    // Add text before the variable
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index);
      if (beforeText) {
        nodes.push({ type: "text", text: beforeText });
      }
    }

    // Add the variable node
    const variableName = match[1].trim();
    if (isValidVariableName(variableName)) {
      nodes.push({ type: "variable", attrs: { id: variableName } });
    } else {
      // Invalid variable name, keep as plain text
      nodes.push({ type: "text", text: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last variable
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      nodes.push({ type: "text", text: remainingText });
    }
  }

  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: nodes.length > 0 ? nodes : undefined,
      },
    ],
  };
}

/**
 * Converts TipTap JSON content back to string with {{variable}} syntax
 * (copied from VariableInput.tsx for testing)
 */
function contentToString(doc: JSONContent): string {
  if (!doc.content) return "";

  let result = "";

  const processNode = (node: JSONContent) => {
    if (node.type === "text" && node.text) {
      result += node.text;
    } else if (node.type === "variable" && node.attrs?.id) {
      result += `{{${node.attrs.id}}}`;
    } else if (node.type === "paragraph" || node.type === "doc") {
      if (node.content) {
        node.content.forEach((child) => processNode(child));
      }
    }
  };

  doc.content.forEach((node) => processNode(node));
  return result;
}

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

