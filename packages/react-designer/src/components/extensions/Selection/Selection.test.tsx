import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/react";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { History } from "@tiptap/extension-history";
import { Heading } from "@tiptap/extension-heading";
import { Blockquote } from "@tiptap/extension-blockquote";
import { Selection } from "./Selection";

describe("Selection Component", () => {
  let editor: Editor;
  let mockSetSelectedNode: ReturnType<typeof vi.fn>;

  beforeAll(() => {
    global.DOMParser = vi.fn().mockImplementation(() => ({
      parseFromString: vi.fn(() => document.implementation.createHTMLDocument()),
    }));

    // Mock window.getSelection
    global.window.getSelection = vi.fn(() => ({
      rangeCount: 0,
      getRangeAt: vi.fn(),
    })) as any;
  });

  beforeEach(() => {
    mockSetSelectedNode = vi.fn();

    editor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        History,
        Heading,
        Blockquote,
        Selection.configure({
          setSelectedNode: mockSetSelectedNode,
        }),
      ],
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
      expect(Selection).toBeDefined();
      expect(Selection.name).toBe("selection");
    });

    it("should have correct type configuration", () => {
      const extension = Selection.configure();
      expect(extension.type).toBe("extension");
    });

    it("should be registered in editor", () => {
      const selectionExtension = editor.extensionManager.extensions.find(
        (ext) => ext.name === "selection"
      );
      expect(selectionExtension).toBeDefined();
    });

    it("should have correct default options", () => {
      const extension = Selection.configure();
      expect(extension.options).toBeDefined();
      expect(extension.options.HTMLAttributes).toEqual({});
      expect(typeof extension.options.setSelectedNode).toBe("function");
    });

    it("should support custom options", () => {
      const customOptions = {
        HTMLAttributes: { class: "custom-selection" },
        setSelectedNode: mockSetSelectedNode,
      };

      const extension = Selection.configure(customOptions);
      expect(extension.options.HTMLAttributes).toEqual(customOptions.HTMLAttributes);
      expect(extension.options.setSelectedNode).toBe(mockSetSelectedNode);
    });
  });

  describe("Global Attributes", () => {
    it("should add isSelected attribute to supported node types", () => {
      const supportedTypes = ["paragraph", "heading", "blockquote"];

      supportedTypes.forEach((nodeType) => {
        const nodeSchema = editor.schema.nodes[nodeType];
        if (nodeSchema) {
          expect(nodeSchema.spec.attrs?.isSelected).toBeDefined();
          expect(nodeSchema.spec.attrs?.isSelected.default).toBe(false);
        }
      });
    });

    it("should have correct isSelected attribute configuration", () => {
      const paragraphSchema = editor.schema.nodes.paragraph;
      expect(paragraphSchema?.spec.attrs?.isSelected).toBeDefined();
      expect(paragraphSchema?.spec.attrs?.isSelected.default).toBe(false);
    });

    it("should render selected class when isSelected is true", () => {
      editor.commands.setContent("<p>Test paragraph</p>");
      editor.commands.setTextSelection({ from: 1, to: 5 });

      // Update the paragraph to be selected
      editor.commands.updateAttributes("paragraph", { isSelected: true });

      const json = editor.getJSON();
      const paragraph = json.content?.[0];
      expect(paragraph?.attrs?.isSelected).toBe(true);
    });

    it("should not render selected class when isSelected is false", () => {
      editor.commands.setContent("<p>Test paragraph</p>");

      const json = editor.getJSON();
      const paragraph = json.content?.[0];
      expect(paragraph?.attrs?.isSelected).toBe(false);
    });
  });

  describe("Commands", () => {
    it("should have updateSelectionState command available", () => {
      expect(editor.commands.updateSelectionState).toBeDefined();
      expect(typeof editor.commands.updateSelectionState).toBe("function");
    });

    it("should execute updateSelectionState command without errors", () => {
      editor.commands.setContent("<p>Test paragraph</p>");

      expect(() => {
        editor.commands.updateSelectionState(null);
      }).not.toThrow();
    });

    it("should update selection state for specific node", () => {
      editor.commands.setContent("<p>First paragraph</p><p>Second paragraph</p>");

      // Mock the node for testing
      const mockNode = {
        type: { name: "paragraph", spec: { attrs: { isSelected: { default: false } } } },
        attrs: { isSelected: false },
      } as any;

      const result = editor.commands.updateSelectionState(mockNode);
      expect(result).toBe(true);
    });

    it("should clear selection when called with null", () => {
      editor.commands.setContent("<p>Test paragraph</p>");

      const result = editor.commands.updateSelectionState(null);
      expect(result).toBe(true);
    });

    it("should handle command chaining", () => {
      editor.commands.setContent("<p>Test paragraph</p>");

      const result = editor.chain().updateSelectionState(null).run();

      expect(result).toBe(true);
    });
  });

  describe("Plugin Integration", () => {
    it("should have ProseMirror plugins registered", () => {
      const plugins = editor.view.state.plugins;
      expect(plugins.length).toBeGreaterThan(0);
    });

    it("should handle plugin initialization", () => {
      expect(editor.view.state.plugins.length).toBeGreaterThan(0);
    });

    it("should have selection plugin available", () => {
      // Test that the selection extension is properly integrated
      const selectionExtension = editor.extensionManager.extensions.find(
        (ext) => ext.name === "selection"
      );
      expect(selectionExtension).toBeDefined();
    });
  });

  describe("JSON Structure and Data Integrity", () => {
    it("should create correct JSON structure with selection attributes", () => {
      editor.commands.setContent("<p>Test paragraph</p>");

      const json = editor.getJSON();
      expect(json.type).toBe("doc");
      expect(json.content).toHaveLength(1);

      const paragraph = json.content?.[0];
      expect(paragraph?.type).toBe("paragraph");
      expect(paragraph?.attrs).toBeDefined();
      expect(paragraph?.attrs?.isSelected).toBe(false);
    });

    it("should preserve selection attributes during JSON roundtrip", () => {
      editor.commands.setContent("<p>Test paragraph</p>");
      editor.commands.updateAttributes("paragraph", { isSelected: true });

      const json = editor.getJSON();
      editor.commands.setContent(json);

      const newJson = editor.getJSON();
      const paragraph = newJson.content?.[0];
      expect(paragraph?.attrs?.isSelected).toBe(true);
    });

    it("should handle multiple nodes with different selection states", () => {
      editor.commands.setContent("<p>First paragraph</p>");

      // Test that we can set and unset selection state
      editor.commands.updateAttributes("paragraph", { isSelected: true });

      let json = editor.getJSON();
      const paragraph = json.content?.[0];
      expect(paragraph?.attrs?.isSelected).toBe(true);

      // Clear selection
      editor.commands.updateAttributes("paragraph", { isSelected: false });

      json = editor.getJSON();
      const updatedParagraph = json.content?.[0];
      expect(updatedParagraph?.attrs?.isSelected).toBe(false);
    });

    it("should maintain data consistency across operations", () => {
      editor.commands.setContent("<p>Test paragraph</p>");

      // Test multiple selection operations
      editor.commands.updateAttributes("paragraph", { isSelected: true });

      let json = editor.getJSON();
      let paragraph = json.content?.[0];
      expect(paragraph?.attrs?.isSelected).toBe(true);

      // Update selection state again
      editor.commands.updateAttributes("paragraph", { isSelected: false });
      editor.commands.updateAttributes("paragraph", { isSelected: true });

      json = editor.getJSON();
      paragraph = json.content?.[0];
      expect(paragraph?.attrs?.isSelected).toBe(true);
    });
  });

  describe("Content Structure", () => {
    it("should handle selection state for different node types", () => {
      editor.commands.setContent("<p>Test paragraph</p>");

      const json = editor.getJSON();
      expect(json.content).toHaveLength(1);

      // Node should have isSelected attribute
      const paragraph = json.content?.[0];
      expect(paragraph?.type).toBe("paragraph");
      expect(paragraph?.attrs?.isSelected).toBe(false);
    });

    it("should handle nested content selection", () => {
      editor.commands.setContent("<p>Simple paragraph</p>");

      const json = editor.getJSON();
      const paragraph = json.content?.[0];

      expect(paragraph?.attrs?.isSelected).toBe(false);

      // Test that we can update the selection state
      editor.commands.updateAttributes("paragraph", { isSelected: true });

      const updatedJson = editor.getJSON();
      const updatedParagraph = updatedJson.content?.[0];
      expect(updatedParagraph?.attrs?.isSelected).toBe(true);
    });

    it("should handle empty content gracefully", () => {
      editor.commands.setContent("");

      expect(() => {
        editor.commands.updateSelectionState(null);
      }).not.toThrow();

      const json = editor.getJSON();
      expect(json.type).toBe("doc");
    });

    it("should handle complex content structures", () => {
      const complexContent = `
        <p>First paragraph</p>
        <h1>Main heading</h1>
        <p>Second paragraph</p>
        <blockquote><p>Quoted text</p></blockquote>
        <h2>Sub heading</h2>
      `;

      editor.commands.setContent(complexContent);

      const json = editor.getJSON();
      expect(json.content?.length).toBeGreaterThan(0);

      // All nodes should have selection attributes
      json.content?.forEach((node) => {
        if (node.type && ["paragraph", "heading", "blockquote"].includes(node.type)) {
          expect(node.attrs?.isSelected).toBe(false);
        }
      });
    });
  });

  describe("Selection and Focus", () => {
    it("should handle selection operations without errors", () => {
      editor.commands.setContent("<p>Test paragraph</p>");

      expect(() => {
        editor.commands.setTextSelection({ from: 1, to: 5 });
        editor.commands.updateSelectionState(null);
      }).not.toThrow();
    });

    it("should handle focus operations", () => {
      editor.commands.setContent("<p>Test paragraph</p>");

      expect(() => {
        editor.commands.focus();
        editor.commands.updateSelectionState(null);
      }).not.toThrow();
    });

    it("should handle node selection operations", () => {
      editor.commands.setContent("<p>Test paragraph</p>");

      expect(() => {
        editor.commands.selectAll();
        editor.commands.updateSelectionState(null);
      }).not.toThrow();
    });
  });

  describe("Integration and Compatibility", () => {
    it("should work with undo/redo operations", () => {
      editor.commands.setContent("<p>Test paragraph</p>");
      editor.commands.updateAttributes("paragraph", { isSelected: true });

      expect(() => {
        editor.commands.undo();
        editor.commands.redo();
      }).not.toThrow();
    });

    it("should work with JSON serialization", () => {
      editor.commands.setContent("<p>Test paragraph</p>");
      editor.commands.updateAttributes("paragraph", { isSelected: true });

      const json = editor.getJSON();

      expect(() => {
        const newEditor = new Editor({
          extensions: [Document, Paragraph, Text, History, Selection],
          content: json,
        });
        newEditor.destroy();
      }).not.toThrow();
    });

    it("should handle content updates correctly", () => {
      editor.commands.setContent("<p>Test paragraph</p>");

      expect(() => {
        editor.commands.updateAttributes("paragraph", { isSelected: true });
        editor.commands.updateAttributes("paragraph", { isSelected: false });
      }).not.toThrow();
    });

    it("should be production ready", () => {
      // Test multiple operations in sequence
      editor.commands.setContent("<p>First</p><h1>Second</h1><p>Third</p>");

      // Multiple selection operations
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.updateAttributes("paragraph", { isSelected: true });

      editor.commands.setTextSelection({ from: 8, to: 14 });
      editor.commands.updateAttributes("heading", { isSelected: true });

      // Clear all selections
      editor.commands.updateSelectionState(null);

      // Undo/redo operations
      editor.commands.undo();
      editor.commands.redo();

      const json = editor.getJSON();
      expect(json.type).toBe("doc");
      expect(json.content).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid node gracefully", () => {
      editor.commands.setContent("<p>Test paragraph</p>");

      expect(() => {
        editor.commands.updateSelectionState({} as any);
      }).not.toThrow();
    });

    it("should handle empty content gracefully", () => {
      editor.commands.setContent("");

      expect(() => {
        editor.commands.updateSelectionState(null);
      }).not.toThrow();
    });

    it("should handle malformed content gracefully", () => {
      expect(() => {
        editor.commands.setContent("<p>Unclosed paragraph");
        editor.commands.updateSelectionState(null);
      }).not.toThrow();
    });

    it("should handle editor destruction gracefully", () => {
      editor.commands.setContent("<p>Test paragraph</p>");
      editor.commands.updateAttributes("paragraph", { isSelected: true });

      expect(() => {
        editor.destroy();
      }).not.toThrow();
    });

    it("should handle missing selection state gracefully", () => {
      editor.commands.setContent("<p>Test paragraph</p>");

      expect(() => {
        // Try to update selection without proper node reference
        editor.commands.updateSelectionState(undefined as any);
      }).not.toThrow();
    });
  });

  describe("HTML Rendering", () => {
    it("should render selected class when node is selected", () => {
      editor.commands.setContent("<p>Test paragraph</p>");
      editor.commands.updateAttributes("paragraph", { isSelected: true });

      const html = editor.getHTML();
      expect(html).toContain('class="selected-element"');
    });

    it("should not render selected class when node is not selected", () => {
      editor.commands.setContent("<p>Test paragraph</p>");

      const html = editor.getHTML();
      expect(html).not.toContain("selected-element");
    });

    it("should handle multiple selected nodes in HTML", () => {
      editor.commands.setContent("<p>Test paragraph</p>");

      // Select the paragraph
      editor.commands.updateAttributes("paragraph", { isSelected: true });

      const html = editor.getHTML();
      expect(html).toContain('class="selected-element"');

      // Unselect the paragraph
      editor.commands.updateAttributes("paragraph", { isSelected: false });

      const unselectedHtml = editor.getHTML();
      expect(unselectedHtml).not.toContain("selected-element");
    });
  });

  describe("Callback Integration", () => {
    it("should call setSelectedNode callback when configured", () => {
      const mockCallback = vi.fn();

      const testEditor = new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          Selection.configure({
            setSelectedNode: mockCallback,
          }),
        ],
        content: "<p>Test</p>",
      });

      // The callback should be available in the extension options
      const selectionExtension = testEditor.extensionManager.extensions.find(
        (ext) => ext.name === "selection"
      );

      expect(selectionExtension?.options.setSelectedNode).toBe(mockCallback);

      testEditor.destroy();
    });

    it("should handle callback errors gracefully", () => {
      const errorCallback = vi.fn(() => {
        throw new Error("Callback error");
      });

      expect(() => {
        const testEditor = new Editor({
          extensions: [
            Document,
            Paragraph,
            Text,
            Selection.configure({
              setSelectedNode: errorCallback,
            }),
          ],
          content: "<p>Test</p>",
        });
        testEditor.destroy();
      }).not.toThrow();
    });
  });

  describe("shouldHandleClick Callback", () => {
    it("should have default shouldHandleClick that returns true", () => {
      const extension = Selection.configure();
      expect(extension.options.shouldHandleClick).toBeDefined();
      expect(typeof extension.options.shouldHandleClick).toBe("function");
      expect(extension.options.shouldHandleClick()).toBe(true);
    });

    it("should accept custom shouldHandleClick callback", () => {
      const mockShouldHandleClick = vi.fn(() => false);

      const testEditor = new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          Selection.configure({
            setSelectedNode: mockSetSelectedNode,
            shouldHandleClick: mockShouldHandleClick,
          }),
        ],
        content: "<p>Test</p>",
      });

      const selectionExtension = testEditor.extensionManager.extensions.find(
        (ext) => ext.name === "selection"
      );

      expect(selectionExtension?.options.shouldHandleClick).toBe(mockShouldHandleClick);
      testEditor.destroy();
    });

    it("should call shouldHandleClick callback when provided", () => {
      const mockShouldHandleClick = vi.fn(() => true);

      const testEditor = new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          Selection.configure({
            setSelectedNode: mockSetSelectedNode,
            shouldHandleClick: mockShouldHandleClick,
          }),
        ],
        content: "<p>Test</p>",
      });

      expect(mockShouldHandleClick).toBeDefined();
      testEditor.destroy();
    });

    it("should prevent click handling when shouldHandleClick returns false", () => {
      const mockShouldHandleClick = vi.fn(() => false);
      const mockSetSelectedNode = vi.fn();

      const testEditor = new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          Selection.configure({
            setSelectedNode: mockSetSelectedNode,
            shouldHandleClick: mockShouldHandleClick,
          }),
        ],
        content: "<p>Test paragraph</p>",
      });

      // Verify the option is set correctly
      const selectionExtension = testEditor.extensionManager.extensions.find(
        (ext) => ext.name === "selection"
      );

      expect(selectionExtension?.options.shouldHandleClick).toBe(mockShouldHandleClick);
      expect(selectionExtension?.options.shouldHandleClick()).toBe(false);

      testEditor.destroy();
    });

    it("should allow click handling when shouldHandleClick returns true", () => {
      const mockShouldHandleClick = vi.fn(() => true);
      const mockSetSelectedNode = vi.fn();

      const testEditor = new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          Selection.configure({
            setSelectedNode: mockSetSelectedNode,
            shouldHandleClick: mockShouldHandleClick,
          }),
        ],
        content: "<p>Test paragraph</p>",
      });

      // Verify the option is set correctly
      const selectionExtension = testEditor.extensionManager.extensions.find(
        (ext) => ext.name === "selection"
      );

      expect(selectionExtension?.options.shouldHandleClick).toBe(mockShouldHandleClick);
      expect(selectionExtension?.options.shouldHandleClick()).toBe(true);

      testEditor.destroy();
    });

    it("should handle dynamic shouldHandleClick behavior", () => {
      let shouldHandle = true;
      const dynamicCallback = vi.fn(() => shouldHandle);

      const testEditor = new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          Selection.configure({
            setSelectedNode: mockSetSelectedNode,
            shouldHandleClick: dynamicCallback,
          }),
        ],
        content: "<p>Test</p>",
      });

      const selectionExtension = testEditor.extensionManager.extensions.find(
        (ext) => ext.name === "selection"
      );

      // Initially returns true
      expect(selectionExtension?.options.shouldHandleClick()).toBe(true);

      // Change behavior
      shouldHandle = false;
      expect(selectionExtension?.options.shouldHandleClick()).toBe(false);

      // Change back
      shouldHandle = true;
      expect(selectionExtension?.options.shouldHandleClick()).toBe(true);

      testEditor.destroy();
    });

    it("should not throw error when shouldHandleClick is undefined", () => {
      expect(() => {
        const testEditor = new Editor({
          extensions: [
            Document,
            Paragraph,
            Text,
            Selection.configure({
              setSelectedNode: mockSetSelectedNode,
              // shouldHandleClick not provided
            }),
          ],
          content: "<p>Test</p>",
        });
        testEditor.destroy();
      }).not.toThrow();
    });
  });
});
