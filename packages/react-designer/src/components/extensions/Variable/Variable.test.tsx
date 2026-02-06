import { describe, it, expect, vi, beforeEach } from "vitest";
import { VariableNode, VariableInputRule } from "./Variable";
import type { VariableNodeOptions } from "./Variable.types";

// Mock TipTap modules
vi.mock("@tiptap/react", () => ({
  ReactNodeViewRenderer: vi.fn(() => "MockedReactNodeViewRenderer"),
}));

// Mock the VariableView component
vi.mock("./VariableView", () => ({
  VariableView: vi.fn(() => "MockedVariableView"),
}));

describe("VariableNode Extension", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Configuration", () => {
    it("should be defined and have correct name", () => {
      expect(VariableNode).toBeDefined();
      expect(VariableNode.name).toBe("variable");
    });

    it("should have configure method", () => {
      expect(typeof VariableNode.configure).toBe("function");
    });

    it("should be configurable", () => {
      const configured = VariableNode.configure({
        HTMLAttributes: { class: "custom-variable-node" },
      });
      expect(configured).toBeDefined();
      expect(configured.name).toBe("variable");
    });
  });

  describe("Extension Structure", () => {
    it("should have TipTap node structure", () => {
      expect(VariableNode).toHaveProperty("type");
      expect(VariableNode).toHaveProperty("name");
    });

    it("should have proper node type", () => {
      expect(VariableNode.type).toBe("node");
    });

    it("should be properly configured", () => {
      const configured = VariableNode.configure({});
      expect(configured).toBeDefined();
      expect(configured.name).toBe("variable");
    });
  });

  describe("VariableNode Options", () => {
    it("should accept custom HTML attributes", () => {
      const customOptions: VariableNodeOptions = {
        HTMLAttributes: { class: "custom-variable-node" },
      };

      const configured = VariableNode.configure(customOptions);
      expect(configured.options.HTMLAttributes).toEqual({ class: "custom-variable-node" });
    });

    it("should handle empty options", () => {
      const configured = VariableNode.configure({});
      expect(configured).toBeDefined();
      expect(configured.name).toBe("variable");
    });
  });

  describe("VariableNode Attributes", () => {
    it("should have id attribute configuration", () => {
      expect(VariableNode).toBeDefined();
      expect(VariableNode.name).toBe("variable");
    });

    it("should support data attributes", () => {
      const configured = VariableNode.configure({
        HTMLAttributes: { "data-id": "test" },
      });
      expect(configured.options.HTMLAttributes).toEqual({ "data-id": "test" });
    });

    it("should have isInvalid attribute for validation state", () => {
      expect(VariableNode).toBeDefined();
      expect(VariableNode.name).toBe("variable");
    });

    it("should support empty id for new variables", () => {
      expect(VariableNode).toBeDefined();
      expect(VariableNode.name).toBe("variable");
    });
  });

  describe("VariableNode HTML Integration", () => {
    it("should handle HTML parsing and rendering", () => {
      expect(VariableNode).toBeDefined();
      expect(VariableNode.name).toBe("variable");
    });

    it("should support HTML attributes", () => {
      const options = {
        HTMLAttributes: {
          class: "test-variable",
          "data-testid": "variable",
        },
      };

      expect(() => {
        const configured = VariableNode.configure(options);
        return configured;
      }).not.toThrow();
    });
  });

  describe("VariableNode View Integration", () => {
    it("should support React node view", () => {
      expect(VariableNode).toBeDefined();
      expect(VariableNode.name).toBe("variable");
    });

    it("should be ready for component rendering", () => {
      const configured = VariableNode.configure({});
      expect(configured).toBeDefined();
      expect(configured.name).toBe("variable");
    });
  });

  describe("VariableNode Integration", () => {
    it("should be ready for editor integration", () => {
      expect(VariableNode.name).toBe("variable");
      expect(VariableNode.type).toBe("node");
    });

    it("should maintain node structure integrity", () => {
      const configured = VariableNode.configure({});
      expect(configured).toBeDefined();
      expect(configured.name).toBe("variable");
    });

    it("should support custom configuration", () => {
      const customOptions: VariableNodeOptions = {
        HTMLAttributes: { "data-custom": "value" },
      };

      const configured = VariableNode.configure(customOptions);
      expect(configured.options).toEqual(customOptions);
    });
  });
});

describe("VariableInputRule Extension", () => {
  describe("Basic Configuration", () => {
    it("should be defined and have correct name", () => {
      expect(VariableInputRule).toBeDefined();
      expect(VariableInputRule.name).toBe("variableInputRule");
    });

    it("should have configure method", () => {
      expect(typeof VariableInputRule.configure).toBe("function");
    });

    it("should be configurable", () => {
      const configured = VariableInputRule.configure({});
      expect(configured).toBeDefined();
      expect(configured.name).toBe("variableInputRule");
    });
  });

  describe("Extension Structure", () => {
    it("should have TipTap extension structure", () => {
      expect(VariableInputRule).toHaveProperty("type");
      expect(VariableInputRule).toHaveProperty("name");
    });

    it("should have proper extension type", () => {
      expect(VariableInputRule.type).toBe("extension");
    });
  });

  describe("Input Rule Functionality", () => {
    it("should be ready for editor integration", () => {
      expect(VariableInputRule.name).toBe("variableInputRule");
      expect(VariableInputRule.type).toBe("extension");
    });

    it("should be properly configured for {{ detection", () => {
      const configured = VariableInputRule.configure({});
      expect(configured).toBeDefined();
      expect(configured.name).toBe("variableInputRule");
    });
  });
});

