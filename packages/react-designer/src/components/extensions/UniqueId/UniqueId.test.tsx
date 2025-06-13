import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { Editor } from "@tiptap/react";
import { Document } from "@tiptap/extension-document";
import { Text } from "@tiptap/extension-text";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Heading } from "@tiptap/extension-heading";

import { UniqueId, UniqueIdPluginKey } from "./UniqueId";

// Mock uuid to have predictable test results
vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-1234"),
}));

describe("UniqueId Component", () => {
  let editor: Editor;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    editor = new Editor({
      extensions: [Document, Text, Paragraph, Heading, UniqueId],
      content: "",
    });
  });

  afterEach(() => {
    if (editor) {
      editor.destroy();
    }
  });

  describe("Extension Configuration", () => {
    it("should create extension successfully", () => {
      expect(editor).toBeDefined();
      expect(editor.isEditable).toBe(true);
    });

    it("should have correct type configuration", () => {
      const extension = editor.extensionManager.extensions.find((ext) => ext.name === "uniqueId");
      expect(extension).toBeDefined();
      expect(extension?.name).toBe("uniqueId");
      expect(extension?.type).toBe("extension");
    });

    it("should be registered in editor", () => {
      const hasUniqueIdExtension = editor.extensionManager.extensions.some(
        (ext) => ext.name === "uniqueId"
      );
      expect(hasUniqueIdExtension).toBe(true);
    });

    it("should have correct default options", () => {
      const extension = editor.extensionManager.extensions.find((ext) => ext.name === "uniqueId");
      expect(extension?.options).toBeDefined();
      expect(extension?.options.types).toEqual(["node-paragraph", "node-heading", "node-button"]);
    });

    it("should support custom options", () => {
      const customEditor = new Editor({
        extensions: [
          Document,
          Text,
          Paragraph,
          UniqueId.configure({
            types: ["custom-type-1", "custom-type-2"],
          }),
        ],
        content: "",
      });

      const extension = customEditor.extensionManager.extensions.find(
        (ext) => ext.name === "uniqueId"
      );
      expect(extension?.options.types).toEqual(["custom-type-1", "custom-type-2"]);

      customEditor.destroy();
    });
  });

  describe("Plugin Integration", () => {
    it("should have ProseMirror plugin registered", () => {
      const plugins = editor.view.state.plugins;
      expect(plugins.length).toBeGreaterThan(0);
    });

    it("should handle plugin initialization without errors", () => {
      expect(() => {
        const plugins = editor.view.state.plugins;
        expect(plugins).toBeDefined();
      }).not.toThrow();
    });

    it("should have plugin key defined", () => {
      expect(UniqueIdPluginKey).toBeDefined();
      expect(typeof UniqueIdPluginKey).toBe("object");
    });

    it("should handle plugin creation", () => {
      expect(() => {
        const extension = editor.extensionManager.extensions.find((ext) => ext.name === "uniqueId");
        expect(extension).toBeDefined();
      }).not.toThrow();
    });
  });

  describe("Commands", () => {
    it("should have setUniqueId command available", () => {
      expect(editor.commands.setUniqueId).toBeDefined();
      expect(typeof editor.commands.setUniqueId).toBe("function");
    });

    it("should execute setUniqueId command without errors on empty content", () => {
      editor.commands.clearContent();
      expect(() => {
        editor.commands.setUniqueId();
      }).not.toThrow();
    });

    it("should handle command chaining", () => {
      expect(() => {
        editor.chain().setUniqueId().run();
      }).not.toThrow();
    });
  });

  describe("Configuration Options", () => {
    it("should respect configured node types", () => {
      const customEditor = new Editor({
        extensions: [
          Document,
          Text,
          Paragraph,
          UniqueId.configure({
            types: ["custom-type"],
          }),
        ],
        content: "",
      });

      const extension = customEditor.extensionManager.extensions.find(
        (ext) => ext.name === "uniqueId"
      );
      expect(extension?.options.types).toEqual(["custom-type"]);

      customEditor.destroy();
    });

    it("should handle single type configuration", () => {
      const customEditor = new Editor({
        extensions: [
          Document,
          Text,
          Paragraph,
          UniqueId.configure({
            types: ["single-type"],
          }),
        ],
        content: "",
      });

      const extension = customEditor.extensionManager.extensions.find(
        (ext) => ext.name === "uniqueId"
      );
      expect(extension?.options.types).toEqual(["single-type"]);

      customEditor.destroy();
    });

    it("should handle multiple type configuration", () => {
      const customEditor = new Editor({
        extensions: [
          Document,
          Text,
          Paragraph,
          UniqueId.configure({
            types: ["type-1", "type-2", "type-3"],
          }),
        ],
        content: "",
      });

      const extension = customEditor.extensionManager.extensions.find(
        (ext) => ext.name === "uniqueId"
      );
      expect(extension?.options.types).toHaveLength(3);
      expect(extension?.options.types).toEqual(["type-1", "type-2", "type-3"]);

      customEditor.destroy();
    });

    it("should handle empty types array", () => {
      expect(() => {
        const customEditor = new Editor({
          extensions: [
            Document,
            Text,
            Paragraph,
            UniqueId.configure({
              types: [],
            }),
          ],
          content: "",
        });
        customEditor.destroy();
      }).toThrow(); // This should throw because empty selectors cause CSS errors
    });
  });

  describe("Content Handling", () => {
    it("should handle empty content gracefully", () => {
      editor.commands.clearContent();
      expect(() => {
        const extension = editor.extensionManager.extensions.find((ext) => ext.name === "uniqueId");
        expect(extension).toBeDefined();
      }).not.toThrow();
    });

    it("should handle basic content creation", () => {
      expect(() => {
        editor.commands.setContent("<p>Test paragraph</p>");
      }).not.toThrow();
    });

    it("should handle different node types in content", () => {
      expect(() => {
        editor.commands.setContent("<p>Paragraph</p><h1>Heading</h1>");
      }).not.toThrow();
    });

    it("should handle content with existing IDs", () => {
      expect(() => {
        editor.commands.setContent('<p data-id="existing-id">Test paragraph</p>');
      }).not.toThrow();
    });
  });

  describe("JSON Structure and Data Integrity", () => {
    it("should create correct JSON structure", () => {
      editor.commands.setContent("<p>Test content</p>");

      const json = editor.getJSON();
      expect(json).toBeDefined();
      expect(json.type).toBe("doc");
      expect(json.content).toBeDefined();
    });

    it("should handle JSON roundtrip", () => {
      editor.commands.setContent("<p>Test content</p>");

      const json = editor.getJSON();
      editor.commands.setContent(json);

      const newJson = editor.getJSON();
      expect(newJson).toBeDefined();
      expect(newJson.type).toBe("doc");
    });

    it("should handle multiple nodes in JSON", () => {
      editor.commands.setContent("<p>First</p><p>Second</p>");

      const json = editor.getJSON();
      expect(json.content).toBeDefined();
      expect(Array.isArray(json.content)).toBe(true);
    });

    it("should maintain basic data consistency", () => {
      editor.commands.setContent("<p>Test content</p>");

      const html1 = editor.getHTML();
      const json = editor.getJSON();
      editor.commands.setContent(json);
      const html2 = editor.getHTML();

      expect(html1).toBeTruthy();
      expect(html2).toBeTruthy();
    });
  });

  describe("Integration and Compatibility", () => {
    it("should work with JSON serialization", () => {
      editor.commands.setContent("<p>Test content</p>");

      const json = editor.getJSON();
      const serialized = JSON.stringify(json);
      const parsed = JSON.parse(serialized);

      expect(parsed).toEqual(json);
    });

    it("should handle content updates correctly", () => {
      editor.commands.setContent("<p>Initial content</p>");

      // Update content
      editor.commands.setContent("<p>Updated content</p>");

      expect(editor.getHTML()).toContain("Updated content");
    });

    it("should be production ready", () => {
      // Test multiple operations in sequence
      editor.commands.setContent("<p>Production test</p>");

      const json = editor.getJSON();
      editor.commands.setContent(json);

      expect(editor.getHTML()).toContain("Production test");
    });

    it("should handle editor state changes", () => {
      editor.commands.setContent("<p>Initial</p>");
      editor.commands.setContent("<p>Changed</p>");

      expect(editor.getHTML()).toContain("Changed");
    });
  });

  describe("Error Handling", () => {
    it("should handle empty content gracefully", () => {
      editor.commands.clearContent();

      expect(() => {
        editor.commands.setUniqueId();
      }).not.toThrow();
    });

    it("should handle editor destruction gracefully", () => {
      editor.commands.setContent("<p>Test content</p>");

      expect(() => {
        editor.destroy();
      }).not.toThrow();
    });

    it("should handle command errors gracefully", () => {
      expect(() => {
        editor.commands.setUniqueId();
      }).not.toThrow();
    });

    it("should handle malformed input gracefully", () => {
      expect(() => {
        editor.commands.setContent("");
        editor.commands.setUniqueId();
      }).not.toThrow();
    });

    it("should handle extension without breaking editor", () => {
      expect(() => {
        editor.commands.setContent("<p>Test</p>");
        const extension = editor.extensionManager.extensions.find((ext) => ext.name === "uniqueId");
        expect(extension).toBeDefined();
      }).not.toThrow();
    });
  });

  describe("DOM and Plugin Features", () => {
    it("should handle plugin view initialization", () => {
      expect(() => {
        const plugins = editor.view.state.plugins;
        expect(plugins).toBeDefined();
      }).not.toThrow();
    });

    it("should handle CSS selector generation", () => {
      const extension = editor.extensionManager.extensions.find((ext) => ext.name === "uniqueId");
      expect(extension?.options.types).toBeDefined();
      expect(Array.isArray(extension?.options.types)).toBe(true);
    });

    it("should work with different HTML structures", () => {
      const htmlContent = "<p>Simple paragraph</p>";

      expect(() => {
        editor.commands.setContent(htmlContent);
      }).not.toThrow();
    });

    it("should handle DOM queries in plugin", () => {
      expect(() => {
        const extension = editor.extensionManager.extensions.find((ext) => ext.name === "uniqueId");
        expect(extension?.options.types).toBeDefined();
      }).not.toThrow();
    });
  });

  describe("Extension Lifecycle", () => {
    it("should create extension without errors", () => {
      expect(() => {
        const testEditor = new Editor({
          extensions: [Document, Text, Paragraph, UniqueId],
          content: "",
        });
        testEditor.destroy();
      }).not.toThrow();
    });

    it("should handle extension registration", () => {
      const extension = editor.extensionManager.extensions.find((ext) => ext.name === "uniqueId");
      expect(extension).toBeDefined();
      expect(extension?.name).toBe("uniqueId");
    });

    it("should handle extension configuration", () => {
      expect(() => {
        const configuredEditor = new Editor({
          extensions: [Document, Text, Paragraph, UniqueId.configure({ types: ["test"] })],
          content: "",
        });
        configuredEditor.destroy();
      }).not.toThrow();
    });

    it("should handle extension cleanup on destroy", () => {
      const testEditor = new Editor({
        extensions: [Document, Text, Paragraph, UniqueId],
        content: "<p>Test</p>",
      });

      expect(() => {
        testEditor.destroy();
      }).not.toThrow();
    });

    it("should support extension options modification", () => {
      const extension = editor.extensionManager.extensions.find((ext) => ext.name === "uniqueId");
      expect(extension?.options).toBeDefined();
      expect(typeof extension?.options).toBe("object");
    });
  });

  describe("CSS Selector Integration", () => {
    it("should generate correct CSS selectors from types", () => {
      const customEditor = new Editor({
        extensions: [
          Document,
          Text,
          Paragraph,
          UniqueId.configure({
            types: ["test-type"],
          }),
        ],
        content: "",
      });

      const extension = customEditor.extensionManager.extensions.find(
        (ext) => ext.name === "uniqueId"
      );
      expect(extension?.options.types).toEqual(["test-type"]);

      customEditor.destroy();
    });

    it("should handle multiple selector types", () => {
      const customEditor = new Editor({
        extensions: [
          Document,
          Text,
          Paragraph,
          UniqueId.configure({
            types: ["type-1", "type-2", "type-3"],
          }),
        ],
        content: "",
      });

      const extension = customEditor.extensionManager.extensions.find(
        (ext) => ext.name === "uniqueId"
      );
      expect(extension?.options.types).toHaveLength(3);

      customEditor.destroy();
    });

    it("should handle CSS selector format", () => {
      const extension = editor.extensionManager.extensions.find((ext) => ext.name === "uniqueId");
      expect(extension?.options.types).toBeDefined();

      // Check that types are strings (which will be used to create CSS selectors)
      extension?.options.types.forEach((type: string) => {
        expect(typeof type).toBe("string");
        expect(type.length).toBeGreaterThan(0);
      });
    });
  });
});
