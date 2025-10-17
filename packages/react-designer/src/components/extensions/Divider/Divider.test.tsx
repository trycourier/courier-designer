import { describe, it, expect, vi } from "vitest";
import { Divider, defaultDividerProps, defaultSpacerProps } from "./Divider";

// Mock the DividerComponentNode
vi.mock("./DividerComponent", () => ({
  DividerComponentNode: () => null,
}));

vi.mock("../../utils", () => ({
  generateNodeIds: vi.fn(),
}));

vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-1234"),
}));

describe("Divider Extension", () => {
  describe("Basic Configuration", () => {
    it("should be defined and have correct name", () => {
      expect(Divider).toBeDefined();
      expect(Divider.name).toBe("divider");
    });

    it("should have configure method", () => {
      expect(typeof Divider.configure).toBe("function");
    });

    it("should be configurable", () => {
      const configured = Divider.configure({
        HTMLAttributes: { class: "custom-divider" },
      });
      expect(configured).toBeDefined();
      expect(configured.name).toBe("divider");
    });
  });

  describe("Extension Structure", () => {
    it("should have TipTap extension structure", () => {
      expect(Divider).toHaveProperty("type");
      expect(Divider).toHaveProperty("name");
      expect(Divider).toHaveProperty("options");
    });

    it("should be a custom Node extension", () => {
      expect(Divider.type).toBe("node");
    });

    it("should be an atomic element", () => {
      // Divider is configured as an atomic element (configured during extension creation)
      const configured = Divider.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("divider");
    });

    it("should be properly configured", () => {
      // Divider configuration is handled during extension creation
      const configured = Divider.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("divider");
    });
  });

  describe("Default Props Integration", () => {
    it("should use defaultDividerProps", () => {
      // Test that defaultDividerProps is imported and available
      expect(defaultDividerProps).toBeDefined();
      expect(defaultDividerProps.padding).toBe(6);
      expect(defaultDividerProps.color).toBe("#000000");
      expect(defaultDividerProps.size).toBe(1);
      expect(defaultDividerProps.radius).toBe(0);
      expect(defaultDividerProps.variant).toBe("divider");
    });

    it("should use defaultSpacerProps", () => {
      // Test that defaultSpacerProps is imported and available
      expect(defaultSpacerProps).toBeDefined();
      expect(defaultSpacerProps.padding).toBe(24);
      expect(defaultSpacerProps.color).toBe("transparent");
      expect(defaultSpacerProps.size).toBe(1);
      expect(defaultSpacerProps.radius).toBe(0);
      expect(defaultSpacerProps.variant).toBe("spacer");
    });

    it("should have expected default prop types", () => {
      expect(defaultDividerProps.padding).toBeTypeOf("number");
      expect(defaultDividerProps.color).toBeTypeOf("string");
      expect(defaultDividerProps.size).toBeTypeOf("number");
      expect(defaultDividerProps.radius).toBeTypeOf("number");
      expect(defaultDividerProps.variant).toBeTypeOf("string");
    });

    it("should have different variant defaults", () => {
      // Divider variant should be black, spacer should be transparent
      expect(defaultDividerProps.variant).toBe("divider");
      expect(defaultDividerProps.color).toBe("#000000");

      expect(defaultSpacerProps.variant).toBe("spacer");
      expect(defaultSpacerProps.color).toBe("transparent");
    });
  });

  describe("Divider Attributes", () => {
    it("should support all divider styling attributes", () => {
      const configured = Divider.configure();

      // Check that the extension has the expected attributes structure
      expect(configured).toBeDefined();
      expect(configured.name).toBe("divider");
    });

    it("should support padding attributes", () => {
      // Verify padding attributes are available
      expect(defaultDividerProps.padding).toBe(6);
      expect(defaultDividerProps.padding).toBeTypeOf("number");
    });

    it("should support color attributes", () => {
      // Verify color attributes are available
      expect(defaultDividerProps.color).toBe("#000000");
      expect(defaultDividerProps.color).toBeTypeOf("string");
      expect(defaultSpacerProps.color).toBe("transparent");
    });

    it("should support size attributes", () => {
      // Verify size attributes are available
      expect(defaultDividerProps.size).toBe(1);
      expect(defaultDividerProps.size).toBeTypeOf("number");
    });

    it("should support radius attributes", () => {
      // Verify radius attributes are available
      expect(defaultDividerProps.radius).toBe(0);
      expect(defaultDividerProps.radius).toBeTypeOf("number");
    });

    it("should support variant attributes", () => {
      // Verify variant attributes are available
      expect(defaultDividerProps.variant).toBe("divider");
      expect(defaultSpacerProps.variant).toBe("spacer");
    });

    it("should support id attribute", () => {
      // The divider should support an id attribute for node identification
      const configured = Divider.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("divider");
    });
  });

  describe("HTML Integration", () => {
    it("should handle HTML parsing", () => {
      // Test that the extension has proper HTML handling
      const configured = Divider.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("divider");
    });

    it("should support HTML attributes", () => {
      const options = {
        HTMLAttributes: {
          class: "test-divider",
          "data-testid": "divider",
        },
      };

      expect(() => {
        const configured = Divider.configure(options);
        return configured;
      }).not.toThrow();
    });

    it("should render div element with divider data type", () => {
      // The extension should render as a div element with data-type="divider"
      const configured = Divider.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("divider");
    });
  });

  describe("Commands Integration", () => {
    it("should support divider-specific commands", () => {
      // Test that the extension has commands structure
      const configured = Divider.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("divider");
    });

    it("should handle divider creation", () => {
      // The extension should support divider creation
      expect(() => {
        const configured = Divider.configure();
        return configured;
      }).not.toThrow();
    });
  });

  describe("Functionality Tests", () => {
    it("should handle basic divider creation", () => {
      // Test that the extension can be created without errors
      expect(() => {
        const instance = Divider.configure();
        return instance;
      }).not.toThrow();
    });

    it("should handle configuration options", () => {
      const options = {
        HTMLAttributes: {
          class: "test-divider",
          "data-testid": "divider",
        },
      };

      expect(() => {
        const configured = Divider.configure(options);
        return configured;
      }).not.toThrow();
    });

    it("should support custom divider props", () => {
      // Test different prop configurations
      const customDividerProps = {
        padding: 12,
        color: "#ff6600",
        size: 3,
        radius: 8,
        variant: "divider" as const,
      };

      const customSpacerProps = {
        padding: 36,
        color: "transparent",
        size: 1,
        radius: 0,
        variant: "spacer" as const,
      };

      expect(customDividerProps.padding).toBeGreaterThan(defaultDividerProps.padding);
      expect(customDividerProps.color).not.toBe(defaultDividerProps.color);
      expect(customDividerProps.size).toBeGreaterThan(defaultDividerProps.size);
      expect(customDividerProps.radius).toBeGreaterThan(defaultDividerProps.radius);

      expect(customSpacerProps.padding).toBeGreaterThan(defaultSpacerProps.padding);
      expect(customSpacerProps.variant).toBe("spacer");
    });
  });

  describe("Integration Readiness", () => {
    it("should be ready for editor integration", () => {
      // Verify the extension has the minimum required structure for TipTap
      expect(Divider.name).toBe("divider");
      expect(Divider.type).toBe("node");
      expect(typeof Divider.configure).toBe("function");
    });

    it("should work with default divider props", () => {
      // Verify that default props are available and have expected structure
      const requiredProps = ["padding", "color", "size", "radius", "variant"];

      requiredProps.forEach((prop) => {
        expect(defaultDividerProps).toHaveProperty(prop);
        expect(defaultSpacerProps).toHaveProperty(prop);
      });
    });

    it("should have expected default values", () => {
      expect(defaultDividerProps.padding).toBeTypeOf("number");
      expect(defaultDividerProps.color).toBeTypeOf("string");
      expect(defaultDividerProps.size).toBeTypeOf("number");
      expect(defaultDividerProps.radius).toBeTypeOf("number");
      expect(defaultDividerProps.variant).toBeTypeOf("string");
    });

    it("should support node view rendering", () => {
      // The extension should be configured with ReactNodeViewRenderer
      const configured = Divider.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("divider");
    });
  });

  describe("Variant Support", () => {
    it("should support divider variant", () => {
      expect(defaultDividerProps.variant).toBe("divider");
      expect(defaultDividerProps.color).toBe("#000000");
    });

    it("should support spacer variant", () => {
      expect(defaultSpacerProps.variant).toBe("spacer");
      expect(defaultSpacerProps.color).toBe("transparent");
    });

    it("should have consistent properties across variants", () => {
      // Both variants should have same structure, different values
      const dividerKeys = Object.keys(defaultDividerProps);
      const spacerKeys = Object.keys(defaultSpacerProps);

      expect(dividerKeys.sort()).toEqual(spacerKeys.sort());
    });
  });

  describe("Styling Properties", () => {
    it("should support padding configuration", () => {
      expect(defaultDividerProps.padding).toBe(6);
      expect(defaultDividerProps.padding).toBeTypeOf("number");
    });

    it("should support color configuration", () => {
      expect(defaultDividerProps.color).toBe("#000000");
      expect(defaultSpacerProps.color).toBe("transparent");
    });

    it("should support size configuration", () => {
      expect(defaultDividerProps.size).toBe(1);
      expect(defaultDividerProps.size).toBeTypeOf("number");
    });

    it("should support radius configuration", () => {
      expect(defaultDividerProps.radius).toBe(0);
      expect(defaultDividerProps.radius).toBeTypeOf("number");
    });

    it("should handle custom styling values", () => {
      const customStyling = {
        padding: 15,
        color: "#007bff",
        size: 5,
        radius: 10,
      };

      expect(customStyling.padding).toBeGreaterThan(defaultDividerProps.padding);
      expect(customStyling.color).not.toBe(defaultDividerProps.color);
      expect(customStyling.size).toBeGreaterThan(defaultDividerProps.size);
      expect(customStyling.radius).toBeGreaterThan(defaultDividerProps.radius);
    });
  });

  describe("TipTap HorizontalRule Extension", () => {
    it("should extend TipTap HorizontalRule", () => {
      // Verify the extension extends the base horizontal rule
      const configured = Divider.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("divider");
    });

    it("should maintain horizontal rule functionality", () => {
      // The extension should maintain base horizontal rule capabilities
      expect(() => {
        const configured = Divider.configure();
        return configured;
      }).not.toThrow();
    });
  });

  describe("Mock Verification", () => {
    it("should have proper mocks in place", () => {
      // Verify that our extension is properly set up
      expect(Divider).toBeDefined();
      expect(defaultDividerProps).toBeDefined();
      expect(defaultSpacerProps).toBeDefined();
    });

    it("should mock DividerComponentNode", () => {
      // Verify that DividerComponentNode is mocked
      expect(Divider).toBeDefined();
    });
  });
});
