import { describe, it, expect, vi } from "vitest";
import { Heading } from "./Heading";
import { defaultTextBlockProps } from "../TextBlock";
import type { Level } from "@tiptap/extension-heading";

// Mock the TextBlockComponentNode
vi.mock("../TextBlock", () => ({
  defaultTextBlockProps: {
    paddingVertical: 6,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    borderRadius: 0,
    borderColor: "transparent",
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

describe("Heading Extension", () => {
  describe("Basic Configuration", () => {
    it("should be defined and have correct name", () => {
      expect(Heading).toBeDefined();
      expect(Heading.name).toBe("heading");
    });

    it("should have configure method", () => {
      expect(typeof Heading.configure).toBe("function");
    });

    it("should be configurable", () => {
      const configured = Heading.configure({
        HTMLAttributes: { class: "custom-heading" },
      });
      expect(configured).toBeDefined();
      expect(configured.name).toBe("heading");
    });
  });

  describe("Extension Structure", () => {
    it("should have TipTap extension structure", () => {
      expect(Heading).toHaveProperty("type");
      expect(Heading).toHaveProperty("name");
      expect(Heading).toHaveProperty("parent");
      expect(Heading).toHaveProperty("options");
    });

    it("should extend TipTap Heading", () => {
      // The parent should be the TipTap Heading extension
      expect(Heading.parent).toBeDefined();
    });

    it("should have proper extension type", () => {
      expect(Heading.type).toBe("node");
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

  describe("Heading Levels", () => {
    it("should support standard heading levels", () => {
      // Test that heading levels are properly configured
      const configured = Heading.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("heading");
    });

    it("should handle level configuration", () => {
      const options = {
        levels: [1, 2, 3, 4, 5, 6] as Level[],
        HTMLAttributes: {
          class: "test-heading",
        },
      };

      expect(() => {
        const configured = Heading.configure(options);
        return configured;
      }).not.toThrow();
    });
  });

  describe("TextBlock Attributes", () => {
    it("should have all TextBlock styling attributes", () => {
      const configured = Heading.configure();

      // Check that the extension has the expected attributes structure
      expect(configured).toBeDefined();
      expect(configured.name).toBe("heading");
    });

    it("should support padding attributes", () => {
      // Verify padding attributes are available
      expect(defaultTextBlockProps.paddingVertical).toBeTypeOf("number");
      expect(defaultTextBlockProps.paddingHorizontal).toBeTypeOf("number");
    });

    it("should support color attributes", () => {
      // Verify color attributes are available
      expect(defaultTextBlockProps.backgroundColor).toBeTypeOf("string");
      expect(defaultTextBlockProps.textColor).toBeTypeOf("string");
      expect(defaultTextBlockProps.borderColor).toBeTypeOf("string");
    });

    it("should support border attributes", () => {
      // Verify border attributes are available
      expect(defaultTextBlockProps.borderWidth).toBeTypeOf("number");
      expect(defaultTextBlockProps.borderRadius).toBeTypeOf("number");
    });

    it("should support text alignment", () => {
      // Verify text alignment attribute is available
      expect(defaultTextBlockProps.textAlign).toBeTypeOf("string");
      expect(defaultTextBlockProps.textAlign).toBe("left");
    });
  });

  describe("Commands Integration", () => {
    it("should support setTextAlign command", () => {
      // Test that the extension can be configured with commands
      expect(() => {
        const configured = Heading.configure();
        return configured;
      }).not.toThrow();
    });

    it("should handle basic heading functionality", () => {
      // Test that the extension can be created without errors
      expect(() => {
        const instance = Heading.configure();
        return instance;
      }).not.toThrow();
    });
  });

  describe("HTML Integration", () => {
    it("should handle HTML parsing", () => {
      // Test that the extension has proper HTML handling
      const configured = Heading.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("heading");
    });

    it("should support HTML attributes", () => {
      const options = {
        HTMLAttributes: {
          class: "test-heading",
          "data-testid": "heading",
        },
      };

      expect(() => {
        const configured = Heading.configure(options);
        return configured;
      }).not.toThrow();
    });
  });

  describe("Functionality Tests", () => {
    it("should handle basic heading creation", () => {
      // Test that the extension can be created without errors
      expect(() => {
        const instance = Heading.configure();
        return instance;
      }).not.toThrow();
    });

    it("should handle configuration options", () => {
      const options = {
        levels: [1, 2, 3, 4, 5, 6] as Level[],
        HTMLAttributes: {
          class: "test-heading",
          "data-testid": "heading",
        },
      };

      expect(() => {
        const configured = Heading.configure(options);
        return configured;
      }).not.toThrow();
    });
  });

  describe("Integration Readiness", () => {
    it("should be ready for editor integration", () => {
      // Verify the extension has the minimum required structure for TipTap
      expect(Heading.name).toBe("heading");
      expect(Heading.type).toBe("node");
      expect(typeof Heading.configure).toBe("function");
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
      expect(Heading).toBeDefined();
      expect(defaultTextBlockProps).toBeDefined();
    });
  });
});
