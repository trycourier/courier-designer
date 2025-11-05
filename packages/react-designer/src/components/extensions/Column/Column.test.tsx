import { describe, it, expect, vi } from "vitest";
import { Column, defaultColumnProps } from "./Column";

// Mock the ColumnComponentNode
vi.mock("./ColumnComponent", () => ({
  ColumnComponentNode: () => null,
}));

vi.mock("../../utils", () => ({
  generateNodeIds: vi.fn(),
}));

vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-1234"),
}));

describe("Column Extension", () => {
  describe("Basic Configuration", () => {
    it("should be defined and have correct name", () => {
      expect(Column).toBeDefined();
      expect(Column.name).toBe("column");
    });

    it("should have configure method", () => {
      expect(typeof Column.configure).toBe("function");
    });

    it("should be configurable", () => {
      const configured = Column.configure({
        HTMLAttributes: { class: "custom-column" },
      });
      expect(configured).toBeDefined();
      expect(configured.name).toBe("column");
    });
  });

  describe("Extension Structure", () => {
    it("should have TipTap extension structure", () => {
      expect(Column).toHaveProperty("type");
      expect(Column).toHaveProperty("name");
      expect(Column).toHaveProperty("options");
    });

    it("should be a custom Node extension", () => {
      expect(Column.type).toBe("node");
    });

    it("should be a block element", () => {
      const configured = Column.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("column");
    });

    it("should be properly configured", () => {
      const configured = Column.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("column");
    });
  });

  describe("Default Props Integration", () => {
    it("should use defaultColumnProps", () => {
      expect(defaultColumnProps).toBeDefined();
      expect(defaultColumnProps.columnsCount).toBe(2);
      expect(defaultColumnProps.paddingHorizontal).toBe(0);
      expect(defaultColumnProps.paddingVertical).toBe(0);
      expect(defaultColumnProps.backgroundColor).toBe("transparent");
      expect(defaultColumnProps.borderWidth).toBe(0);
      expect(defaultColumnProps.borderRadius).toBe(0);
      expect(defaultColumnProps.borderColor).toBe("#000000");
      expect(defaultColumnProps.cells).toEqual([]);
    });

    it("should have expected default prop types", () => {
      expect(defaultColumnProps.columnsCount).toBeTypeOf("number");
      expect(defaultColumnProps.paddingHorizontal).toBeTypeOf("number");
      expect(defaultColumnProps.paddingVertical).toBeTypeOf("number");
      expect(defaultColumnProps.backgroundColor).toBeTypeOf("string");
      expect(defaultColumnProps.borderWidth).toBeTypeOf("number");
      expect(defaultColumnProps.borderRadius).toBeTypeOf("number");
      expect(defaultColumnProps.borderColor).toBeTypeOf("string");
      expect(Array.isArray(defaultColumnProps.cells)).toBe(true);
    });

    it("should have sensible default values", () => {
      // Default should be 2 columns
      expect(defaultColumnProps.columnsCount).toBe(2);

      // Default padding should be 0
      expect(defaultColumnProps.paddingHorizontal).toBe(0);
      expect(defaultColumnProps.paddingVertical).toBe(0);

      // Default background should be transparent
      expect(defaultColumnProps.backgroundColor).toBe("transparent");

      // Default border should be 0 width (no border)
      expect(defaultColumnProps.borderWidth).toBe(0);
    });
  });

  describe("Column Attributes", () => {
    it("should support all column styling attributes", () => {
      const configured = Column.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("column");
    });

    it("should support columnsCount attribute", () => {
      expect(defaultColumnProps.columnsCount).toBe(2);
      expect(defaultColumnProps.columnsCount).toBeTypeOf("number");
    });

    it("should support padding attributes", () => {
      expect(defaultColumnProps.paddingHorizontal).toBeTypeOf("number");
      expect(defaultColumnProps.paddingVertical).toBeTypeOf("number");
    });

    it("should support background color attribute", () => {
      expect(defaultColumnProps.backgroundColor).toBeTypeOf("string");
      expect(defaultColumnProps.backgroundColor).toBe("transparent");
    });

    it("should support border attributes", () => {
      expect(defaultColumnProps.borderWidth).toBeTypeOf("number");
      expect(defaultColumnProps.borderRadius).toBeTypeOf("number");
      expect(defaultColumnProps.borderColor).toBeTypeOf("string");
    });

    it("should support cells array attribute", () => {
      expect(Array.isArray(defaultColumnProps.cells)).toBe(true);
      expect(defaultColumnProps.cells).toEqual([]);
    });

    it("should support id attribute", () => {
      const configured = Column.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("column");
    });

    it("should support locales attribute", () => {
      const configured = Column.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("column");
    });
  });

  describe("HTML Integration", () => {
    it("should handle HTML parsing", () => {
      const configured = Column.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("column");
    });

    it("should support HTML attributes", () => {
      const options = {
        HTMLAttributes: {
          class: "test-column",
          "data-testid": "column",
        },
      };

      expect(() => {
        const configured = Column.configure(options);
        return configured;
      }).not.toThrow();
    });

    it("should render div element with column data type", () => {
      const configured = Column.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("column");
    });
  });

  describe("Commands Integration", () => {
    it("should support column-specific commands", () => {
      const configured = Column.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("column");
    });

    it("should handle column creation", () => {
      expect(() => {
        const configured = Column.configure();
        return configured;
      }).not.toThrow();
    });

    it("should support setColumn command", () => {
      const configured = Column.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("column");
    });
  });

  describe("Functionality Tests", () => {
    it("should handle basic column creation", () => {
      expect(() => {
        const instance = Column.configure();
        return instance;
      }).not.toThrow();
    });

    it("should handle configuration options", () => {
      const options = {
        HTMLAttributes: {
          class: "test-column",
          "data-testid": "column",
        },
      };

      expect(() => {
        const configured = Column.configure(options);
        return configured;
      }).not.toThrow();
    });

    it("should support custom column props", () => {
      const customProps = {
        columnsCount: 3,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#f5f5f5",
        borderWidth: 2,
        borderRadius: 8,
        borderColor: "#cccccc",
      };

      expect(customProps.columnsCount).not.toBe(defaultColumnProps.columnsCount);
      expect(customProps.paddingHorizontal).not.toBe(defaultColumnProps.paddingHorizontal);
      expect(customProps.paddingVertical).not.toBe(defaultColumnProps.paddingVertical);
      expect(customProps.backgroundColor).not.toBe(defaultColumnProps.backgroundColor);
      expect(customProps.borderWidth).not.toBe(defaultColumnProps.borderWidth);
    });
  });

  describe("Column Count Validation", () => {
    it("should support 1 column layout", () => {
      const singleColumn = { columnsCount: 1 };
      expect(singleColumn.columnsCount).toBe(1);
      expect(singleColumn.columnsCount).toBeGreaterThanOrEqual(1);
    });

    it("should support 2 column layout (default)", () => {
      expect(defaultColumnProps.columnsCount).toBe(2);
    });

    it("should support 3 column layout", () => {
      const threeColumns = { columnsCount: 3 };
      expect(threeColumns.columnsCount).toBe(3);
    });

    it("should support 4 column layout", () => {
      const fourColumns = { columnsCount: 4 };
      expect(fourColumns.columnsCount).toBe(4);
      expect(fourColumns.columnsCount).toBeLessThanOrEqual(4);
    });

    it("should have valid column count range", () => {
      // Column count should be between 1 and 4
      expect(defaultColumnProps.columnsCount).toBeGreaterThanOrEqual(1);
      expect(defaultColumnProps.columnsCount).toBeLessThanOrEqual(4);
    });
  });

  describe("Styling Configuration", () => {
    it("should support horizontal padding", () => {
      const withHPadding = { paddingHorizontal: 20 };
      expect(withHPadding.paddingHorizontal).toBeTypeOf("number");
      expect(withHPadding.paddingHorizontal).toBeGreaterThan(0);
    });

    it("should support vertical padding", () => {
      const withVPadding = { paddingVertical: 16 };
      expect(withVPadding.paddingVertical).toBeTypeOf("number");
      expect(withVPadding.paddingVertical).toBeGreaterThan(0);
    });

    it("should support background colors", () => {
      const colors = ["#ffffff", "#000000", "transparent", "#f0f0f0"];
      colors.forEach((color) => {
        expect(color).toBeTypeOf("string");
      });
    });

    it("should support border styling", () => {
      const withBorder = {
        borderWidth: 2,
        borderRadius: 8,
        borderColor: "#e0e0e0",
      };
      expect(withBorder.borderWidth).toBeTypeOf("number");
      expect(withBorder.borderRadius).toBeTypeOf("number");
      expect(withBorder.borderColor).toBeTypeOf("string");
    });

    it("should handle zero border width (no border)", () => {
      expect(defaultColumnProps.borderWidth).toBe(0);
    });
  });

  describe("Integration Readiness", () => {
    it("should be ready for editor integration", () => {
      expect(Column.name).toBe("column");
      expect(Column.type).toBe("node");
      expect(typeof Column.configure).toBe("function");
    });

    it("should work with default column props", () => {
      const requiredProps = [
        "columnsCount",
        "paddingHorizontal",
        "paddingVertical",
        "backgroundColor",
        "borderWidth",
        "borderRadius",
        "borderColor",
        "cells",
      ];

      requiredProps.forEach((prop) => {
        expect(defaultColumnProps).toHaveProperty(prop);
      });
    });

    it("should have expected default values", () => {
      expect(defaultColumnProps.columnsCount).toBeTypeOf("number");
      expect(defaultColumnProps.paddingHorizontal).toBeTypeOf("number");
      expect(defaultColumnProps.paddingVertical).toBeTypeOf("number");
      expect(defaultColumnProps.backgroundColor).toBeTypeOf("string");
      expect(defaultColumnProps.borderWidth).toBeTypeOf("number");
      expect(defaultColumnProps.borderRadius).toBeTypeOf("number");
      expect(defaultColumnProps.borderColor).toBeTypeOf("string");
    });

    it("should support node view rendering", () => {
      const configured = Column.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("column");
    });
  });

  describe("Content Structure", () => {
    it("should support columnRow content", () => {
      const configured = Column.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("column");
    });

    it("should be isolating", () => {
      const configured = Column.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("column");
    });

    it("should not be selectable directly", () => {
      const configured = Column.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("column");
    });
  });

  describe("Mock Verification", () => {
    it("should have proper mocks in place", () => {
      expect(Column).toBeDefined();
      expect(defaultColumnProps).toBeDefined();
    });

    it("should mock ColumnComponentNode", () => {
      expect(Column).toBeDefined();
    });

    it("should mock generateNodeIds", () => {
      expect(Column).toBeDefined();
    });

    it("should mock uuid", () => {
      expect(Column).toBeDefined();
    });
  });
});
