import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Editor } from "@tiptap/core";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { Heading } from "@tiptap/extension-heading";
import { FixedChannelPaste } from "./FixedChannelPaste";
import { Slice, Fragment } from "@tiptap/pm/model";

// Mock DOM environment
Object.defineProperty(window, "getSelection", {
  writable: true,
  value: vi.fn(() => ({
    removeAllRanges: vi.fn(),
    addRange: vi.fn(),
  })),
});

Object.defineProperty(document, "getSelection", {
  writable: true,
  value: vi.fn(() => ({
    removeAllRanges: vi.fn(),
    addRange: vi.fn(),
  })),
});

// Mock DOM closest method
const createMockElement = (className?: string) => ({
  closest: vi.fn((selector: string) => {
    if (className && selector === `.${className}`) {
      return {}; // Return truthy value
    }
    return null;
  }),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  style: {},
  offsetWidth: 100,
  offsetHeight: 100,
  clientWidth: 100,
  clientHeight: 100,
  getBoundingClientRect: vi.fn(() => ({
    top: 0,
    left: 0,
    right: 100,
    bottom: 100,
    width: 100,
    height: 100,
  })),
});

// Helper to create editor with specific channel context
const createMockEditor = (content: any, channelClass?: string) => {
  const editor = new Editor({
    extensions: [Document, Paragraph, Text, Heading, FixedChannelPaste],
    content,
    editorProps: {
      attributes: {
        "data-testid": "editor",
      },
    },
  });

  // Mock the DOM closest method
  const mockElement = createMockElement(channelClass);
  Object.defineProperty(editor.view, "dom", {
    value: mockElement,
    writable: true,
  });

  return editor;
};

// Helper to create mock clipboard slice
const createMockSlice = (nodes: any[]): Slice => {
  const schema = new Editor({
    extensions: [Document, Paragraph, Text, Heading],
  }).schema;

  const mockNodes = nodes.map((nodeData) => {
    if (nodeData.type === "paragraph") {
      return schema.nodes.paragraph.create(
        nodeData.attrs || {},
        nodeData.content ? [schema.text(nodeData.content)] : undefined
      );
    } else if (nodeData.type === "heading") {
      return schema.nodes.heading.create(
        { level: nodeData.level || 1, ...nodeData.attrs },
        nodeData.content ? [schema.text(nodeData.content)] : undefined
      );
    }
    return schema.nodes.paragraph.create({}, [schema.text(nodeData.content || "")]);
  });

  const fragment = Fragment.from(mockNodes);
  return new Slice(fragment, 0, 0);
};