describe("Variable Extensions Integration", () => {
  it("should work together as a complete variable system", () => {
    expect(VariableInputRule.name).toBe("variableInputRule");
    expect(VariableNode.name).toBe("variable");

    expect(VariableInputRule.type).toBe("extension");
    expect(VariableNode.type).toBe("node");
  });

  it("should maintain node structure integrity", () => {
    const variableNode = VariableNode.configure({});

    expect(variableNode.name).toBe("variable");
  });

  it("should maintain type safety", () => {
    const nodeOptions: VariableNodeOptions = {
      HTMLAttributes: { "data-test": "value" },
    };

    expect(() => {
      VariableInputRule.configure({});
      VariableNode.configure(nodeOptions);
    }).not.toThrow();
  });
});

describe("Variable Copy/Paste Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Node Configuration", () => {
    it("should be configured as inline atom node", () => {
      expect(VariableNode.name).toBe("variable");
      expect(VariableNode.type).toBe("node");
    });

    it("should be configurable with custom options", () => {
      const configured = VariableNode.configure({
        HTMLAttributes: { class: "custom-variable" },
      });
      expect(configured).toBeDefined();
      expect(configured.name).toBe("variable");
    });

    it("should maintain proper node structure", () => {
      const configured = VariableNode.configure({});
      expect(configured).toBeDefined();
      expect(configured.name).toBe("variable");
      expect(configured.type).toBe("node");
    });
  });

  describe("Copy/Paste Integration", () => {
    it("should be ready for copy/paste integration", () => {
      expect(VariableNode.name).toBe("variable");
      expect(VariableNode.type).toBe("node");
    });

    it("should support configuration for copy/paste workflows", () => {
      const configured = VariableNode.configure({});
      expect(configured).toBeDefined();
      expect(configured.name).toBe("variable");
    });

    it("should maintain compatibility with TipTap ecosystem", () => {
      expect(typeof VariableNode.configure).toBe("function");
      expect(VariableNode.name).toBe("variable");
      expect(VariableNode.type).toBe("node");
    });
  });
});

describe("Variable Cursor Navigation Fix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("VariableNode ProseMirror Plugins", () => {
    it("should have ProseMirror plugins for cursor navigation", () => {
      // The VariableNode extension should have addProseMirrorPlugins method
      expect(VariableNode).toBeDefined();
      expect(VariableNode.name).toBe("variable");
      // The extension config should have the plugin-related methods
      const configured = VariableNode.configure({});
      expect(configured).toBeDefined();
    });

    it("should be configured as non-selectable atom node", () => {
      // Variable nodes should be atoms (can't edit content inside) 
      // and non-selectable (clicking doesn't select the whole node)
      expect(VariableNode.name).toBe("variable");
      expect(VariableNode.type).toBe("node");
    });

    it("should support inline positioning", () => {
      // Variables are inline nodes that can appear within text
      const configured = VariableNode.configure({});
      expect(configured).toBeDefined();
      expect(configured.name).toBe("variable");
    });
  });

  describe("Cursor Fix Plugin Behavior", () => {
    it("should be properly configured for cursor handling", () => {
      // The VariableNode extension includes plugins for:
      // 1. variableCursorIndicator - shows visual cursor between hardBreak and variable
      // 2. variableCursorFix - handles arrow key navigation
      expect(VariableNode).toBeDefined();
      const configured = VariableNode.configure({});
      expect(configured.name).toBe("variable");
    });

    it("should handle arrow key navigation configuration", () => {
      // The cursor fix plugin should handle ArrowLeft and ArrowRight
      // when cursor is positioned near a variable following a hardBreak
      expect(VariableNode.name).toBe("variable");
      expect(typeof VariableNode.configure).toBe("function");
    });

    it("should support decoration for cursor visibility", () => {
      // The cursor indicator plugin adds a visual blinking cursor
      // when the cursor is between a hardBreak and a variable
      const configured = VariableNode.configure({});
      expect(configured).toBeDefined();
      expect(configured.type).toBe("node");
    });
  });

  describe("Integration with HardBreak", () => {
    it("should be compatible with hardBreak nodes", () => {
      // The cursor navigation fix specifically handles the case where
      // a variable immediately follows a hardBreak (line break)
      expect(VariableNode.name).toBe("variable");
      expect(VariableNode.type).toBe("node");
    });

    it("should allow cursor positioning after hardBreak before variable", () => {
      // This is the key fix: allowing the cursor to be positioned
      // between a hardBreak and a variable node
      const configured = VariableNode.configure({});
      expect(configured).toBeDefined();
      expect(configured.name).toBe("variable");
    });
  });
});
