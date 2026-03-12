import { describe, it, expect } from "vitest";
import { validateElemental } from "./elemental.schema";

describe("validateElemental", () => {
  const wrapInContent = (elements: unknown[]) => ({
    version: "2022-01-01",
    elements,
  });

  describe("text node locales", () => {
    it("should accept text node with content-string locales", () => {
      const result = validateElemental(
        wrapInContent([
          {
            type: "text",
            content: "Hello",
            locales: {
              fr: { content: "Bonjour" },
            },
          },
        ])
      );

      expect(result.success).toBe(true);
    });

    it("should accept text node with elements-array locales", () => {
      const result = validateElemental(
        wrapInContent([
          {
            type: "text",
            elements: [{ type: "string", content: "Hello" }],
            locales: {
              fr: {
                elements: [{ type: "string", content: "Bonjour" }],
              },
            },
          },
        ])
      );

      expect(result.success).toBe(true);
    });

    it("should accept text node with mixed content and elements locales", () => {
      const result = validateElemental(
        wrapInContent([
          {
            type: "text",
            elements: [
              { type: "string", content: "Welcome, ", bold: true },
              { type: "string", content: "friend" },
            ],
            locales: {
              fr: { content: "Bonjour l'ami" },
              es: {
                elements: [
                  { type: "string", content: "Bienvenido, ", bold: true },
                  { type: "string", content: "amigo" },
                ],
              },
            },
          },
        ])
      );

      expect(result.success).toBe(true);
    });

    it("should accept text node locales with link elements", () => {
      const result = validateElemental(
        wrapInContent([
          {
            type: "text",
            elements: [
              { type: "link", content: "Click", href: "https://example.com" },
            ],
            locales: {
              fr: {
                elements: [
                  { type: "link", content: "Cliquer", href: "https://example.fr" },
                ],
              },
            },
          },
        ])
      );

      expect(result.success).toBe(true);
    });
  });

  describe("action node locales", () => {
    it("should accept action node with locales", () => {
      const result = validateElemental(
        wrapInContent([
          {
            type: "action",
            content: "Click",
            href: "https://example.com",
            locales: {
              fr: { content: "Cliquer", href: "https://example.fr" },
            },
          },
        ])
      );

      expect(result.success).toBe(true);
    });

    it("should accept action node with partial locales", () => {
      const result = validateElemental(
        wrapInContent([
          {
            type: "action",
            content: "Click",
            href: "https://example.com",
            locales: {
              fr: { content: "Cliquer" },
            },
          },
        ])
      );

      expect(result.success).toBe(true);
    });

    it("should accept action node without locales", () => {
      const result = validateElemental(
        wrapInContent([
          {
            type: "action",
            content: "Click",
            href: "https://example.com",
          },
        ])
      );

      expect(result.success).toBe(true);
    });
  });

  describe("quote node locales", () => {
    it("should accept quote node with locales", () => {
      const result = validateElemental(
        wrapInContent([
          {
            type: "quote",
            content: "To be or not to be",
            locales: {
              fr: { content: "Être ou ne pas être" },
            },
          },
        ])
      );

      expect(result.success).toBe(true);
    });

    it("should accept quote node without locales", () => {
      const result = validateElemental(
        wrapInContent([
          {
            type: "quote",
            content: "To be or not to be",
          },
        ])
      );

      expect(result.success).toBe(true);
    });
  });

  describe("other node type locales", () => {
    it("should accept image node with locales", () => {
      const result = validateElemental(
        wrapInContent([
          {
            type: "image",
            src: "https://example.com/img.png",
            locales: {
              fr: { src: "https://example.fr/img.png" },
            },
          },
        ])
      );

      expect(result.success).toBe(true);
    });

    it("should accept html node with locales", () => {
      const result = validateElemental(
        wrapInContent([
          {
            type: "html",
            content: "<div>Hello</div>",
            locales: {
              fr: { content: "<div>Bonjour</div>" },
            },
          },
        ])
      );

      expect(result.success).toBe(true);
    });

    it("should accept meta node with locales", () => {
      const result = validateElemental(
        wrapInContent([
          {
            type: "meta",
            title: "Subject",
            locales: {
              fr: { title: "Sujet" },
            },
          },
        ])
      );

      expect(result.success).toBe(true);
    });
  });
});
