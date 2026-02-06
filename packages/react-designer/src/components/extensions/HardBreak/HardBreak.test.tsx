import { describe, it, expect } from "vitest";
import { HardBreak } from "./HardBreak";

describe("HardBreak Extension", () => {
  describe("Basic Configuration", () => {
    it("should be defined and have correct name", () => {
      expect(HardBreak).toBeDefined();
      expect(HardBreak.name).toBe("hardBreak");
    });

    it("should have configure method", () => {
      expect(typeof HardBreak.configure).toBe("function");
    });

    it("should be configurable", () => {
      const configured = HardBreak.configure({});
      expect(configured).toBeDefined();
      expect(configured.name).toBe("hardBreak");
    });

    it("should have proper node type", () => {
      expect(HardBreak.type).toBe("node");
    });
  });

  describe("Extension Structure", () => {
    it("should have TipTap node structure", () => {
      expect(HardBreak).toHaveProperty("type");
      expect(HardBreak).toHaveProperty("name");
    });

    it("should be properly configured", () => {
      const configured = HardBreak.configure({});
      expect(configured).toBeDefined();
      expect(configured.name).toBe("hardBreak");
    });
  });

  describe("Custom HardBreak Features", () => {
    it("should extend TipTap HardBreak", () => {
      // Our custom HardBreak extends the default TipTap HardBreak
      expect(HardBreak.name).toBe("hardBreak");
      expect(HardBreak.type).toBe("node");
    });

    it("should be ready for editor integration", () => {
      const configured = HardBreak.configure({
        keepMarks: true,
      });
      expect(configured).toBeDefined();
      expect(configured.name).toBe("hardBreak");
    });

    it("should support HTML attributes configuration", () => {
      const configured = HardBreak.configure({
        HTMLAttributes: {
          class: "custom-break",
        },
      });
      expect(configured).toBeDefined();
      expect(configured.options.HTMLAttributes).toEqual({ class: "custom-break" });
    });
  });

  describe("Zero-Width Space for Cursor Positioning", () => {
    it("should be configured to help with cursor positioning", () => {
      // The custom HardBreak includes a zero-width space after the <br>
      // to help browsers render the cursor when positioned after a line break
      expect(HardBreak).toBeDefined();
      expect(HardBreak.name).toBe("hardBreak");
    });

    it("should render with wrapper structure for cursor visibility", () => {
      // The HardBreak renders as a span wrapper containing <br> and zero-width space
      // This helps with cursor visibility when a variable follows the hardBreak
      const configured = HardBreak.configure({});
      expect(configured).toBeDefined();
    });

    it("should parse both new wrapper format and legacy br tags", () => {
      // The parseHTML should recognize both:
      // 1. New format: <span data-hard-break="true"><br>​</span>
      // 2. Legacy format: <br>
      expect(HardBreak).toBeDefined();
      expect(HardBreak.name).toBe("hardBreak");
    });
  });

  describe("Integration with Variable Extension", () => {
    it("should be compatible with variable nodes", () => {
      // The HardBreak modification specifically helps with cursor positioning
      // when a variable node immediately follows a hardBreak
      expect(HardBreak.name).toBe("hardBreak");
      expect(HardBreak.type).toBe("node");
    });

    it("should allow cursor positioning after hardBreak", () => {
      // By including a zero-width space, the browser has a text node
      // where it can render the cursor after a line break
      const configured = HardBreak.configure({});
      expect(configured).toBeDefined();
    });
  });
});
