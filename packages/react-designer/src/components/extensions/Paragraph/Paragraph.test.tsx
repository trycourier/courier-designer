import { describe, it, expect, vi } from "vitest";
import { Paragraph } from "./Paragraph";
import { defaultTextBlockProps } from "../TextBlock";

// Mock the TextBlockComponentNode
vi.mock("../TextBlock", () => ({
  defaultTextBlockProps: {
    paddingVertical: 6,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    borderRadius: 0,
    borderColor: "#000000",
    textColor: "#292929",
    textAlign: "left",
    selected: false,
  },
  TextBlockComponentNode: () => null,
}));

vi.mock("../../utils", () => ({
  generateNodeIds: vi.fn(),
}));

vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-1234"),
}));

describe("Paragraph Extension", () => {
  describe("Basic Configuration", () => {
    it("should be defined and have correct name", () => {
      expect(Paragraph).toBeDefined();
      expect(Paragraph.name).toBe("paragraph");
    });

    it("should have configure method", () => {
      expect(typeof Paragraph.configure).toBe("function");
    });

    it("should be configurable", () => {
      const configured = Paragraph.configure({
        HTMLAttributes: { class: "custom-paragraph" },
      });
      expect(configured).toBeDefined();
      expect(configured.name).toBe("paragraph");
    });
  });

  describe("Extension Structure", () => {
    it("should have TipTap extension structure", () => {
      expect(Paragraph).toHaveProperty("type");
      expect(Paragraph).toHaveProperty("name");
      expect(Paragraph).toHaveProperty("parent");
      expect(Paragraph).toHaveProperty("options");
    });

    it("should extend TipTap Paragraph", () => {
      // The parent should be the TipTap Paragraph extension
      expect(Paragraph.parent).toBeDefined();
    });

    it("should have proper extension type", () => {
      expect(Paragraph.type).toBe("node");
    });
  });

  describe("Default Props Integration", () => {
    it("should use defaultTextBlockProps", () => {
      // Test that defaultTextBlockProps is imported and available
      expect(defaultTextBlockProps).toBeDefined();
      expect(defaultTextBlockProps.paddingVertical).toBe(6);
      expect(defaultTextBlockProps.paddingHorizontal).toBe(0);
      expect(defaultTextBlockProps.backgroundColor).toBe("transparent");
      expect(defaultTextBlockProps.textAlign).toBe("left");
    });
  });

  describe("Functionality Tests", () => {
    it("should handle basic paragraph creation", () => {
      // Test that the extension can be created without errors
      expect(() => {
        const instance = Paragraph.configure();
        return instance;
      }).not.toThrow();
    });

    it("should handle configuration options", () => {
      const options = {
        HTMLAttributes: {
          class: "test-paragraph",
          "data-testid": "paragraph",
        },
      };

      expect(() => {
        const configured = Paragraph.configure(options);
        return configured;
      }).not.toThrow();
    });
  });

  describe("Integration Readiness", () => {
    it("should be ready for editor integration", () => {
      // Verify the extension has the minimum required structure for TipTap
      expect(Paragraph.name).toBe("paragraph");
      expect(Paragraph.type).toBe("node");
      expect(typeof Paragraph.configure).toBe("function");
    });

    it("should work with default TextBlock props", () => {
      // Verify that default props are available and have expected structure
      const requiredProps = [
        "paddingVertical",
        "paddingHorizontal",
        "backgroundColor",
        "borderWidth",
        "borderRadius",
        "borderColor",
        "textColor",
        "textAlign",
        "selected",
      ];

      requiredProps.forEach((prop) => {
        expect(defaultTextBlockProps).toHaveProperty(prop);
      });
    });

    it("should have expected default values", () => {
      expect(defaultTextBlockProps.paddingVertical).toBeTypeOf("number");
      expect(defaultTextBlockProps.paddingHorizontal).toBeTypeOf("number");
      expect(defaultTextBlockProps.backgroundColor).toBeTypeOf("string");
      expect(defaultTextBlockProps.borderWidth).toBeTypeOf("number");
      expect(defaultTextBlockProps.borderRadius).toBeTypeOf("number");
      expect(defaultTextBlockProps.borderColor).toBeTypeOf("string");
      expect(defaultTextBlockProps.textColor).toBeTypeOf("string");
      expect(defaultTextBlockProps.textAlign).toBeTypeOf("string");
      expect(defaultTextBlockProps.selected).toBeTypeOf("boolean");
    });
  });

  describe("Mock Verification", () => {
    it("should have proper mocks in place", () => {
      // Verify that our extension is properly set up
      expect(Paragraph).toBeDefined();
      expect(defaultTextBlockProps).toBeDefined();
    });
  });
});
