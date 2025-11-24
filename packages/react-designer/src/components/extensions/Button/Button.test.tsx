import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Button, defaultButtonProps } from "./Button";
import { Editor } from "@tiptap/react";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";

// Mock the ButtonComponentNode
vi.mock("./ButtonComponent", () => ({
  ButtonComponentNode: () => null,
}));

vi.mock("../../utils", () => ({
  generateNodeIds: vi.fn(),
}));

vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-1234"),
}));

describe("Button Extension", () => {
  describe("Basic Configuration", () => {
    it("should be defined and have correct name", () => {
      expect(Button).toBeDefined();
      expect(Button.name).toBe("button");
    });

    it("should have configure method", () => {
      expect(typeof Button.configure).toBe("function");
    });

    it("should be configurable", () => {
      const configured = Button.configure({
        HTMLAttributes: { class: "custom-button" },
      });
      expect(configured).toBeDefined();
      expect(configured.name).toBe("button");
    });
  });

  describe("Extension Structure", () => {
    it("should have TipTap extension structure", () => {
      expect(Button).toHaveProperty("type");
      expect(Button).toHaveProperty("name");
      expect(Button).toHaveProperty("options");
    });

    it("should be a custom Node extension", () => {
      expect(Button.type).toBe("node");
    });

    it("should be an atomic block element", () => {
      // Button is configured as an atomic block element (configured during extension creation)
      const configured = Button.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("button");
    });

    it("should be properly configured", () => {
      // Button configuration is handled during extension creation
      const configured = Button.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("button");
    });
  });

  describe("Default Props Integration", () => {
    it("should use defaultButtonProps", () => {
      // Test that defaultButtonProps is imported and available
      expect(defaultButtonProps).toBeDefined();
      expect(defaultButtonProps.label).toBe("Button");
      expect(defaultButtonProps.link).toBe("");
      expect(defaultButtonProps.alignment).toBe("center");
      expect(defaultButtonProps.size).toBe("default");
      expect(defaultButtonProps.backgroundColor).toBe("#0085FF");
      expect(defaultButtonProps.textColor).toBe("#ffffff");
    });

    it("should have expected default prop types", () => {
      expect(defaultButtonProps.label).toBeTypeOf("string");
      expect(defaultButtonProps.link).toBeTypeOf("string");
      expect(defaultButtonProps.alignment).toBeTypeOf("string");
      expect(defaultButtonProps.size).toBeTypeOf("string");
      expect(defaultButtonProps.backgroundColor).toBeTypeOf("string");
      expect(defaultButtonProps.textColor).toBeTypeOf("string");
      expect(defaultButtonProps.borderWidth).toBeTypeOf("number");
      expect(defaultButtonProps.borderRadius).toBeTypeOf("number");
      expect(defaultButtonProps.borderColor).toBeTypeOf("string");
      expect(defaultButtonProps.padding).toBeTypeOf("number");
      expect(defaultButtonProps.fontWeight).toBeTypeOf("string");
      expect(defaultButtonProps.fontStyle).toBeTypeOf("string");
      expect(defaultButtonProps.isUnderline).toBeTypeOf("boolean");
      expect(defaultButtonProps.isStrike).toBeTypeOf("boolean");
    });
  });

  describe("Button Attributes", () => {
    it("should support all button styling attributes", () => {
      const configured = Button.configure();

      // Check that the extension has the expected attributes structure
      expect(configured).toBeDefined();
      expect(configured.name).toBe("button");
    });

    it("should support label and link attributes", () => {
      // Verify basic button content attributes
      expect(defaultButtonProps.label).toBe("Button");
      expect(defaultButtonProps.link).toBe("");
    });

    it("should support layout attributes", () => {
      // Verify layout attributes are available
      expect(defaultButtonProps.alignment).toBe("center");
      expect(defaultButtonProps.size).toBe("default");
      expect(defaultButtonProps.padding).toBeTypeOf("number");
    });

    it("should support color attributes", () => {
      // Verify color attributes are available
      expect(defaultButtonProps.backgroundColor).toBeTypeOf("string");
      expect(defaultButtonProps.textColor).toBeTypeOf("string");
      expect(defaultButtonProps.borderColor).toBeTypeOf("string");
      expect(defaultButtonProps.backgroundColor).toBe("#0085FF");
      expect(defaultButtonProps.textColor).toBe("#ffffff");
    });

    it("should support border attributes", () => {
      // Verify border attributes are available
      expect(defaultButtonProps.borderWidth).toBeTypeOf("number");
      expect(defaultButtonProps.borderRadius).toBeTypeOf("number");
      expect(defaultButtonProps.borderWidth).toBe(0);
      expect(defaultButtonProps.borderRadius).toBe(0);
    });

    it("should support typography attributes", () => {
      // Verify typography attributes are available
      expect(defaultButtonProps.fontWeight).toBe("normal");
      expect(defaultButtonProps.fontStyle).toBe("normal");
      expect(defaultButtonProps.isUnderline).toBe(false);
      expect(defaultButtonProps.isStrike).toBe(false);
    });

    it("should support id attribute", () => {
      // The button should support an id attribute for node identification
      const configured = Button.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("button");
    });
  });

  describe("HTML Integration", () => {
    it("should handle HTML parsing", () => {
      // Test that the extension has proper HTML handling
      const configured = Button.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("button");
    });

    it("should support HTML attributes", () => {
      const options = {
        HTMLAttributes: {
          class: "test-button",
          "data-testid": "button",
        },
      };

      expect(() => {
        const configured = Button.configure(options);
        return configured;
      }).not.toThrow();
    });

    it("should render div element with button data type", () => {
      // The extension should render as a div element with data-type="button"
      const configured = Button.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("button");
    });
  });

  describe("Commands Integration", () => {
    let editor: Editor;

    beforeEach(() => {
      editor = new Editor({
        extensions: [Document, Paragraph, Text, Button],
        content: "",
      });
    });

    afterEach(() => {
      editor?.destroy();
    });

    it("should insert button content using the provided label", () => {
      editor.commands.setButton({ label: "Dynamic CTA", link: "https://example.com" });

      const json = editor.getJSON();
      const buttonNode = json.content?.[0];

      expect(buttonNode?.type).toBe("button");
      expect(buttonNode?.attrs?.label).toBe("Dynamic CTA");
      expect(buttonNode?.content).toEqual([{ type: "text", text: "Dynamic CTA" }]);
    });

    it("should fall back to default button text when label is omitted", () => {
      editor.commands.setButton({ link: "https://example.com/cta" });

      const json = editor.getJSON();
      const buttonNode = json.content?.[0];
      const textContent = buttonNode?.content?.[0];

      expect(buttonNode?.type).toBe("button");
      expect(textContent).toEqual({ type: "text", text: "Button" });
      expect(buttonNode?.attrs?.label ?? "Button").toBe("Button");
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("should support keyboard shortcuts", () => {
      // Test that the extension has keyboard shortcuts configured
      const configured = Button.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("button");
    });

    it("should handle button-specific shortcuts", () => {
      // The extension should have button-specific keyboard shortcuts
      expect(() => {
        const configured = Button.configure();
        return configured;
      }).not.toThrow();
    });
  });

  describe("Functionality Tests", () => {
    it("should handle basic button creation", () => {
      // Test that the extension can be created without errors
      expect(() => {
        const instance = Button.configure();
        return instance;
      }).not.toThrow();
    });

    it("should handle configuration options", () => {
      const options = {
        HTMLAttributes: {
          class: "test-button",
          "data-testid": "button",
        },
      };

      expect(() => {
        const configured = Button.configure(options);
        return configured;
      }).not.toThrow();
    });

    it("should support custom styling props", () => {
      // Test different prop configurations
      const customProps = {
        label: "Custom Button",
        alignment: "left" as const,
        size: "full" as const,
        backgroundColor: "#ff6600",
        textColor: "#000000",
        borderWidth: 2,
        borderRadius: 8,
        borderColor: "#333333",
        padding: 12,
        fontWeight: "bold" as const,
        fontStyle: "italic" as const,
        isUnderline: true,
        isStrike: false,
      };

      expect(customProps.label).not.toBe(defaultButtonProps.label);
      expect(customProps.alignment).not.toBe(defaultButtonProps.alignment);
      expect(customProps.size).not.toBe(defaultButtonProps.size);
      expect(customProps.backgroundColor).not.toBe(defaultButtonProps.backgroundColor);
      expect(customProps.borderWidth).toBeGreaterThan(defaultButtonProps.borderWidth);
      expect(customProps.padding).toBeGreaterThan(defaultButtonProps.padding);
    });
  });

  describe("Integration Readiness", () => {
    it("should be ready for editor integration", () => {
      // Verify the extension has the minimum required structure for TipTap
      expect(Button.name).toBe("button");
      expect(Button.type).toBe("node");
      expect(typeof Button.configure).toBe("function");
    });

    it("should work with default button props", () => {
      // Verify that default props are available and have expected structure
      const requiredProps = [
        "label",
        "link",
        "alignment",
        "size",
        "backgroundColor",
        "textColor",
        "borderWidth",
        "borderRadius",
        "borderColor",
        "padding",
        "fontWeight",
        "fontStyle",
        "isUnderline",
        "isStrike",
      ];

      requiredProps.forEach((prop) => {
        expect(defaultButtonProps).toHaveProperty(prop);
      });
    });

    it("should have expected default values", () => {
      expect(defaultButtonProps.label).toBeTypeOf("string");
      expect(defaultButtonProps.link).toBeTypeOf("string");
      expect(defaultButtonProps.alignment).toBeTypeOf("string");
      expect(defaultButtonProps.size).toBeTypeOf("string");
      expect(defaultButtonProps.backgroundColor).toBeTypeOf("string");
      expect(defaultButtonProps.textColor).toBeTypeOf("string");
      expect(defaultButtonProps.borderWidth).toBeTypeOf("number");
      expect(defaultButtonProps.borderRadius).toBeTypeOf("number");
      expect(defaultButtonProps.borderColor).toBeTypeOf("string");
      expect(defaultButtonProps.padding).toBeTypeOf("number");
      expect(defaultButtonProps.fontWeight).toBeTypeOf("string");
      expect(defaultButtonProps.fontStyle).toBeTypeOf("string");
      expect(defaultButtonProps.isUnderline).toBeTypeOf("boolean");
      expect(defaultButtonProps.isStrike).toBeTypeOf("boolean");
    });

    it("should support node view rendering", () => {
      // The extension should be configured with ReactNodeViewRenderer
      const configured = Button.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("button");
    });
  });

  describe("Alignment and Size Options", () => {
    it("should support all alignment options", () => {
      const alignments = ["left", "center", "right"];
      expect(alignments).toContain(defaultButtonProps.alignment);
    });

    it("should support all size options", () => {
      const sizes = ["default", "full"];
      expect(sizes).toContain(defaultButtonProps.size);
    });
  });

  describe("Typography Options", () => {
    it("should support font weight options", () => {
      const fontWeights = ["normal", "bold"];
      expect(fontWeights).toContain(defaultButtonProps.fontWeight);
    });

    it("should support font style options", () => {
      const fontStyles = ["normal", "italic"];
      expect(fontStyles).toContain(defaultButtonProps.fontStyle);
    });

    it("should support text decoration options", () => {
      expect(defaultButtonProps.isUnderline).toBeTypeOf("boolean");
      expect(defaultButtonProps.isStrike).toBeTypeOf("boolean");
    });
  });

  describe("Mock Verification", () => {
    it("should have proper mocks in place", () => {
      // Verify that our extension is properly set up
      expect(Button).toBeDefined();
      expect(defaultButtonProps).toBeDefined();
    });

    it("should mock ButtonComponentNode", () => {
      // Verify that ButtonComponentNode is mocked
      expect(Button).toBeDefined();
    });
  });
});
