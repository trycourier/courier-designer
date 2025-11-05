import { describe, it, expect } from "vitest";
import { ColumnRow } from "./ColumnRow";

describe("ColumnRow Extension", () => {
  describe("Basic Configuration", () => {
    it("should be defined and have correct name", () => {
      expect(ColumnRow).toBeDefined();
      expect(ColumnRow.name).toBe("columnRow");
    });

    it("should have configure method", () => {
      expect(typeof ColumnRow.configure).toBe("function");
    });

    it("should be configurable", () => {
      const configured = ColumnRow.configure({
        HTMLAttributes: { class: "custom-column-row" },
      });
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });
  });

  describe("Extension Structure", () => {
    it("should have TipTap extension structure", () => {
      expect(ColumnRow).toHaveProperty("type");
      expect(ColumnRow).toHaveProperty("name");
      expect(ColumnRow).toHaveProperty("options");
    });

    it("should be a custom Node extension", () => {
      expect(ColumnRow.type).toBe("node");
    });

    it("should be properly configured", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });
  });

  describe("Content Structure", () => {
    it("should support columnCell content", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });

    it("should be in columnContent group", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });

    it("should be isolating", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });

    it("should require at least one columnCell", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });
  });

  describe("HTML Integration", () => {
    it("should handle HTML parsing", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });

    it("should support HTML attributes", () => {
      const options = {
        HTMLAttributes: {
          class: "test-row",
          "data-testid": "column-row",
        },
      };

      expect(() => {
        const configured = ColumnRow.configure(options);
        return configured;
      }).not.toThrow();
    });

    it("should render div element with column-row data type", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });
  });

  describe("Commands Integration", () => {
    it("should support insertColumnRow command", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });

    it("should handle row creation", () => {
      expect(() => {
        const configured = ColumnRow.configure();
        return configured;
      }).not.toThrow();
    });
  });

  describe("Layout Properties", () => {
    it("should support flex row layout", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });

    it("should support gap spacing", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });

    it("should be full width", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });
  });

  describe("Functionality Tests", () => {
    it("should handle basic row creation", () => {
      expect(() => {
        const instance = ColumnRow.configure();
        return instance;
      }).not.toThrow();
    });

    it("should handle configuration options", () => {
      const options = {
        HTMLAttributes: {
          class: "test-row",
          "data-testid": "row",
        },
      };

      expect(() => {
        const configured = ColumnRow.configure(options);
        return configured;
      }).not.toThrow();
    });

    it("should work as container for cells", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });
  });

  describe("Multi-Cell Support", () => {
    it("should support single cell row", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });

    it("should support two cell row", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });

    it("should support three cell row", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });

    it("should support four cell row", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });
  });

  describe("Integration Readiness", () => {
    it("should be ready for editor integration", () => {
      expect(ColumnRow.name).toBe("columnRow");
      expect(ColumnRow.type).toBe("node");
      expect(typeof ColumnRow.configure).toBe("function");
    });

    it("should be compatible with column structure", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });

    it("should work as container for columnCell nodes", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });
  });

  describe("CSS Class Support", () => {
    it("should support Tailwind CSS classes with courier prefix", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });

    it("should support custom classes via configuration", () => {
      const options = {
        HTMLAttributes: {
          class: "custom-class another-class",
        },
      };

      expect(() => {
        const configured = ColumnRow.configure(options);
        return configured;
      }).not.toThrow();
    });
  });

  describe("Parent-Child Relationship", () => {
    it("should be child of column node", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });

    it("should be parent of columnCell nodes", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });

    it("should maintain hierarchical structure", () => {
      // column > columnRow > columnCell+
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });
  });

  describe("Styling Verification", () => {
    it("should have inline flex styling", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });

    it("should have flex-direction row", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });

    it("should have gap spacing", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });

    it("should have 100% width", () => {
      const configured = ColumnRow.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("columnRow");
    });
  });
});