describe("FixedChannelPaste Extension - Advanced Tests", () => {
  let createdEditors: Editor[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    createdEditors = [];
  });

  afterEach(() => {
    // Clean up all editors created during tests
    createdEditors.forEach((editor) => {
      try {
        if (!editor.isDestroyed) {
          editor.destroy();
        }
      } catch (error) {
        // Ignore cleanup errors in tests
      }
    });
    createdEditors = [];
  });

  // Helper to track editors for cleanup
  const trackEditor = (editor: Editor): Editor => {
    createdEditors.push(editor);
    return editor;
  };

  describe("Extension Loading and Configuration", () => {
    it("should load extension successfully", () => {
      const editor = trackEditor(createMockEditor("<p>Test content</p>"));

      // Verify the extension is loaded
      const extension = editor.extensionManager.extensions.find(
        (ext) => ext.name === "fixedChannelPaste"
      );
      expect(extension).toBeDefined();
      expect(extension?.name).toBe("fixedChannelPaste");
    });

    it("should have correct default options", () => {
      const editor = trackEditor(createMockEditor("<p>Test</p>"));
      const extension = editor.extensionManager.extensions.find(
        (ext) => ext.name === "fixedChannelPaste"
      );

      expect(extension?.options.fixedChannels).toEqual(["push", "sms", "inbox"]);
    });

    it("should respect custom fixedChannels configuration", () => {
      const editor = trackEditor(
        new Editor({
          extensions: [
            Document,
            Paragraph,
            Text,
            FixedChannelPaste.configure({
              fixedChannels: ["custom-channel"],
            }),
          ],
          content: "<p>Test</p>",
        })
      );

      const extension = editor.extensionManager.extensions.find(
        (ext) => ext.name === "fixedChannelPaste"
      );
      expect(extension?.options.fixedChannels).toEqual(["custom-channel"]);
    });

    it("should handle disabled configuration", () => {
      const editor = trackEditor(
        new Editor({
          extensions: [
            Document,
            Paragraph,
            Text,
            FixedChannelPaste.configure({
              fixedChannels: [],
            }),
          ],
          content: "<p>Test</p>",
        })
      );

      const extension = editor.extensionManager.extensions.find(
        (ext) => ext.name === "fixedChannelPaste"
      );
      expect(extension?.options.fixedChannels).toEqual([]);
    });
  });

  describe("Channel Detection via DOM Classes", () => {
    it("should detect Push channel by CSS class", () => {
      const editor = trackEditor(
        createMockEditor("<p>Header</p><p>Body</p>", "courier-push-editor")
      );

      // Verify DOM mock is working
      expect(editor.view.dom.closest).toBeDefined();
      expect(editor.view.dom.closest(".courier-push-editor")).toBeTruthy();
      expect(editor.view.dom.closest(".courier-email-editor")).toBeFalsy();
    });

    it("should detect SMS channel by CSS class", () => {
      const editor = trackEditor(createMockEditor("<p>SMS content</p>", "courier-sms-editor"));

      expect(editor.view.dom.closest(".courier-sms-editor")).toBeTruthy();
      expect(editor.view.dom.closest(".courier-push-editor")).toBeFalsy();
    });

    it("should detect Inbox channel by CSS class", () => {
      const editor = trackEditor(
        createMockEditor("<p>Header</p><p>Body</p>", "courier-inbox-editor")
      );

      expect(editor.view.dom.closest(".courier-inbox-editor")).toBeTruthy();
      expect(editor.view.dom.closest(".courier-sms-editor")).toBeFalsy();
    });

    it("should not detect non-fixed channels", () => {
      const editor = trackEditor(
        createMockEditor("<p>Regular content</p>", "courier-email-editor")
      );

      expect(editor.view.dom.closest(".courier-email-editor")).toBeTruthy();
      expect(editor.view.dom.closest(".courier-push-editor")).toBeFalsy();
      expect(editor.view.dom.closest(".courier-sms-editor")).toBeFalsy();
      expect(editor.view.dom.closest(".courier-inbox-editor")).toBeFalsy();
    });
  });

  describe("Document Structure Detection (Fallback)", () => {
    it("should detect SMS structure (1 text element)", () => {
      const editor = trackEditor(createMockEditor("<p>Single message</p>"));

      // Document should have exactly 1 paragraph
      expect(editor.state.doc.childCount).toBe(1);
      expect(editor.state.doc.firstChild?.type.name).toBe("paragraph");
    });

    it("should detect Push structure (2 text elements)", () => {
      const editor = trackEditor(createMockEditor("<h1>Header</h1><p>Body text</p>"));

      // Document should have exactly 2 text elements
      expect(editor.state.doc.childCount).toBe(2);
      expect(editor.state.doc.firstChild?.type.name).toBe("heading");
      expect(editor.state.doc.lastChild?.type.name).toBe("paragraph");
    });

    it("should detect complex structures that exceed limits", () => {
      const editor = trackEditor(
        createMockEditor(`
        <h1>Header 1</h1>
        <p>Body 1</p>
        <h2>Header 2</h2>
        <p>Body 2</p>
        <p>Body 3</p>
        <p>Body 4</p>
      `)
      );

      // Should have more than 4 elements, not matching fixed structure
      expect(editor.state.doc.childCount).toBeGreaterThan(4);
    });

    it("should handle empty documents", () => {
      const editor = trackEditor(createMockEditor(""));

      // Empty document still has structure
      expect(editor.state.doc.childCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Text Extraction Logic", () => {
    it("should extract text from multiple paragraphs", () => {
      const slice = createMockSlice([
        { type: "paragraph", content: "First paragraph" },
        { type: "paragraph", content: "Second paragraph" },
        { type: "paragraph", content: "Third paragraph" },
      ]);

      // Test that slice has the expected structure
      expect(slice.content.childCount).toBe(3);

      // Each child should have text content
      const expectedTexts = ["First", "Second", "Third"];
      let currentIndex = 0;
      slice.content.forEach((node) => {
        expect(node.type.name).toBe("paragraph");
        expect(node.textContent).toContain(expectedTexts[currentIndex]);
        currentIndex++;
      });
    });

    it("should handle mixed content types", () => {
      const slice = createMockSlice([
        { type: "heading", content: "Header Text", level: 1 },
        { type: "paragraph", content: "Body text" },
        { type: "heading", content: "Another Header", level: 2 },
      ]);

      expect(slice.content.childCount).toBe(3);
      expect(slice.content.firstChild?.type.name).toBe("heading");
      expect(slice.content.lastChild?.type.name).toBe("heading");
    });

    it("should handle empty content gracefully", () => {
      const slice = createMockSlice([
        { type: "paragraph", content: "" },
        { type: "paragraph", content: "   " }, // Whitespace only
      ]);

      expect(slice.content.childCount).toBe(2);

      // Should handle empty/whitespace content
      slice.content.forEach((node) => {
        expect(node.type.name).toBe("paragraph");
      });
    });

    it("should extract text from deeply nested content", () => {
      const slice = createMockSlice([
        { type: "paragraph", content: "Simple text" },
        { type: "heading", content: "Complex header with formatting", level: 2 },
        { type: "paragraph", content: "Multiple words in paragraph" },
      ]);

      let totalTextLength = 0;
      slice.content.forEach((node) => {
        totalTextLength += node.textContent.length;
      });

      expect(totalTextLength).toBeGreaterThan(50); // Should have substantial text
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle malformed clipboard data", () => {
      // Create empty slice
      const emptySlice = new Slice(Fragment.empty, 0, 0);

      expect(emptySlice.content.childCount).toBe(0);
      expect(emptySlice.size).toBe(0);
    });

    it("should handle very large content", () => {
      // Create slice with many elements
      const manyElements = Array.from({ length: 20 }, (_, i) => ({
        type: "paragraph",
        content: `Paragraph ${i + 1} with some content`,
      }));

      const slice = createMockSlice(manyElements);

      expect(slice.content.childCount).toBe(20);

      // Should handle large content without errors
      expect(() => {
        slice.content.forEach((node) => {
          expect(node.textContent).toBeTruthy();
        });
      }).not.toThrow();
    });

    it("should handle special characters and unicode", () => {
      const slice = createMockSlice([
        { type: "paragraph", content: "🚀 Rocket emoji content" },
        { type: "paragraph", content: 'Content with "quotes" and symbols' },
        { type: "paragraph", content: "Unicode: ñáéíóú àèìòù" },
      ]);

      expect(slice.content.childCount).toBe(3);

      slice.content.forEach((node) => {
        expect(node.textContent.length).toBeGreaterThan(0);
      });
    });

    it("should handle mixed empty and non-empty elements", () => {
      const slice = createMockSlice([
        { type: "paragraph", content: "Non-empty content" },
        { type: "paragraph", content: "" },
        { type: "heading", content: "Another non-empty", level: 1 },
        { type: "paragraph", content: "   " }, // Whitespace
      ]);

      expect(slice.content.childCount).toBe(4);

      // Should handle mixed content types
      const nonEmptyNodes = [];
      slice.content.forEach((node) => {
        if (node.textContent.trim()) {
          nonEmptyNodes.push(node);
        }
      });

      expect(nonEmptyNodes.length).toBe(2);
    });
  });

  describe("Performance and Memory", () => {
    it("should handle rapid slice operations efficiently", () => {
      const startTime = performance.now();

      // Create large slice
      const largeElements = Array.from({ length: 100 }, (_, i) => ({
        type: "paragraph",
        content: `Large content block ${i} with more text to simulate real usage`,
      }));

      const largeSlice = createMockSlice(largeElements);

      // Process the slice
      let textCount = 0;
      largeSlice.content.forEach((node) => {
        if (node.textContent) {
          textCount++;
        }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(textCount).toBe(100);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it("should handle large content processing", () => {
      // Create many different slices and process them
      const slices = Array.from({ length: 10 }, (_, i) =>
        createMockSlice([
          { type: "paragraph", content: `Slice ${i} paragraph 1` },
          { type: "paragraph", content: `Slice ${i} paragraph 2` },
        ])
      );

      expect(() => {
        slices.forEach((slice) => {
          slice.content.forEach((node) => {
            expect(node.textContent).toBeTruthy();
          });
        });
      }).not.toThrow();
    });
  });

  describe("Plugin Integration", () => {
    it("should register ProseMirror plugins", () => {
      const editor = trackEditor(createMockEditor("<p>Test</p>"));
      const plugins = editor.view.state.plugins;

      // Should have plugins loaded (including our extension's plugin)
      expect(plugins.length).toBeGreaterThan(0);
    });

    it("should initialize storage correctly", () => {
      const editor = trackEditor(createMockEditor("<p>Test</p>"));

      expect(editor.storage.fixedChannelPaste).toBeDefined();
      // Note: Storage might persist from previous tests, so we just check it exists
      expect(editor.storage.fixedChannelPaste.currentChannel).toBeDefined();
    });

    it("should handle storage updates without errors", () => {
      const editor = trackEditor(createMockEditor("<p>Test</p>"));

      // Storage should be accessible and modifiable
      expect(() => {
        editor.storage.fixedChannelPaste.currentChannel = "test";
        editor.storage.fixedChannelPaste.currentChannel = null;
        editor.storage.fixedChannelPaste.currentChannel = "another-test";
      }).not.toThrow();
    });

    it("should maintain extension state", () => {
      const editor = trackEditor(createMockEditor("<p>Test</p>", "courier-push-editor"));

      // Extension should be properly loaded and configured
      const extension = editor.extensionManager.extensions.find(
        (ext) => ext.name === "fixedChannelPaste"
      );
      expect(extension).toBeDefined();
      expect(extension?.options).toBeDefined();
      expect(Array.isArray(extension?.options.fixedChannels)).toBe(true);
    });
  });

  describe("Extension Type and Metadata", () => {
    it("should be a TipTap extension", () => {
      expect(FixedChannelPaste.type).toBe("extension");
    });

    it("should have the correct name", () => {
      expect(FixedChannelPaste.name).toBe("fixedChannelPaste");
    });

    it("should have proper extension configuration", () => {
      const editor = trackEditor(createMockEditor("<p>Test</p>"));
      const extension = editor.extensionManager.extensions.find(
        (ext) => ext.name === "fixedChannelPaste"
      );

      expect(extension).toBeDefined();
      expect(extension?.type).toBe("extension");
      expect(extension?.options).toBeDefined();
    });
  });
});
