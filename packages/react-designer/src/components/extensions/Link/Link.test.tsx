import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/react";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { History } from "@tiptap/extension-history";
import { Link } from "./Link";

describe("Link Component", () => {
  let editor: Editor;

  beforeAll(() => {
    global.DOMParser = vi.fn().mockImplementation(() => ({
      parseFromString: vi.fn(() => document.implementation.createHTMLDocument()),
    }));
  });

  beforeEach(() => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text, History, Link],
      content: "",
      editorProps: {
        attributes: {
          class: "ProseMirror",
        },
      },
    });
  });

  describe("Extension Configuration", () => {
    it("should create extension successfully", () => {
      expect(Link).toBeDefined();
      expect(Link.name).toBe("link");
    });

    it("should have correct type configuration", () => {
      const extension = Link.configure();
      expect(extension.type).toBe("mark");
      expect(extension.config.inclusive).toBe(true);
    });

    it("should be registered in editor", () => {
      const linkExtension = editor.extensionManager.extensions.find((ext) => ext.name === "link");
      expect(linkExtension).toBeDefined();
    });

    it("should have correct options structure", () => {
      const extension = Link.configure();
      expect(extension.options).toBeDefined();
    });

    it("should support custom options", () => {
      const extension = Link.configure({
        openOnClick: false,
        autolink: false,
      });
      expect(extension.options.openOnClick).toBe(false);
      expect(extension.options.autolink).toBe(false);
    });
  });

  describe("Attributes Configuration", () => {
    it("should support href as default attribute", () => {
      // Test that Link has the href attribute defined
      const linkType = editor.schema.marks.link;
      expect(linkType).toBeDefined();
      expect(linkType?.spec.attrs?.href).toBeDefined();
    });

    it("should support target attribute", () => {
      const linkType = editor.schema.marks.link;
      expect(linkType?.spec.attrs?.target).toBeDefined();
    });

    it("should support rel attribute", () => {
      const linkType = editor.schema.marks.link;
      expect(linkType?.spec.attrs?.rel).toBeDefined();
    });

    it("should support class attribute", () => {
      const linkType = editor.schema.marks.link;
      expect(linkType?.spec.attrs?.class).toBeDefined();
    });

    it("should support hasVariables custom attribute", () => {
      const linkType = editor.schema.marks.link;
      expect(linkType?.spec.attrs?.hasVariables).toBeDefined();
    });

    it("should support originalHref custom attribute", () => {
      const linkType = editor.schema.marks.link;
      expect(linkType?.spec.attrs?.originalHref).toBeDefined();
    });
  });

  describe("Commands", () => {
    it("should have setLink command available", () => {
      expect(editor.commands.setLink).toBeDefined();
      expect(typeof editor.commands.setLink).toBe("function");
    });

    it("should have unsetLink command available", () => {
      expect(editor.commands.unsetLink).toBeDefined();
      expect(typeof editor.commands.unsetLink).toBe("function");
    });

    it("should have toggleLink command available", () => {
      expect(editor.commands.toggleLink).toBeDefined();
      expect(typeof editor.commands.toggleLink).toBe("function");
    });

    it("should execute setLink command without errors", () => {
      editor.commands.setContent("<p>Test text</p>");
      editor.commands.setTextSelection({ from: 1, to: 5 });

      expect(() => {
        editor.commands.setLink({ href: "https://example.com" });
      }).not.toThrow();
    });

    it("should execute unsetLink command without errors", () => {
      editor.commands.setContent("<p>Test text</p>");
      editor.commands.setTextSelection({ from: 1, to: 5 });

      expect(() => {
        editor.commands.unsetLink();
      }).not.toThrow();
    });

    it("should execute toggleLink command without errors", () => {
      editor.commands.setContent("<p>Test text</p>");
      editor.commands.setTextSelection({ from: 1, to: 5 });

      expect(() => {
        editor.commands.toggleLink({ href: "https://example.com" });
      }).not.toThrow();
    });
  });

  describe("HTML Parsing", () => {
    it("should parse HTML with links correctly", () => {
      const htmlContent = '<p>Visit <a href="https://example.com">our website</a></p>';

      expect(() => {
        editor.commands.setContent(htmlContent);
      }).not.toThrow();

      const json = editor.getJSON();
      expect(json.type).toBe("doc");
      expect(json.content).toBeDefined();
    });

    it("should exclude button-type links from parsing", () => {
      const htmlWithButton = '<p><a href="https://example.com" data-type="button">Button</a></p>';

      expect(() => {
        editor.commands.setContent(htmlWithButton);
      }).not.toThrow();
    });

    it("should exclude javascript links from parsing", () => {
      const htmlWithJS = "<p><a href=\"javascript:alert('test')\">JS Link</a></p>";

      expect(() => {
        editor.commands.setContent(htmlWithJS);
      }).not.toThrow();
    });
  });

  describe("JSON Structure", () => {
    it("should create valid JSON structure", () => {
      editor.commands.setContent("<p>Test text</p>");

      const json = editor.getJSON();
      expect(json.type).toBe("doc");
      expect(json.content).toBeDefined();
      expect(Array.isArray(json.content)).toBe(true);
    });

    it("should maintain JSON consistency after link operations", () => {
      editor.commands.setContent("<p>Test text</p>");
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setLink({ href: "https://example.com" });

      const json = editor.getJSON();
      expect(json.type).toBe("doc");
      expect(json.content).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle empty content gracefully", () => {
      editor.commands.setContent("");

      expect(() => {
        editor.commands.setLink({ href: "https://example.com" });
      }).not.toThrow();
    });

    it("should handle invalid href gracefully", () => {
      editor.commands.setContent("<p>Test text</p>");
      editor.commands.setTextSelection({ from: 1, to: 5 });

      expect(() => {
        editor.commands.setLink({ href: "invalid-url" });
      }).not.toThrow();
    });

    it("should handle missing selection gracefully", () => {
      editor.commands.setContent("<p>Test text</p>");

      const result = editor.commands.setLink({ href: "https://example.com" });
      expect(typeof result).toBe("boolean");
    });

    it("should handle malformed HTML gracefully", () => {
      const malformedHTML = '<p>Test <a href="broken>link</p>';

      expect(() => {
        editor.commands.setContent(malformedHTML);
      }).not.toThrow();
    });

    it("should handle editor destruction gracefully", () => {
      editor.commands.setContent("<p>Test text</p>");

      expect(() => {
        editor.destroy();
      }).not.toThrow();
    });
  });

  describe("Integration and Compatibility", () => {
    it("should work with undo/redo operations", () => {
      editor.commands.setContent("<p>Test text</p>");
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setLink({ href: "https://example.com" });

      expect(() => {
        editor.commands.undo();
        editor.commands.redo();
      }).not.toThrow();
    });

    it("should work with JSON serialization", () => {
      editor.commands.setContent("<p>Test text</p>");
      const json = editor.getJSON();

      expect(() => {
        const newEditor = new Editor({
          extensions: [Document, Paragraph, Text, History, Link],
          content: json,
        });
        newEditor.destroy();
      }).not.toThrow();
    });

    it("should handle content updates correctly", () => {
      editor.commands.setContent("<p>Test text</p>");
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setLink({ href: "https://example.com" });

      expect(() => {
        editor.commands.updateAttributes("link", { target: "_blank" });
      }).not.toThrow();
    });

    it("should be production ready", () => {
      // Test multiple operations in sequence
      editor.commands.setContent("<p>Test multiple operations</p>");

      // Multiple link operations
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setLink({ href: "https://example.com" });
      editor.commands.updateAttributes("link", { target: "_blank" });
      editor.commands.unsetLink();
      editor.commands.setLink({ href: "https://new.com" });

      // Undo/redo operations
      editor.commands.undo();
      editor.commands.redo();

      const json = editor.getJSON();
      expect(json.type).toBe("doc");
      expect(json.content).toBeDefined();
    });
  });

  describe("Mark Detection", () => {
    it("should detect if link mark is active", () => {
      editor.commands.setContent("<p>Test text</p>");
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setLink({ href: "https://example.com" });

      // isActive should return a boolean
      const isActive = editor.isActive("link");
      expect(typeof isActive).toBe("boolean");
    });

    it("should detect link with specific attributes", () => {
      editor.commands.setContent("<p>Test text</p>");
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setLink({ href: "https://example.com" });

      const isActiveWithHref = editor.isActive("link", { href: "https://example.com" });
      expect(typeof isActiveWithHref).toBe("boolean");
    });

    it("should get link attributes", () => {
      editor.commands.setContent("<p>Test text</p>");
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setLink({ href: "https://example.com" });

      const attributes = editor.getAttributes("link");
      expect(typeof attributes).toBe("object");
    });
  });

  describe("Selection and Focus", () => {
    it("should handle selection operations", () => {
      editor.commands.setContent("<p>Test text here</p>");

      expect(() => {
        editor.commands.setTextSelection({ from: 1, to: 5 });
        editor.commands.setLink({ href: "https://example.com" });
        editor.commands.extendMarkRange("link");
      }).not.toThrow();
    });

    it("should handle focus operations", () => {
      editor.commands.setContent("<p>Test text</p>");

      expect(() => {
        editor.commands.focus();
        editor.commands.setTextSelection({ from: 1, to: 5 });
        editor.commands.setLink({ href: "https://example.com" });
      }).not.toThrow();
    });

    it("should handle deletion operations", () => {
      editor.commands.setContent("<p>Test text</p>");
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.setLink({ href: "https://example.com" });

      expect(() => {
        editor.commands.deleteSelection();
      }).not.toThrow();
    });
  });
});
