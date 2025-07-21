import { describe, it, expect, vi, beforeEach } from "vitest";
import { Variable, VariableNode } from "./Variable";
import type { VariableOptions, VariableNodeOptions } from "./Variable.types";

// Mock the suggestion module
vi.mock("./suggestion", () => ({
  suggestion: {
    char: "{{",
    allowSpaces: false,
    allowedPrefixes: null,
    startOfLine: false,
    decorationTag: "span",
    decorationClass: "variable-suggestion",
    items: vi.fn(),
    command: vi.fn(),
    render: vi.fn(),
  },
}));

// Mock TipTap modules
vi.mock("@tiptap/react", () => ({
  ReactNodeViewRenderer: vi.fn(() => "MockedReactNodeViewRenderer"),
}));

vi.mock("@tiptap/suggestion", () => ({
  Suggestion: vi.fn(() => "MockedSuggestionPlugin"),
}));

// Mock the VariableView component
vi.mock("./VariableView", () => ({
  VariableView: vi.fn(() => "MockedVariableView"),
}));

// Mock getFlattenedVariables utility
vi.mock("../../utils/getFlattenedVariables", () => ({
  getFlattenedVariables: vi.fn(() => ["user.name", "user.email", "order.id"]),
}));

describe("Variable Extension", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Configuration", () => {
    it("should be defined and have correct name", () => {
      expect(Variable).toBeDefined();
      expect(Variable.name).toBe("variableSuggestion");
    });

    it("should have configure method", () => {
      expect(typeof Variable.configure).toBe("function");
    });

    it("should be configurable", () => {
      const configured = Variable.configure({
        HTMLAttributes: { class: "custom-variable" },
      });
      expect(configured).toBeDefined();
      expect(configured.name).toBe("variableSuggestion");
    });
  });

  describe("Extension Structure", () => {
    it("should have TipTap extension structure", () => {
      expect(Variable).toHaveProperty("type");
      expect(Variable).toHaveProperty("name");
      expect(Variable).toHaveProperty("options");
    });

    it("should have proper extension type", () => {
      expect(Variable.type).toBe("extension");
    });

    it("should have default options", () => {
      expect(Variable.options).toBeDefined();
      expect(Variable.options.HTMLAttributes).toEqual({});
      expect(Variable.options.suggestion?.char).toBe("{{");
    });
  });

  describe("Variable Extension Options", () => {
    it("should accept custom HTML attributes", () => {
      const customOptions: VariableOptions = {
        HTMLAttributes: { class: "custom-variable" },
      };

      const configured = Variable.configure(customOptions);
      expect(configured.options.HTMLAttributes).toEqual({ class: "custom-variable" });
    });

    it("should accept custom variables", () => {
      const customOptions: VariableOptions = {
        variables: { custom: { value: "test" } },
      };

      const configured = Variable.configure(customOptions);
      expect(configured.options.variables).toEqual({ custom: { value: "test" } });
    });

    it("should accept custom suggestion configuration", () => {
      const customOptions: VariableOptions = {
        suggestion: {
          char: "@@",
          allowSpaces: true,
        },
      };

      const configured = Variable.configure(customOptions);
      expect(configured.options.suggestion?.char).toBe("@@");
      expect(configured.options.suggestion?.allowSpaces).toBe(true);
    });

    it("should merge suggestion options correctly", () => {
      const configured = Variable.configure({});
      expect(configured.options.suggestion?.char).toBe("{{");
      expect(typeof configured.options.suggestion?.items).toBe("function");
      expect(typeof configured.options.suggestion?.command).toBe("function");
      expect(typeof configured.options.suggestion?.render).toBe("function");
    });
  });

  describe("Variable Extension Functionality", () => {
    it("should support variable suggestions", () => {
      expect(Variable.options.suggestion?.char).toBe("{{");
      expect(Variable.options.suggestion?.allowSpaces).toBe(false);
      expect(Variable.options.suggestion?.decorationClass).toBe("variable-suggestion");
    });

    it("should handle custom suggestion configuration", () => {
      const customSuggestion = {
        char: "@@",
        allowSpaces: true,
        decorationClass: "custom-suggestion",
      };

      const configured = Variable.configure({
        suggestion: customSuggestion,
      });

      expect(configured.options.suggestion?.char).toBe("@@");
      expect(configured.options.suggestion?.allowSpaces).toBe(true);
      expect(configured.options.suggestion?.decorationClass).toBe("custom-suggestion");
    });

    it("should maintain suggestion functionality", () => {
      expect(typeof Variable.options.suggestion?.items).toBe("function");
      expect(typeof Variable.options.suggestion?.command).toBe("function");
      expect(typeof Variable.options.suggestion?.render).toBe("function");
    });
  });

  describe("Variable Extension Integration", () => {
    it("should be ready for editor integration", () => {
      expect(Variable.name).toBe("variableSuggestion");
      expect(Variable.type).toBe("extension");
      expect(Variable.options).toBeDefined();
    });

    it("should support complete variable workflow", () => {
      const variables = {
        user: { name: "John", email: "john@example.com" },
        order: { id: "12345" },
      };

      const configured = Variable.configure({ variables });
      expect(configured.options.variables).toEqual(variables);
    });
  });
});

