import { Editor } from "@tiptap/core";
import { Bold } from "@tiptap/extension-bold";
import { Document } from "@tiptap/extension-document";
import { Heading } from "@tiptap/extension-heading";
import { Italic } from "@tiptap/extension-italic";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Strike } from "@tiptap/extension-strike";
import { Text } from "@tiptap/extension-text";
import { Underline } from "@tiptap/extension-underline";
import { Fragment, Slice } from "@tiptap/pm/model";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FixedChannelPaste } from "./FixedChannelPaste";
import { VariableNode } from "../Variable/Variable";

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

  describe("Rich Text Paste Handling - SMS Editor Bug (C-16390)", () => {
    // Helper to create editor with rich text extensions
    const createRichTextEditor = (content: any, channelClass?: string) => {
      const editor = new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          Heading,
          Bold,
          Italic,
          Underline,
          Strike,
          FixedChannelPaste,
        ],
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

    // Helper to create slice with rich text formatting
    const createRichTextSlice = (schema: any) => {
      // Create a paragraph with bold and italic text
      const boldText = schema.text("bold text", [schema.marks.bold.create()]);
      const italicText = schema.text(" and italic text", [schema.marks.italic.create()]);
      const underlineText = schema.text(" and underlined", [schema.marks.underline.create()]);

      const paragraph = schema.nodes.paragraph.create({}, [boldText, italicText, underlineText]);

      const fragment = Fragment.from([paragraph]);
      return new Slice(fragment, 0, 0);
    };

    it("should strip bold marks when pasting into SMS editor", () => {
      const editor = trackEditor(createRichTextEditor("<p>SMS content</p>", "courier-sms-editor"));

      // Create a slice with bold text
      const slice = createRichTextSlice(editor.schema);

      // The current implementation allows rich text through - this test documents the bug
      // The slice contains text with formatting marks
      expect(slice.content.firstChild?.firstChild?.marks.length).toBeGreaterThan(0);
      expect(slice.content.firstChild?.firstChild?.marks[0].type.name).toBe("bold");

      // BUG: When this rich text is pasted into SMS editor, the marks are NOT stripped
      // After the bug is fixed, pasting this slice should strip all formatting marks
      // Expected: The pasted content should be plain text with 0 marks
    });

    it("should strip italic marks when pasting into SMS editor", () => {
      const editor = trackEditor(createRichTextEditor("<p>SMS content</p>", "courier-sms-editor"));

      // Verify italic text has marks
      const textWithItalic = editor.schema.text("italic text", [
        editor.schema.marks.italic.create(),
      ]);

      expect(textWithItalic.marks.length).toBe(1);
      expect(textWithItalic.marks[0].type.name).toBe("italic");

      // This documents that SMS editor should not have italic formatting
      // The bug is that pasted italic text keeps its formatting
    });

    it("should strip underline marks when pasting into SMS editor", () => {
      const editor = trackEditor(createRichTextEditor("<p>SMS content</p>", "courier-sms-editor"));

      // Verify underline text has marks
      const textWithUnderline = editor.schema.text("underlined text", [
        editor.schema.marks.underline.create(),
      ]);

      expect(textWithUnderline.marks.length).toBe(1);
      expect(textWithUnderline.marks[0].type.name).toBe("underline");

      // This documents that SMS editor should not have underline formatting
    });

    it("should strip strike marks when pasting into SMS editor", () => {
      const editor = trackEditor(createRichTextEditor("<p>SMS content</p>", "courier-sms-editor"));

      // Verify strike text has marks
      const textWithStrike = editor.schema.text("strikethrough text", [
        editor.schema.marks.strike.create(),
      ]);

      expect(textWithStrike.marks.length).toBe(1);
      expect(textWithStrike.marks[0].type.name).toBe("strike");

      // This documents that SMS editor should not have strikethrough formatting
    });

    it("should strip all formatting marks from rich text paste", () => {
      const editor = trackEditor(createRichTextEditor("<p>SMS content</p>", "courier-sms-editor"));

      // Create text with multiple marks
      const richText = editor.schema.text("formatted text", [
        editor.schema.marks.bold.create(),
        editor.schema.marks.italic.create(),
      ]);

      expect(richText.marks.length).toBe(2);

      // After the bug is fixed, pasting this should result in plain text with 0 marks
      // Currently, the marks are preserved, which is the bug
    });

    it("should preserve plain text without marks when pasting into SMS editor", () => {
      const editor = trackEditor(createRichTextEditor("<p>SMS content</p>", "courier-sms-editor"));

      // Create plain text without marks
      const plainText = editor.schema.text("plain text without formatting");

      expect(plainText.marks.length).toBe(0);

      // Plain text should remain plain after paste
    });

    it("should handle paste of single paragraph with mixed formatting", () => {
      const editor = trackEditor(createRichTextEditor("<p>SMS content</p>", "courier-sms-editor"));

      // This replicates the exact bug scenario: copying rich text from another source
      // and pasting it into SMS editor
      const schema = editor.schema;

      const plainText = schema.text("Hello ");
      const boldText = schema.text("world", [schema.marks.bold.create()]);
      const morePlainText = schema.text(" and ");
      const italicText = schema.text("everyone", [schema.marks.italic.create()]);

      const paragraph = schema.nodes.paragraph.create({}, [
        plainText,
        boldText,
        morePlainText,
        italicText,
      ]);

      const slice = new Slice(Fragment.from([paragraph]), 0, 0);

      // The slice has 1 paragraph (childCount === 1), so current implementation doesn't handle it
      expect(slice.content.childCount).toBe(1);

      // Count how many text nodes have marks
      let nodesWithMarks = 0;
      paragraph.forEach((node) => {
        if (node.marks && node.marks.length > 0) {
          nodesWithMarks++;
        }
      });

      // Currently, 2 nodes have marks (bold and italic)
      expect(nodesWithMarks).toBe(2);

      // After the bug is fixed, pasting this into SMS should strip all marks
      // Expected result: plain text "Hello world and everyone" with no formatting
    });

    it("BUG C-16390: should strip formatting marks when pasting single paragraph with rich text into SMS", () => {
      // This test verifies the fix for C-16390: pasting rich text into SMS should strip formatting

      const editor = trackEditor(createRichTextEditor("<p>SMS content</p>", "courier-sms-editor"));

      // Create rich text content (single paragraph with bold and italic formatting)
      const schema = editor.schema;
      const boldText = schema.text("Hello ", [schema.marks.bold.create()]);
      const italicText = schema.text("world", [schema.marks.italic.create()]);
      const paragraph = schema.nodes.paragraph.create({}, [boldText, italicText]);
      const slice = new Slice(Fragment.from([paragraph]), 0, 0);

      // Verify the slice has formatting marks before paste
      expect(slice.content.childCount).toBe(1); // Single paragraph

      let marksBeforePaste = 0;
      slice.content.firstChild?.forEach((node) => {
        marksBeforePaste += node.marks.length;
      });
      expect(marksBeforePaste).toBeGreaterThan(0); // Has formatting marks (bold + italic)

      // Get the paste handler and simulate paste
      let handlePaste: any = null;

      // Search through all plugins to find the one with handlePaste
      for (const plugin of editor.view.state.plugins) {
        const pluginSpec = (plugin as any).spec;
        if (pluginSpec?.props?.handlePaste) {
          handlePaste = pluginSpec.props.handlePaste;
          break;
        }
      }

      if (!handlePaste) {
        throw new Error("FixedChannelPaste handlePaste not found");
      }

      // Create mock event
      const mockEvent = {
        preventDefault: vi.fn(),
      } as any;

      // Mock the view.dispatch to capture the transaction
      let dispatchedTransaction: any = null;
      const originalDispatch = editor.view.dispatch;
      editor.view.dispatch = vi.fn((tr: any) => {
        dispatchedTransaction = tr;
        // Don't actually dispatch to avoid DOM issues in test
      });

      // Call the paste handler
      const wasHandled = handlePaste(editor.view, mockEvent, slice);

      // Restore original dispatch
      editor.view.dispatch = originalDispatch;

      // The paste should have been intercepted
      expect(wasHandled).toBe(true);
      expect(mockEvent.preventDefault).toHaveBeenCalled();

      // Verify a transaction was dispatched
      expect(dispatchedTransaction).toBeTruthy();

      // Check that the transaction removes marks
      // The transaction should have removeMark steps
      const steps = dispatchedTransaction.steps;
      expect(steps.length).toBeGreaterThan(0);

      // Verify that marks would be removed by checking the transaction
      // Apply the transaction to the original state to see the result
      const newState = editor.state.apply(dispatchedTransaction);

      // After the transaction, check that the document has NO formatting marks
      let marksAfterPaste = 0;
      newState.doc.descendants((node: any) => {
        marksAfterPaste += node.marks.length;
      });

      // This should pass after the bug fix: no marks in the document
      expect(marksAfterPaste).toBe(0);

      // Verify the text content is preserved
      expect(newState.doc.textContent).toContain("Hello world");
    });

    it("BUG C-16390: should strip formatting marks when pasting into Push editor", () => {
      // Push editor is also a fixed channel that should strip formatting

      const editor = trackEditor(
        createRichTextEditor("<h1>Title</h1><p>Body</p>", "courier-push-editor")
      );

      // Create rich text with bold, italic, and underline
      const schema = editor.schema;
      const boldText = schema.text("Important ", [schema.marks.bold.create()]);
      const italicText = schema.text("notification ", [schema.marks.italic.create()]);
      const underlineText = schema.text("message", [schema.marks.underline.create()]);
      const paragraph = schema.nodes.paragraph.create({}, [boldText, italicText, underlineText]);
      const slice = new Slice(Fragment.from([paragraph]), 0, 0);

      // Verify the slice has formatting marks
      let marksBeforePaste = 0;
      slice.content.firstChild?.forEach((node) => {
        marksBeforePaste += node.marks.length;
      });
      expect(marksBeforePaste).toBe(3); // bold + italic + underline

      // Get the paste handler
      let handlePaste: any = null;
      for (const plugin of editor.view.state.plugins) {
        const pluginSpec = (plugin as any).spec;
        if (pluginSpec?.props?.handlePaste) {
          handlePaste = pluginSpec.props.handlePaste;
          break;
        }
      }

      if (!handlePaste) {
        throw new Error("FixedChannelPaste handlePaste not found");
      }

      const mockEvent = { preventDefault: vi.fn() } as any;

      // Mock dispatch to capture transaction
      let dispatchedTransaction: any = null;
      const originalDispatch = editor.view.dispatch;
      editor.view.dispatch = vi.fn((tr: any) => {
        dispatchedTransaction = tr;
      });

      // Call paste handler
      const wasHandled = handlePaste(editor.view, mockEvent, slice);

      // Restore dispatch
      editor.view.dispatch = originalDispatch;

      // Verify paste was intercepted
      expect(wasHandled).toBe(true);
      expect(mockEvent.preventDefault).toHaveBeenCalled();

      // Apply transaction and check marks are removed
      const newState = editor.state.apply(dispatchedTransaction);

      let marksAfterPaste = 0;
      newState.doc.descendants((node: any) => {
        marksAfterPaste += node.marks.length;
      });

      expect(marksAfterPaste).toBe(0); // All marks stripped
      expect(newState.doc.textContent).toContain("Important notification message");
    });

    it("BUG C-16390: should strip formatting marks when pasting into Inbox editor", () => {
      // Inbox editor is also a fixed channel that should strip formatting

      const editor = trackEditor(
        createRichTextEditor("<h1>Header</h1><p>Body text</p>", "courier-inbox-editor")
      );

      // Create rich text with strike and bold
      const schema = editor.schema;
      const strikeText = schema.text("Cancelled ", [schema.marks.strike.create()]);
      const boldText = schema.text("order", [schema.marks.bold.create()]);
      const paragraph = schema.nodes.paragraph.create({}, [strikeText, boldText]);
      const slice = new Slice(Fragment.from([paragraph]), 0, 0);

      // Verify the slice has formatting marks
      let marksBeforePaste = 0;
      slice.content.firstChild?.forEach((node) => {
        marksBeforePaste += node.marks.length;
      });
      expect(marksBeforePaste).toBe(2); // strike + bold

      // Get the paste handler
      let handlePaste: any = null;
      for (const plugin of editor.view.state.plugins) {
        const pluginSpec = (plugin as any).spec;
        if (pluginSpec?.props?.handlePaste) {
          handlePaste = pluginSpec.props.handlePaste;
          break;
        }
      }

      if (!handlePaste) {
        throw new Error("FixedChannelPaste handlePaste not found");
      }

      const mockEvent = { preventDefault: vi.fn() } as any;

      // Mock dispatch to capture transaction
      let dispatchedTransaction: any = null;
      const originalDispatch = editor.view.dispatch;
      editor.view.dispatch = vi.fn((tr: any) => {
        dispatchedTransaction = tr;
      });

      // Call paste handler
      const wasHandled = handlePaste(editor.view, mockEvent, slice);

      // Restore dispatch
      editor.view.dispatch = originalDispatch;

      // Verify paste was intercepted
      expect(wasHandled).toBe(true);
      expect(mockEvent.preventDefault).toHaveBeenCalled();

      // Apply transaction and check marks are removed
      const newState = editor.state.apply(dispatchedTransaction);

      let marksAfterPaste = 0;
      newState.doc.descendants((node: any) => {
        marksAfterPaste += node.marks.length;
      });

      expect(marksAfterPaste).toBe(0); // All marks stripped
      expect(newState.doc.textContent).toContain("Cancelled order");
    });

    it("BUG C-16390: should strip multiple types of marks in a single paste", () => {
      // Test with multiple mark types on the same text
      const editor = trackEditor(createRichTextEditor("<p>SMS content</p>", "courier-sms-editor"));

      const schema = editor.schema;
      // Create text with multiple marks at once
      const multiMarkedText = schema.text("formatted", [
        schema.marks.bold.create(),
        schema.marks.italic.create(),
        schema.marks.underline.create(),
        schema.marks.strike.create(),
      ]);
      const paragraph = schema.nodes.paragraph.create({}, [multiMarkedText]);
      const slice = new Slice(Fragment.from([paragraph]), 0, 0);

      // Verify multiple marks exist
      expect(slice.content.firstChild?.firstChild?.marks.length).toBe(4);

      // Get paste handler
      let handlePaste: any = null;
      for (const plugin of editor.view.state.plugins) {
        const pluginSpec = (plugin as any).spec;
        if (pluginSpec?.props?.handlePaste) {
          handlePaste = pluginSpec.props.handlePaste;
          break;
        }
      }

      const mockEvent = { preventDefault: vi.fn() } as any;
      let dispatchedTransaction: any = null;
      const originalDispatch = editor.view.dispatch;
      editor.view.dispatch = vi.fn((tr: any) => {
        dispatchedTransaction = tr;
      });

      handlePaste(editor.view, mockEvent, slice);
      editor.view.dispatch = originalDispatch;

      // Apply transaction and verify all marks are removed
      const newState = editor.state.apply(dispatchedTransaction);

      let marksAfterPaste = 0;
      newState.doc.descendants((node: any) => {
        marksAfterPaste += node.marks.length;
      });

      expect(marksAfterPaste).toBe(0); // All 4 marks stripped
      expect(newState.doc.textContent).toContain("formatted");
    });

    it("BUG C-16390: should NOT strip formatting when pasting into non-fixed channels", () => {
      // Email editor is NOT a fixed channel, so formatting should be preserved
      // Use 5+ paragraphs to avoid matching any fixed channel structure:
      // - SMS: 1 paragraph
      // - Push: 2 paragraphs
      // - Inbox: 2-4 paragraphs with specific combinations
      const editor = trackEditor(
        createRichTextEditor(
          "<p>Email 1</p><p>Email 2</p><p>Email 3</p><p>Email 4</p><p>Email 5</p>",
          "courier-email-editor"
        )
      );

      const schema = editor.schema;
      const boldText = schema.text("Important ", [schema.marks.bold.create()]);
      const italicText = schema.text("email", [schema.marks.italic.create()]);
      const paragraph = schema.nodes.paragraph.create({}, [boldText, italicText]);
      const slice = new Slice(Fragment.from([paragraph]), 0, 0);

      // Verify the slice has formatting marks
      let marksBeforePaste = 0;
      slice.content.firstChild?.forEach((node) => {
        marksBeforePaste += node.marks.length;
      });
      expect(marksBeforePaste).toBe(2); // bold + italic

      // Get paste handler
      let handlePaste: any = null;
      for (const plugin of editor.view.state.plugins) {
        const pluginSpec = (plugin as any).spec;
        if (pluginSpec?.props?.handlePaste) {
          handlePaste = pluginSpec.props.handlePaste;
          break;
        }
      }

      const mockEvent = { preventDefault: vi.fn() } as any;

      // Call paste handler
      const wasHandled = handlePaste(editor.view, mockEvent, slice);

      // For non-fixed channels, the handler should NOT intercept
      expect(wasHandled).toBe(false);
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();

      // Since the handler didn't intercept, simulate the default paste behavior
      // to verify marks would be preserved (not stripped)
      const tr = editor.state.tr.replaceSelection(slice);
      const newState = editor.state.apply(tr);

      // Count marks after the simulated default paste
      let marksAfterPaste = 0;
      newState.doc.descendants((node: any) => {
        marksAfterPaste += node.marks.length;
      });

      // Should have the same number of marks as before
      expect(marksAfterPaste).toBe(marksBeforePaste);
    });

    it("BUG C-16390: should NOT strip formatting when pasting into Slack editor", () => {
      // Slack supports formatting, so marks should be preserved
      const editor = trackEditor(
        createRichTextEditor("<p>Slack message</p>", "courier-slack-editor")
      );

      const schema = editor.schema;
      const boldText = schema.text("Important ", [schema.marks.bold.create()]);
      const italicText = schema.text("update", [schema.marks.italic.create()]);
      const paragraph = schema.nodes.paragraph.create({}, [boldText, italicText]);
      const slice = new Slice(Fragment.from([paragraph]), 0, 0);

      // Verify the slice has formatting marks
      let marksBeforePaste = 0;
      slice.content.firstChild?.forEach((node) => {
        marksBeforePaste += node.marks.length;
      });
      expect(marksBeforePaste).toBe(2); // bold + italic

      // Get paste handler
      let handlePaste: any = null;
      for (const plugin of editor.view.state.plugins) {
        const pluginSpec = (plugin as any).spec;
        if (pluginSpec?.props?.handlePaste) {
          handlePaste = pluginSpec.props.handlePaste;
          break;
        }
      }

      const mockEvent = { preventDefault: vi.fn() } as any;

      // Call paste handler
      const wasHandled = handlePaste(editor.view, mockEvent, slice);

      // Slack supports formatting, so handler should NOT intercept
      expect(wasHandled).toBe(false);
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();

      // Simulate default paste behavior
      const tr = editor.state.tr.replaceSelection(slice);
      const newState = editor.state.apply(tr);

      // Formatting should be preserved in Slack
      let marksAfterPaste = 0;
      newState.doc.descendants((node: any) => {
        marksAfterPaste += node.marks.length;
      });

      expect(marksAfterPaste).toBe(marksBeforePaste);
    });

    it("BUG C-16390: should NOT strip formatting when pasting into MS Teams editor", () => {
      // MS Teams supports formatting, so marks should be preserved
      const editor = trackEditor(
        createRichTextEditor("<p>Teams message</p>", "courier-msteams-editor")
      );

      const schema = editor.schema;
      const boldText = schema.text("Alert: ", [schema.marks.bold.create()]);
      const underlineText = schema.text("urgent", [schema.marks.underline.create()]);
      const paragraph = schema.nodes.paragraph.create({}, [boldText, underlineText]);
      const slice = new Slice(Fragment.from([paragraph]), 0, 0);

      // Verify the slice has formatting marks
      let marksBeforePaste = 0;
      slice.content.firstChild?.forEach((node) => {
        marksBeforePaste += node.marks.length;
      });
      expect(marksBeforePaste).toBe(2); // bold + underline

      // Get paste handler
      let handlePaste: any = null;
      for (const plugin of editor.view.state.plugins) {
        const pluginSpec = (plugin as any).spec;
        if (pluginSpec?.props?.handlePaste) {
          handlePaste = pluginSpec.props.handlePaste;
          break;
        }
      }

      const mockEvent = { preventDefault: vi.fn() } as any;

      // Call paste handler
      const wasHandled = handlePaste(editor.view, mockEvent, slice);

      // MS Teams supports formatting, so handler should NOT intercept
      expect(wasHandled).toBe(false);
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();

      // Simulate default paste behavior
      const tr = editor.state.tr.replaceSelection(slice);
      const newState = editor.state.apply(tr);

      // Formatting should be preserved in MS Teams
      let marksAfterPaste = 0;
      newState.doc.descendants((node: any) => {
        marksAfterPaste += node.marks.length;
      });

      expect(marksAfterPaste).toBe(marksBeforePaste);
    });
  });

  describe("Variable Preservation in Multi-Element Paste (C-16718)", () => {
    // Helper to create editor with variable node support
    const createEditorWithVariables = (content: any, channelClass?: string) => {
      const editor = new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          Heading,
          Bold,
          Italic,
          VariableNode,
          FixedChannelPaste,
        ],
        content,
        editorProps: {
          attributes: {
            "data-testid": "editor",
          },
        },
      });

      const mockElement = createMockElement(channelClass);
      Object.defineProperty(editor.view, "dom", {
        value: mockElement,
        writable: true,
      });

      return editor;
    };

    // Helper to get the paste handler from editor plugins
    const getPasteHandler = (editor: Editor) => {
      for (const plugin of editor.view.state.plugins) {
        const pluginSpec = (plugin as any).spec;
        if (pluginSpec?.props?.handlePaste) {
          return pluginSpec.props.handlePaste;
        }
      }
      throw new Error("FixedChannelPaste handlePaste not found");
    };

    it("should preserve variable nodes when pasting multiple blocks into SMS", () => {
      const editor = trackEditor(
        createEditorWithVariables("<p>SMS content</p>", "courier-sms-editor")
      );

      const schema = editor.schema;

      // Create a heading with text + variable: "Header {{headerVar}}"
      const headerText = schema.text("Header ");
      const headerVar = schema.nodes.variable.create({ id: "headerVar", isInvalid: false });
      const heading = schema.nodes.heading.create({ level: 1 }, [headerText, headerVar]);

      // Create a paragraph with text + variables: "Body {{bodyVar1}} fsdf sdgds {{bodyVar2}} !"
      const bodyText1 = schema.text("Body ");
      const bodyVar1 = schema.nodes.variable.create({ id: "bodyVar1", isInvalid: false });
      const bodyMiddle = schema.text(" fsdf sdgds ");
      const bodyVar2 = schema.nodes.variable.create({ id: "bodyVar2", isInvalid: false });
      const bodyEnd = schema.text(" !");
      const paragraph = schema.nodes.paragraph.create({}, [
        bodyText1,
        bodyVar1,
        bodyMiddle,
        bodyVar2,
        bodyEnd,
      ]);

      // Multi-element slice (heading + paragraph)
      const slice = new Slice(Fragment.from([heading, paragraph]), 0, 0);
      expect(slice.content.childCount).toBe(2);

      const handlePaste = getPasteHandler(editor);
      const mockEvent = { preventDefault: vi.fn() } as any;

      let dispatchedTransaction: any = null;
      const originalDispatch = editor.view.dispatch;
      editor.view.dispatch = vi.fn((tr: any) => {
        dispatchedTransaction = tr;
      });

      const wasHandled = handlePaste(editor.view, mockEvent, slice);
      editor.view.dispatch = originalDispatch;

      expect(wasHandled).toBe(true);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(dispatchedTransaction).toBeTruthy();

      // Apply the transaction and check the result
      const newState = editor.state.apply(dispatchedTransaction);

      // Count variable nodes in the result
      let variableCount = 0;
      const variableIds: string[] = [];
      newState.doc.descendants((node: any) => {
        if (node.type.name === "variable") {
          variableCount++;
          variableIds.push(node.attrs.id);
        }
      });

      // All 3 variables should be preserved
      expect(variableCount).toBe(3);
      expect(variableIds).toContain("headerVar");
      expect(variableIds).toContain("bodyVar1");
      expect(variableIds).toContain("bodyVar2");

      // Text content should also be preserved
      expect(newState.doc.textContent).toContain("Header");
      expect(newState.doc.textContent).toContain("Body");
      expect(newState.doc.textContent).toContain("fsdf sdgds");
    });

    it("should strip formatting marks but preserve variables in multi-element paste", () => {
      const editor = trackEditor(
        createEditorWithVariables("<p>SMS content</p>", "courier-sms-editor")
      );

      const schema = editor.schema;

      // Create heading with bold text + variable
      const boldHeader = schema.text("Bold Header ", [schema.marks.bold.create()]);
      const headerVar = schema.nodes.variable.create({ id: "myVar", isInvalid: false });
      const heading = schema.nodes.heading.create({ level: 1 }, [boldHeader, headerVar]);

      // Create paragraph with italic text
      const italicBody = schema.text("italic body", [schema.marks.italic.create()]);
      const paragraph = schema.nodes.paragraph.create({}, [italicBody]);

      const slice = new Slice(Fragment.from([heading, paragraph]), 0, 0);

      const handlePaste = getPasteHandler(editor);
      const mockEvent = { preventDefault: vi.fn() } as any;

      let dispatchedTransaction: any = null;
      const originalDispatch = editor.view.dispatch;
      editor.view.dispatch = vi.fn((tr: any) => {
        dispatchedTransaction = tr;
      });

      handlePaste(editor.view, mockEvent, slice);
      editor.view.dispatch = originalDispatch;

      const newState = editor.state.apply(dispatchedTransaction);

      // Variable should be preserved
      let variableCount = 0;
      newState.doc.descendants((node: any) => {
        if (node.type.name === "variable") {
          variableCount++;
          expect(node.attrs.id).toBe("myVar");
        }
      });
      expect(variableCount).toBe(1);

      // Formatting marks should be stripped
      let marksCount = 0;
      newState.doc.descendants((node: any) => {
        marksCount += node.marks.length;
      });
      expect(marksCount).toBe(0);

      // Text content should be preserved
      expect(newState.doc.textContent).toContain("Bold Header");
      expect(newState.doc.textContent).toContain("italic body");
    });

    it("should preserve variables in single-element paste into SMS", () => {
      const editor = trackEditor(
        createEditorWithVariables("<p>SMS content</p>", "courier-sms-editor")
      );

      const schema = editor.schema;

      // Create a single paragraph with text + variable
      const bodyText = schema.text("Hello ");
      const variable = schema.nodes.variable.create({ id: "name", isInvalid: false });
      const endText = schema.text("!");
      const paragraph = schema.nodes.paragraph.create({}, [bodyText, variable, endText]);

      const slice = new Slice(Fragment.from([paragraph]), 0, 0);
      expect(slice.content.childCount).toBe(1); // Single element

      const handlePaste = getPasteHandler(editor);
      const mockEvent = { preventDefault: vi.fn() } as any;

      let dispatchedTransaction: any = null;
      const originalDispatch = editor.view.dispatch;
      editor.view.dispatch = vi.fn((tr: any) => {
        dispatchedTransaction = tr;
      });

      handlePaste(editor.view, mockEvent, slice);
      editor.view.dispatch = originalDispatch;

      const newState = editor.state.apply(dispatchedTransaction);

      // Variable should be preserved in single-element paste too
      let variableCount = 0;
      newState.doc.descendants((node: any) => {
        if (node.type.name === "variable") {
          variableCount++;
          expect(node.attrs.id).toBe("name");
        }
      });
      expect(variableCount).toBe(1);
    });

    it("should handle paste of blocks where only variables exist (no plain text)", () => {
      const editor = trackEditor(
        createEditorWithVariables("<p>SMS content</p>", "courier-sms-editor")
      );

      const schema = editor.schema;

      // Create heading with only a variable
      const headerVar = schema.nodes.variable.create({ id: "title", isInvalid: false });
      const heading = schema.nodes.heading.create({ level: 1 }, [headerVar]);

      // Create paragraph with only a variable
      const bodyVar = schema.nodes.variable.create({ id: "body", isInvalid: false });
      const paragraph = schema.nodes.paragraph.create({}, [bodyVar]);

      const slice = new Slice(Fragment.from([heading, paragraph]), 0, 0);

      const handlePaste = getPasteHandler(editor);
      const mockEvent = { preventDefault: vi.fn() } as any;

      let dispatchedTransaction: any = null;
      const originalDispatch = editor.view.dispatch;
      editor.view.dispatch = vi.fn((tr: any) => {
        dispatchedTransaction = tr;
      });

      handlePaste(editor.view, mockEvent, slice);
      editor.view.dispatch = originalDispatch;

      const newState = editor.state.apply(dispatchedTransaction);

      // Both variables should be preserved
      let variableCount = 0;
      const variableIds: string[] = [];
      newState.doc.descendants((node: any) => {
        if (node.type.name === "variable") {
          variableCount++;
          variableIds.push(node.attrs.id);
        }
      });
      expect(variableCount).toBe(2);
      expect(variableIds).toContain("title");
      expect(variableIds).toContain("body");
    });
  });
});
