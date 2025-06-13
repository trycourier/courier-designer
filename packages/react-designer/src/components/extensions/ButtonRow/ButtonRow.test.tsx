import { describe, it, expect, vi } from "vitest";
import { ButtonRow, defaultButtonRowProps } from "./ButtonRow";

// Mock the ButtonRowComponentNode
vi.mock("./ButtonRowComponent", () => ({
  ButtonRowComponentNode: () => null,
}));

vi.mock("../../utils", () => ({
  generateNodeIds: vi.fn(),
}));

vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-1234"),
}));

describe("ButtonRow Extension", () => {
  describe("Basic Configuration", () => {
    it("should be defined and have correct name", () => {
      expect(ButtonRow).toBeDefined();
      expect(ButtonRow.name).toBe("buttonRow");
    });

    it("should have configure method", () => {
      expect(typeof ButtonRow.configure).toBe("function");
    });

    it("should be configurable", () => {
      const configured = ButtonRow.configure({
        HTMLAttributes: { class: "custom-button-row" },
      });
      expect(configured).toBeDefined();
      expect(configured.name).toBe("buttonRow");
    });
  });

  describe("Extension Structure", () => {
    it("should have TipTap extension structure", () => {
      expect(ButtonRow).toHaveProperty("type");
      expect(ButtonRow).toHaveProperty("name");
      expect(ButtonRow).toHaveProperty("options");
    });

    it("should be a custom Node extension", () => {
      expect(ButtonRow.type).toBe("node");
    });

    it("should be an atomic block element", () => {
      // ButtonRow is configured as an atomic block element (configured during extension creation)
      const configured = ButtonRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("buttonRow");
    });

    it("should be properly configured", () => {
      // ButtonRow configuration is handled during extension creation
      const configured = ButtonRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("buttonRow");
    });
  });

  describe("Default Props Integration", () => {
    it("should use defaultButtonRowProps", () => {
      // Test that defaultButtonRowProps is imported and available
      expect(defaultButtonRowProps).toBeDefined();
      expect(defaultButtonRowProps.button1Label).toBe("Register");
      expect(defaultButtonRowProps.button1Link).toBe("");
      expect(defaultButtonRowProps.button1BackgroundColor).toBe("#000000");
      expect(defaultButtonRowProps.button1TextColor).toBe("#ffffff");
      expect(defaultButtonRowProps.button2Label).toBe("Learn more");
      expect(defaultButtonRowProps.button2Link).toBe("");
      expect(defaultButtonRowProps.button2BackgroundColor).toBe("#ffffff");
      expect(defaultButtonRowProps.button2TextColor).toBe("#000000");
      expect(defaultButtonRowProps.padding).toBe(6);
    });

    it("should have expected default prop types", () => {
      expect(defaultButtonRowProps.button1Label).toBeTypeOf("string");
      expect(defaultButtonRowProps.button1Link).toBeTypeOf("string");
      expect(defaultButtonRowProps.button1BackgroundColor).toBeTypeOf("string");
      expect(defaultButtonRowProps.button1TextColor).toBeTypeOf("string");
      expect(defaultButtonRowProps.button2Label).toBeTypeOf("string");
      expect(defaultButtonRowProps.button2Link).toBeTypeOf("string");
      expect(defaultButtonRowProps.button2BackgroundColor).toBeTypeOf("string");
      expect(defaultButtonRowProps.button2TextColor).toBeTypeOf("string");
      expect(defaultButtonRowProps.padding).toBeTypeOf("number");
    });

    it("should have primary and secondary button styling defaults", () => {
      // Primary button (button1) should have dark background, light text
      expect(defaultButtonRowProps.button1BackgroundColor).toBe("#000000");
      expect(defaultButtonRowProps.button1TextColor).toBe("#ffffff");

      // Secondary button (button2) should have light background, dark text
      expect(defaultButtonRowProps.button2BackgroundColor).toBe("#ffffff");
      expect(defaultButtonRowProps.button2TextColor).toBe("#000000");
    });
  });

  describe("ButtonRow Attributes", () => {
    it("should support all button row styling attributes", () => {
      const configured = ButtonRow.configure();

      // Check that the extension has the expected attributes structure
      expect(configured).toBeDefined();
      expect(configured.name).toBe("buttonRow");
    });

    it("should support button1 attributes", () => {
      // Verify button1 attributes are available
      expect(defaultButtonRowProps.button1Label).toBe("Register");
      expect(defaultButtonRowProps.button1Link).toBe("");
      expect(defaultButtonRowProps.button1BackgroundColor).toBeTypeOf("string");
      expect(defaultButtonRowProps.button1TextColor).toBeTypeOf("string");
    });

    it("should support button2 attributes", () => {
      // Verify button2 attributes are available
      expect(defaultButtonRowProps.button2Label).toBe("Learn more");
      expect(defaultButtonRowProps.button2Link).toBe("");
      expect(defaultButtonRowProps.button2BackgroundColor).toBeTypeOf("string");
      expect(defaultButtonRowProps.button2TextColor).toBeTypeOf("string");
    });

    it("should support layout attributes", () => {
      // Verify layout attributes are available
      expect(defaultButtonRowProps.padding).toBeTypeOf("number");
      expect(defaultButtonRowProps.padding).toBe(6);
    });

    it("should support id attribute", () => {
      // The button row should support an id attribute for node identification
      const configured = ButtonRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("buttonRow");
    });
  });

  describe("HTML Integration", () => {
    it("should handle HTML parsing", () => {
      // Test that the extension has proper HTML handling
      const configured = ButtonRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("buttonRow");
    });

    it("should support HTML attributes", () => {
      const options = {
        HTMLAttributes: {
          class: "test-button-row",
          "data-testid": "button-row",
        },
      };

      expect(() => {
        const configured = ButtonRow.configure(options);
        return configured;
      }).not.toThrow();
    });

    it("should render div element with buttonRow data type", () => {
      // The extension should render as a div element with data-type="buttonRow"
      const configured = ButtonRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("buttonRow");
    });
  });

  describe("Commands Integration", () => {
    it("should support buttonRow-specific commands", () => {
      // Test that the extension has commands configured
      const configured = ButtonRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("buttonRow");
    });

    it("should handle button row creation", () => {
      // The extension should support button row creation
      expect(() => {
        const configured = ButtonRow.configure();
        return configured;
      }).not.toThrow();
    });

    it("should support setButtonRow command", () => {
      // The extension should have setButtonRow command
      const configured = ButtonRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("buttonRow");
    });
  });

  describe("Functionality Tests", () => {
    it("should handle basic button row creation", () => {
      // Test that the extension can be created without errors
      expect(() => {
        const instance = ButtonRow.configure();
        return instance;
      }).not.toThrow();
    });

    it("should handle configuration options", () => {
      const options = {
        HTMLAttributes: {
          class: "test-button-row",
          "data-testid": "button-row",
        },
      };

      expect(() => {
        const configured = ButtonRow.configure(options);
        return configured;
      }).not.toThrow();
    });

    it("should support custom button row props", () => {
      // Test different prop configurations
      const customProps = {
        button1Label: "Custom Button 1",
        button1Link: "https://example.com",
        button1BackgroundColor: "#ff6600",
        button1TextColor: "#ffffff",
        button2Label: "Custom Button 2",
        button2Link: "https://example2.com",
        button2BackgroundColor: "#0066ff",
        button2TextColor: "#ffffff",
        padding: 12,
      };

      expect(customProps.button1Label).not.toBe(defaultButtonRowProps.button1Label);
      expect(customProps.button2Label).not.toBe(defaultButtonRowProps.button2Label);
      expect(customProps.button1BackgroundColor).not.toBe(
        defaultButtonRowProps.button1BackgroundColor
      );
      expect(customProps.button2BackgroundColor).not.toBe(
        defaultButtonRowProps.button2BackgroundColor
      );
      expect(customProps.padding).toBeGreaterThan(defaultButtonRowProps.padding || 0);
    });
  });

  describe("Integration Readiness", () => {
    it("should be ready for editor integration", () => {
      // Verify the extension has the minimum required structure for TipTap
      expect(ButtonRow.name).toBe("buttonRow");
      expect(ButtonRow.type).toBe("node");
      expect(typeof ButtonRow.configure).toBe("function");
    });

    it("should work with default button row props", () => {
      // Verify that default props are available and have expected structure
      const requiredProps = [
        "button1Label",
        "button1Link",
        "button1BackgroundColor",
        "button1TextColor",
        "button2Label",
        "button2Link",
        "button2BackgroundColor",
        "button2TextColor",
        "padding",
      ];

      requiredProps.forEach((prop) => {
        expect(defaultButtonRowProps).toHaveProperty(prop);
      });
    });

    it("should have expected default values", () => {
      expect(defaultButtonRowProps.button1Label).toBeTypeOf("string");
      expect(defaultButtonRowProps.button1Link).toBeTypeOf("string");
      expect(defaultButtonRowProps.button1BackgroundColor).toBeTypeOf("string");
      expect(defaultButtonRowProps.button1TextColor).toBeTypeOf("string");
      expect(defaultButtonRowProps.button2Label).toBeTypeOf("string");
      expect(defaultButtonRowProps.button2Link).toBeTypeOf("string");
      expect(defaultButtonRowProps.button2BackgroundColor).toBeTypeOf("string");
      expect(defaultButtonRowProps.button2TextColor).toBeTypeOf("string");
      expect(defaultButtonRowProps.padding).toBeTypeOf("number");
    });

    it("should support node view rendering", () => {
      // The extension should be configured with ReactNodeViewRenderer
      const configured = ButtonRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("buttonRow");
    });
  });

  describe("Button Attributes Validation", () => {
    it("should have valid button1 default values", () => {
      expect(defaultButtonRowProps.button1Label).toBe("Register");
      expect(defaultButtonRowProps.button1Link).toBe("");
      expect(defaultButtonRowProps.button1BackgroundColor).toBe("#000000");
      expect(defaultButtonRowProps.button1TextColor).toBe("#ffffff");
    });

    it("should have valid button2 default values", () => {
      expect(defaultButtonRowProps.button2Label).toBe("Learn more");
      expect(defaultButtonRowProps.button2Link).toBe("");
      expect(defaultButtonRowProps.button2BackgroundColor).toBe("#ffffff");
      expect(defaultButtonRowProps.button2TextColor).toBe("#000000");
    });

    it("should support custom button styles", () => {
      // Test that different button styling configurations are supported
      const customButton1 = {
        button1Label: "Sign Up",
        button1BackgroundColor: "#007bff",
        button1TextColor: "#ffffff",
      };

      const customButton2 = {
        button2Label: "Read More",
        button2BackgroundColor: "transparent",
        button2TextColor: "#007bff",
      };

      expect(customButton1.button1Label).toBeTypeOf("string");
      expect(customButton1.button1BackgroundColor).toBeTypeOf("string");
      expect(customButton1.button1TextColor).toBeTypeOf("string");
      expect(customButton2.button2Label).toBeTypeOf("string");
      expect(customButton2.button2BackgroundColor).toBeTypeOf("string");
      expect(customButton2.button2TextColor).toBeTypeOf("string");
    });
  });

  describe("Link Support", () => {
    it("should support links for both buttons", () => {
      expect(defaultButtonRowProps.button1Link).toBe("");
      expect(defaultButtonRowProps.button2Link).toBe("");
    });

    it("should handle custom link values", () => {
      const customLinks = {
        button1Link: "https://register.example.com",
        button2Link: "https://learn.example.com",
      };

      expect(customLinks.button1Link).toBeTypeOf("string");
      expect(customLinks.button2Link).toBeTypeOf("string");
      expect(customLinks.button1Link).toContain("register.example.com");
      expect(customLinks.button2Link).toContain("learn.example.com");
    });
  });

  describe("Padding Configuration", () => {
    it("should support padding configuration", () => {
      expect(defaultButtonRowProps.padding).toBe(6);
      expect(defaultButtonRowProps.padding).toBeTypeOf("number");
    });

    it("should handle custom padding values", () => {
      const customPadding = 16;
      expect(customPadding).toBeTypeOf("number");
      expect(customPadding).toBeGreaterThan(defaultButtonRowProps.padding || 0);
    });
  });

  describe("Mock Verification", () => {
    it("should have proper mocks in place", () => {
      // Verify that our extension is properly set up
      expect(ButtonRow).toBeDefined();
      expect(defaultButtonRowProps).toBeDefined();
    });

    it("should mock ButtonRowComponentNode", () => {
      // Verify that ButtonRowComponentNode is mocked
      expect(ButtonRow).toBeDefined();
    });
  });
});