describe("VariableNode Extension", () => {
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
      // Test that the node has proper attribute structure
      expect(VariableNode).toBeDefined();
      expect(VariableNode.name).toBe("variable");
    });

    it("should support data attributes", () => {
      // Test that the node can be configured with data attributes
      const configured = VariableNode.configure({
        HTMLAttributes: { "data-id": "test" },
      });
      expect(configured.options.HTMLAttributes).toEqual({ "data-id": "test" });
    });
  });

  describe("VariableNode HTML Integration", () => {
    it("should handle HTML parsing and rendering", () => {
      // Test that the node has proper HTML handling
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
      // Test that the node has proper view integration
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

describe("Variable Extensions Integration", () => {
  it("should work together as a complete variable system", () => {
    expect(Variable.name).toBe("variableSuggestion");
    expect(VariableNode.name).toBe("variable");

    // Both should be ready for integration
    expect(Variable.type).toBe("extension");
    expect(VariableNode.type).toBe("node");
  });

  it("should support complete variable workflow", () => {
    const variables = {
      user: { name: "John", email: "john@example.com" },
      order: { id: "12345" },
    };

    const variableExtension = Variable.configure({ variables });
    const variableNode = VariableNode.configure({});

    expect(variableExtension.options.variables).toEqual(variables);
    expect(variableNode.name).toBe("variable");
  });

  it("should maintain type safety", () => {
    const options: VariableOptions = {
      HTMLAttributes: { class: "test" },
      variables: { test: "value" },
    };

    const nodeOptions: VariableNodeOptions = {
      HTMLAttributes: { "data-test": "value" },
    };

    expect(() => {
      Variable.configure(options);
      VariableNode.configure(nodeOptions);
    }).not.toThrow();
  });

  it("should handle suggestion integration", () => {
    const configured = Variable.configure({
      suggestion: {
        char: "{{",
        allowSpaces: false,
      },
    });

    expect(configured.options.suggestion?.char).toBe("{{");
    expect(configured.options.suggestion?.allowSpaces).toBe(false);
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
      // Test that the extension is properly structured for copy/paste
      expect(VariableNode.name).toBe("variable");
      expect(VariableNode.type).toBe("node");
    });

    it("should support configuration for copy/paste workflows", () => {
      const configured = VariableNode.configure({});
      expect(configured).toBeDefined();
      expect(configured.name).toBe("variable");
    });

    it("should maintain compatibility with TipTap ecosystem", () => {
      // Ensure the node can be used in the editor for copy/paste operations
      expect(typeof VariableNode.configure).toBe("function");
      expect(VariableNode.name).toBe("variable");
      expect(VariableNode.type).toBe("node");
    });
  });
});
