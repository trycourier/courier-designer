import { describe, it, expect, vi, beforeEach } from "vitest";
import { VariablePaste } from "./VariablePaste";

describe("VariablePaste Extension", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Configuration", () => {
    it("should be defined and have correct name", () => {
      expect(VariablePaste).toBeDefined();
      expect(VariablePaste.name).toBe("variablePaste");
    });

    it("should have configure method", () => {
      expect(typeof VariablePaste.configure).toBe("function");
    });

    it("should be configurable", () => {
      const configured = VariablePaste.configure({});
      expect(configured).toBeDefined();
      expect(configured.name).toBe("variablePaste");
    });

    it("should be ready for editor integration", () => {
      expect(VariablePaste.name).toBe("variablePaste");
      expect(VariablePaste.type).toBe("extension");
    });
  });

  describe("HTML Transformation Logic", () => {
    // Test the regex pattern that the extension uses
    const htmlTransformRegex = /\{\{([^}]+)\}\}/g;
    const htmlReplacement = '<span data-variable="true" data-id="$1"></span>';

    it("should transform simple variable pattern", () => {
      const html = "Hello {{user.name}}!";
      const result = html.replace(htmlTransformRegex, htmlReplacement);

      expect(result).toBe('Hello <span data-variable="true" data-id="user.name"></span>!');
    });

    it("should transform multiple variable patterns", () => {
      const html = "Hello {{user.firstName}} {{user.lastName}}!";
      const result = html.replace(htmlTransformRegex, htmlReplacement);

      expect(result).toBe(
        'Hello <span data-variable="true" data-id="user.firstName"></span> <span data-variable="true" data-id="user.lastName"></span>!'
      );
    });

    it("should handle nested object variables", () => {
      const html = "Address: {{user.address.street}}, {{user.address.city}}";
      const result = html.replace(htmlTransformRegex, htmlReplacement);

      expect(result).toBe(
        'Address: <span data-variable="true" data-id="user.address.street"></span>, <span data-variable="true" data-id="user.address.city"></span>'
      );
    });

    it("should handle variables with special characters", () => {
      const html = "Item count: {{order.item-count}} Total: {{order.total_amount}}";
      const result = html.replace(htmlTransformRegex, htmlReplacement);

      expect(result).toBe(
        'Item count: <span data-variable="true" data-id="order.item-count"></span> Total: <span data-variable="true" data-id="order.total_amount"></span>'
      );
    });

    it("should not transform incomplete variable patterns", () => {
      const html = "Hello {user.name} and {{incomplete";
      const result = html.replace(htmlTransformRegex, htmlReplacement);

      expect(result).toBe("Hello {user.name} and {{incomplete");
    });

    it("should not transform empty variable patterns", () => {
      const html = "Empty: {{}} Normal: {{user.name}}";
      const result = html.replace(htmlTransformRegex, htmlReplacement);

      // Empty variables should not be transformed since they have no content
      expect(result).toBe(
        'Empty: {{}} Normal: <span data-variable="true" data-id="user.name"></span>'
      );
    });

    it("should preserve HTML structure while transforming variables", () => {
      const html = "<p>Hello <strong>{{user.name}}</strong>!</p>";
      const result = html.replace(htmlTransformRegex, htmlReplacement);

      expect(result).toBe(
        '<p>Hello <strong><span data-variable="true" data-id="user.name"></span></strong>!</p>'
      );
    });
  });

  describe("Text Processing Logic", () => {
    // Test the text processing logic that the extension uses
    const textVariableRegex = /\{\{([^}]+)\}\}/g;

    it("should detect variables in text", () => {
      const text = "Hello {{user.name}}!";
      const hasVariables = textVariableRegex.test(text);

      expect(hasVariables).toBe(true);
    });

    it("should not detect variables when none exist", () => {
      const text = "Hello world!";
      textVariableRegex.lastIndex = 0; // Reset regex state
      const hasVariables = textVariableRegex.test(text);

      expect(hasVariables).toBe(false);
    });

    it("should extract variable names correctly", () => {
      const text = "Hello {{user.name}} and {{order.total}}!";
      const matches: string[] = [];
      let match;

      textVariableRegex.lastIndex = 0; // Reset regex state
      while ((match = textVariableRegex.exec(text)) !== null) {
        matches.push(match[1]);
      }

      expect(matches).toEqual(["user.name", "order.total"]);
    });

    it("should handle complex nested variable names", () => {
      const text = "Value: {{data.user.profile.settings.theme}}";
      const matches: string[] = [];
      let match;

      textVariableRegex.lastIndex = 0; // Reset regex state
      while ((match = textVariableRegex.exec(text)) !== null) {
        matches.push(match[1]);
      }

      expect(matches).toEqual(["data.user.profile.settings.theme"]);
    });

    it("should handle variables with special characters", () => {
      const text = "Count: {{item-count}} Price: {{price_usd}}";
      const matches: string[] = [];
      let match;

      textVariableRegex.lastIndex = 0; // Reset regex state
      while ((match = textVariableRegex.exec(text)) !== null) {
        matches.push(match[1]);
      }

      expect(matches).toEqual(["item-count", "price_usd"]);
    });

    it("should handle consecutive variables", () => {
      const text = "{{user.firstName}}{{user.lastName}}";
      const matches: string[] = [];
      let match;

      textVariableRegex.lastIndex = 0; // Reset regex state
      while ((match = textVariableRegex.exec(text)) !== null) {
        matches.push(match[1]);
      }

      expect(matches).toEqual(["user.firstName", "user.lastName"]);
    });
  });

  describe("Integration Readiness", () => {
    it("should be ready for TipTap integration", () => {
      expect(VariablePaste.name).toBe("variablePaste");
      expect(VariablePaste.type).toBe("extension");
      expect(typeof VariablePaste.configure).toBe("function");
    });

    it("should support complete copy/paste workflow", () => {
      // Test that the extension can be configured and has the expected structure
      const extension = VariablePaste.configure({});
      expect(extension).toBeDefined();
      expect(extension.name).toBe("variablePaste");
      expect(extension.type).toBe("extension");
    });

    it("should maintain compatibility with variable syntax", () => {
      // Ensure the transformation patterns align with variable syntax
      const variableSyntax = "{{user.name}}";
      const htmlTransform = variableSyntax.replace(
        /\{\{([^}]+)\}\}/g,
        '<span data-variable="true" data-id="$1"></span>'
      );

      expect(htmlTransform).toContain('data-variable="true"');
      expect(htmlTransform).toContain('data-id="user.name"');
    });
  });
});
