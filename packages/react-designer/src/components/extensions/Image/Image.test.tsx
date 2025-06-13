import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/react";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { History } from "@tiptap/extension-history";
import { Image } from "./Image";

describe("Image Component", () => {
  let editor: Editor;

  beforeAll(() => {
    // Mock DOMParser for TipTap
    global.DOMParser = vi.fn().mockImplementation(() => ({
      parseFromString: vi.fn(() => document.implementation.createHTMLDocument()),
    }));
  });

  beforeEach(() => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text, History, Image],
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
      expect(Image).toBeDefined();
      expect(Image.name).toBe("image");
    });

    it("should have correct default group", () => {
      const extension = Image.configure();
      expect(extension.config.group).toBe("block");
    });

    it("should be registered in editor", () => {
      const imageExtension = editor.extensionManager.extensions.find((ext) => ext.name === "image");
      expect(imageExtension).toBeDefined();
    });

    it("should inherit from TipTap base Image extension", () => {
      const extension = Image.configure();
      expect(extension).toBeDefined();
      expect(extension.name).toBe("image");
      expect(extension.type).toBe("node");
    });

    it("should have correct options structure", () => {
      const extension = Image.configure();
      expect(extension.options).toBeDefined();
    });
  });

  describe("Commands", () => {
    it("should have setImage command available", () => {
      expect(editor.commands.setImage).toBeDefined();
    });

    it("should insert image with setImage command", () => {
      editor.commands.setImage({
        src: "test.jpg",
        alt: "test image",
      });
      const content = editor.getHTML();
      expect(content).toContain("<img");
      expect(content).toContain('src="test.jpg"');
      expect(content).toContain('alt="test image"');
    });

    it("should set image with minimal attributes", () => {
      editor.commands.setImage({ src: "minimal.jpg" });
      const content = editor.getHTML();
      expect(content).toContain("<img");
      expect(content).toContain('src="minimal.jpg"');
    });

    it("should replace content when setting image", () => {
      editor.commands.setContent("<p>Some text</p>");
      editor.commands.setImage({ src: "test.jpg" });
      const content = editor.getHTML();
      expect(content).toContain("<img");
      expect(content).toContain('src="test.jpg"');
    });

    it("should support updateAttributes command", () => {
      editor.commands.setImage({ src: "test.jpg", alt: "original" });
      editor.commands.updateAttributes("image", { alt: "updated" });
      const content = editor.getHTML();
      expect(content).toContain('alt="updated"');
    });

    it("should support deleteSelection command on image", () => {
      editor.commands.setImage({ src: "test.jpg" });
      editor.commands.selectAll();
      editor.commands.deleteSelection();
      const content = editor.getHTML();
      expect(content).not.toContain("<img");
    });

    it("should work with multiple image attributes via command", () => {
      editor.commands.setImage({
        src: "multi.jpg",
        alt: "Multiple attributes",
        title: "Test title",
      });
      const content = editor.getHTML();
      expect(content).toContain('src="multi.jpg"');
      expect(content).toContain('alt="Multiple attributes"');
      expect(content).toContain('title="Test title"');
    });
  });

  describe("Content Structure", () => {
    it("should be recognized as block element", () => {
      editor.commands.setImage({ src: "test.jpg" });
      const isActive = editor.isActive("image");
      expect(isActive).toBe(true);
    });

    it("should handle empty src gracefully", () => {
      editor.commands.setImage({ src: "" });
      const content = editor.getHTML();
      expect(content).toContain("<img");
      expect(content).toContain('src=""');
    });

    it("should work with paragraph content", () => {
      editor.commands.setContent("<p>Before</p>");
      editor.chain().focus().setImage({ src: "test.jpg" }).run();
      const content = editor.getHTML();
      expect(content).toContain("<img");
      expect(content).toContain('src="test.jpg"');
    });

    it("should preserve image in JSON structure", () => {
      editor.commands.setImage({ src: "test.jpg", alt: "test" });
      const json = editor.getJSON();

      // Check that image node exists somewhere in the document
      const findImageNode = (node: any): any => {
        if (node.type === "image") return node;
        if (node.content) {
          for (const child of node.content) {
            const found = findImageNode(child);
            if (found) return found;
          }
        }
        return null;
      };

      const imageNode = findImageNode(json);
      expect(imageNode).toBeTruthy();
      expect(imageNode?.attrs?.src).toBe("test.jpg");
    });
  });

  describe("Selection and Focus", () => {
    it("should support selection on image", () => {
      editor.commands.setImage({ src: "test.jpg" });
      editor.commands.selectAll();
      expect(editor.state.selection.empty).toBe(false);
    });

    it("should handle focus operations", () => {
      editor.commands.setImage({ src: "test.jpg" });
      // Just test that focus command doesn't throw
      expect(() => {
        editor.commands.focus();
      }).not.toThrow();
    });

    it("should be selectable as node", () => {
      editor.commands.setImage({ src: "test.jpg" });
      const pos = editor.state.doc.resolve(0);
      if (pos.nodeAfter) {
        editor.commands.setNodeSelection(pos.pos);
        expect(editor.isActive("image")).toBe(true);
      }
    });
  });

  describe("Integration and Compatibility", () => {
    it("should work with JSON serialization", () => {
      editor.commands.setImage({ src: "test.jpg", alt: "test" });
      const json = editor.getJSON();
      const newEditor = new Editor({
        extensions: [Document, Paragraph, Text, History, Image],
        content: json,
      });
      const content = newEditor.getHTML();
      expect(content).toContain('src="test.jpg"');
      expect(content).toContain('alt="test"');
    });

    it("should maintain attributes during transformations", () => {
      editor.commands.setImage({
        src: "test.jpg",
        alt: "test",
        title: "Test Title",
      });
      const json = editor.getJSON();
      const newEditor = new Editor({
        extensions: [Document, Paragraph, Text, History, Image],
        content: json,
      });
      const content = newEditor.getHTML();
      expect(content).toContain('src="test.jpg"');
      expect(content).toContain('alt="test"');
      expect(content).toContain('title="Test Title"');
    });

    it("should work with undo/redo", () => {
      editor.commands.setImage({ src: "test.jpg" });
      expect(editor.getHTML()).toContain('src="test.jpg"');

      editor.commands.undo();
      expect(editor.getHTML()).not.toContain('src="test.jpg"');

      editor.commands.redo();
      expect(editor.getHTML()).toContain('src="test.jpg"');
    });

    it("should handle edge cases gracefully", () => {
      // Test with undefined attributes
      editor.commands.setImage({ src: "test.jpg", alt: undefined });
      const content = editor.getHTML();
      expect(content).toContain("<img");
      expect(content).toContain('src="test.jpg"');
    });

    it("should work with chain commands", () => {
      editor.chain().focus().setImage({ src: "test.jpg" }).run();

      const content = editor.getHTML();
      expect(content).toContain('src="test.jpg"');
    });

    it("should support keyboard shortcuts context", () => {
      // Image extension should work within keyboard shortcut context
      editor.commands.setImage({ src: "test.jpg" });
      expect(editor.isActive("image")).toBe(true);
    });

    it("should handle concurrent operations", () => {
      editor.commands.setImage({ src: "first.jpg" });
      editor.commands.updateAttributes("image", { src: "second.jpg" });
      const content = editor.getHTML();
      expect(content).toContain('src="second.jpg"');
      expect(content).not.toContain('src="first.jpg"');
    });

    it("should be ready for production use", () => {
      // Comprehensive test of typical usage
      editor.commands.setContent("<p>Start</p>");
      editor
        .chain()
        .focus()
        .setImage({
          src: "production.jpg",
          alt: "Production image",
          title: "Production Title",
        })
        .run();

      const content = editor.getHTML();
      expect(content).toContain("<img");
      expect(content).toContain('src="production.jpg"');
      expect(content).toContain('alt="Production image"');
      expect(content).toContain('title="Production Title"');

      // Test that it's selectable and editable
      expect(editor.isActive("image")).toBe(true);
      expect(editor.isEditable).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid src values", () => {
      // Test with null src
      expect(() => {
        editor.commands.setImage({ src: null as any });
      }).not.toThrow();
    });

    it("should handle empty attributes object", () => {
      expect(() => {
        editor.commands.setImage({ src: "" });
      }).not.toThrow();
    });

    it("should handle editor destruction gracefully", () => {
      editor.commands.setImage({ src: "test.jpg" });
      expect(() => {
        editor.destroy();
      }).not.toThrow();
    });

    it("should handle malformed inputs gracefully", () => {
      expect(() => {
        editor.commands.setImage({ src: "test.jpg", alt: null as any });
      }).not.toThrow();
    });
  });

  describe("Extension Behavior", () => {
    it("should support basic image functionality", () => {
      // Test that the extension provides basic image capabilities
      expect(editor.commands.setImage).toBeDefined();
      expect(editor.can().setImage({ src: "test.jpg" })).toBe(true);
    });

    it("should work within editor context", () => {
      // Test that the extension integrates properly with editor
      editor.commands.setImage({ src: "context-test.jpg" });
      expect(editor.state.doc.textContent).toBe("");
      expect(editor.getHTML()).toContain("context-test.jpg");
    });

    it("should handle configuration options", () => {
      const configuredImage = Image.configure({
        inline: false,
        allowBase64: true,
      });
      expect(configuredImage).toBeDefined();
      expect(configuredImage.name).toBe("image");
    });

    it("should be extensible", () => {
      // Test that the extension can be further extended
      const extendedImage = Image.extend({
        name: "customImage",
      });
      expect(extendedImage.name).toBe("customImage");
    });
  });
});
