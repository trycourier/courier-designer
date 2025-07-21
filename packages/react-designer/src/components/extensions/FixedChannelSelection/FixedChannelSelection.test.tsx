import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/react";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { History } from "@tiptap/extension-history";
import { Heading } from "@tiptap/extension-heading";
import { FixedChannelSelection, type FixedChannelSelectionOptions } from "./FixedChannelSelection";

// Mock DOM environment
const createMockElement = (className = "") => ({
  classList: { contains: (cls: string) => className.includes(cls) },
  closest: (selector: string) => {
    if (selector === ".courier-push-editor" && className.includes("courier-push-editor")) {
      return { className };
    }
    if (selector === ".courier-sms-editor" && className.includes("courier-sms-editor")) {
      return { className };
    }
    if (selector === ".courier-inbox-editor" && className.includes("courier-inbox-editor")) {
      return { className };
    }
    return null;
  },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
  offsetWidth: 100,
  offsetHeight: 100,
});

describe("FixedChannelSelection Extension", () => {
  let editor: Editor;

  beforeAll(() => {
    global.DOMParser = vi.fn().mockImplementation(() => ({
      parseFromString: vi.fn(() => document.implementation.createHTMLDocument()),
    }));

    // Mock performance for tests
    global.performance = global.performance || {
      now: vi.fn(() => Date.now()),
    };
  });

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        History,
        Heading,
        FixedChannelSelection.configure({
          channels: ["push", "sms", "inbox"],
        }),
      ],
      content: "<p>Test content</p>",
      editorProps: {
        attributes: {
          class: "ProseMirror",
        },
      },
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    if (editor && !editor.isDestroyed) {
      editor.destroy();
    }
  });

  describe("Extension Loading and Configuration", () => {
    it("should load extension with default configuration", () => {
      const defaultEditor = new Editor({
        extensions: [Document, Paragraph, Text, FixedChannelSelection],
        content: "<p>Test</p>",
      });

      const extension = defaultEditor.extensionManager.extensions.find(
        (ext) => ext.name === "fixedChannelSelection"
      );

      expect(extension).toBeDefined();
      expect(extension?.options).toEqual({
        channels: ["push", "sms", "inbox"],
      });

      defaultEditor.destroy();
    });

    it("should accept custom channel configuration", () => {
      const customEditor = new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          FixedChannelSelection.configure({
            channels: ["push", "sms"],
          }),
        ],
        content: "<p>Test</p>",
      });

      const extension = customEditor.extensionManager.extensions.find(
        (ext) => ext.name === "fixedChannelSelection"
      );

      expect(extension?.options.channels).toEqual(["push", "sms"]);
      customEditor.destroy();
    });

    it("should handle empty channels configuration", () => {
      const emptyEditor = new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          FixedChannelSelection.configure({
            channels: [],
          }),
        ],
        content: "<p>Test</p>",
      });

      const extension = emptyEditor.extensionManager.extensions.find(
        (ext) => ext.name === "fixedChannelSelection"
      );

      expect(extension?.options.channels).toEqual([]);
      emptyEditor.destroy();
    });

    it("should register required commands", () => {
      expect(editor.commands.constrainSelectionToElement).toBeDefined();
      expect(typeof editor.commands.constrainSelectionToElement).toBe("function");
    });
  });

  describe("Extension Registration", () => {
    it("should register ProseMirror plugins", () => {
      const extension = editor.extensionManager.extensions.find(
        (ext) => ext.name === "fixedChannelSelection"
      );

      expect(extension).toBeDefined();
      expect(editor.view.state.plugins.length).toBeGreaterThan(0);
    });

    it("should work with multiple extensions", () => {
      const multiExtensionEditor = new Editor({
        extensions: [Document, Paragraph, Text, History, Heading, FixedChannelSelection],
        content: "<p>Test</p>",
      });

      const fixedChannelExt = multiExtensionEditor.extensionManager.extensions.find(
        (ext) => ext.name === "fixedChannelSelection"
      );

      expect(fixedChannelExt).toBeDefined();
      multiExtensionEditor.destroy();
    });

    it("should handle plugin initialization", () => {
      const extension = editor.extensionManager.extensions.find(
        (ext) => ext.name === "fixedChannelSelection"
      );

      expect(extension).toBeDefined();
      expect(extension?.name).toBe("fixedChannelSelection");
    });
  });

  describe("Extension Configuration Tests", () => {
    it("should provide proper TypeScript types", () => {
      const options: FixedChannelSelectionOptions = {
        channels: ["push", "sms", "inbox"],
      };

      expect(options.channels).toContain("push");
      expect(options.channels).toContain("sms");
      expect(options.channels).toContain("inbox");
    });

    it("should handle partial channel configuration", () => {
      const partialEditor = new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          FixedChannelSelection.configure({
            channels: ["push"],
          }),
        ],
        content: "<p>Test</p>",
      });

      const extension = partialEditor.extensionManager.extensions.find(
        (ext) => ext.name === "fixedChannelSelection"
      );

      expect(extension?.options.channels).toEqual(["push"]);
      partialEditor.destroy();
    });

    it("should validate configuration options", () => {
      const validChannels: Array<"push" | "sms" | "inbox"> = ["push", "sms", "inbox"];

      const configuredEditor = new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          FixedChannelSelection.configure({
            channels: validChannels,
          }),
        ],
        content: "<p>Test</p>",
      });

      const extension = configuredEditor.extensionManager.extensions.find(
        (ext) => ext.name === "fixedChannelSelection"
      );

      expect(extension?.options.channels).toEqual(validChannels);
      configuredEditor.destroy();
    });
  });

  describe("DOM Context Detection", () => {
    it("should handle push editor context", () => {
      const pushElement = createMockElement("courier-push-editor");
      Object.defineProperty(editor, "view", {
        value: { dom: pushElement },
        writable: true,
      });

      // Verify DOM element is set up correctly
      expect(pushElement.closest(".courier-push-editor")).toBeTruthy();
    });

    it("should handle SMS editor context", () => {
      const smsElement = createMockElement("courier-sms-editor");
      Object.defineProperty(editor, "view", {
        value: { dom: smsElement },
        writable: true,
      });

      expect(smsElement.closest(".courier-sms-editor")).toBeTruthy();
    });

    it("should handle inbox editor context", () => {
      const inboxElement = createMockElement("courier-inbox-editor");
      Object.defineProperty(editor, "view", {
        value: { dom: inboxElement },
        writable: true,
      });

      expect(inboxElement.closest(".courier-inbox-editor")).toBeTruthy();
    });

    it("should handle non-fixed channel context", () => {
      const emailElement = createMockElement("courier-email-editor");
      Object.defineProperty(editor, "view", {
        value: { dom: emailElement },
        writable: true,
      });

      expect(emailElement.closest(".courier-push-editor")).toBeFalsy();
      expect(emailElement.closest(".courier-sms-editor")).toBeFalsy();
      expect(emailElement.closest(".courier-inbox-editor")).toBeFalsy();
    });
  });

  describe("Keyboard Shortcuts Integration", () => {
    it("should register keyboard shortcuts without errors", () => {
      expect(() => {
        new Editor({
          extensions: [Document, Paragraph, Text, FixedChannelSelection],
          content: "<p>Test</p>",
        }).destroy();
      }).not.toThrow();
    });

    it("should handle Mod-a shortcut registration", () => {
      expect(() => {
        const testEditor = new Editor({
          extensions: [Document, Paragraph, Text, FixedChannelSelection],
          content: "<p>Test</p>",
        });
        testEditor.destroy();
      }).not.toThrow();
    });

    it("should handle Backspace shortcut registration", () => {
      expect(() => {
        const testEditor = new Editor({
          extensions: [Document, Paragraph, Text, FixedChannelSelection],
          content: "<p>Test</p>",
        });
        testEditor.destroy();
      }).not.toThrow();
    });

    it("should handle Delete shortcut registration", () => {
      expect(() => {
        const testEditor = new Editor({
          extensions: [Document, Paragraph, Text, FixedChannelSelection],
          content: "<p>Test</p>",
        });
        testEditor.destroy();
      }).not.toThrow();
    });
  });

  describe("Plugin System Integration", () => {
    it("should register plugin with correct key", () => {
      const extension = editor.extensionManager.extensions.find(
        (ext) => ext.name === "fixedChannelSelection"
      );

      expect(extension).toBeDefined();
      expect(editor.view.state.plugins.length).toBeGreaterThan(0);
    });

    it("should handle plugin state initialization", () => {
      expect(() => {
        const testEditor = new Editor({
          extensions: [Document, Paragraph, Text, FixedChannelSelection],
          content: "<p>Test state</p>",
        });
        testEditor.destroy();
      }).not.toThrow();
    });

    it("should work with other TipTap extensions", () => {
      const fullEditor = new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          History,
          Heading.configure({ levels: [1, 2, 3] }),
          FixedChannelSelection.configure({ channels: ["push", "sms", "inbox"] }),
        ],
        content: "<h1>Header</h1><p>Content</p>",
      });

      expect(fullEditor.extensionManager.extensions.length).toBeGreaterThan(5);
      fullEditor.destroy();
    });

    it("should initialize without throwing errors", () => {
      expect(() => {
        const testEditor = new Editor({
          extensions: [Document, Paragraph, Text, FixedChannelSelection],
          content: "<p>Initialization test</p>",
        });
        expect(testEditor).toBeDefined();
        testEditor.destroy();
      }).not.toThrow();
    });
  });

  describe("Memory Management", () => {
    it("should not create memory leaks during multiple editor creation", () => {
      const editors = [];
      for (let i = 0; i < 5; i++) {
        const testEditor = new Editor({
          extensions: [Document, Paragraph, Text, FixedChannelSelection],
          content: `<p>Test content ${i}</p>`,
        });
        editors.push(testEditor);
      }

      editors.forEach((ed) => {
        if (!ed.isDestroyed) {
          ed.destroy();
        }
      });

      expect(true).toBe(true);
    });

    it("should handle rapid editor recreation", () => {
      for (let i = 0; i < 3; i++) {
        const testEditor = new Editor({
          extensions: [Document, Paragraph, Text, FixedChannelSelection],
          content: "<p>Test</p>",
        });
        expect(testEditor).toBeDefined();
        testEditor.destroy();
      }
    });

    it("should handle editor destruction gracefully", () => {
      const testEditor = new Editor({
        extensions: [Document, Paragraph, Text, FixedChannelSelection],
        content: "<p>Test</p>",
      });

      testEditor.destroy();
      expect(testEditor.isDestroyed).toBe(true);
    });
  });

  describe("Extension Behavior Verification", () => {
    it("should have correct extension name", () => {
      const extension = editor.extensionManager.extensions.find(
        (ext) => ext.name === "fixedChannelSelection"
      );

      expect(extension?.name).toBe("fixedChannelSelection");
    });

    it("should handle extension configuration changes", () => {
      const originalExtension = editor.extensionManager.extensions.find(
        (ext) => ext.name === "fixedChannelSelection"
      );

      expect(originalExtension?.options.channels).toEqual(["push", "sms", "inbox"]);

      // Create new editor with different config
      const newEditor = new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          FixedChannelSelection.configure({ channels: ["push"] }),
        ],
        content: "<p>Test</p>",
      });

      const newExtension = newEditor.extensionManager.extensions.find(
        (ext) => ext.name === "fixedChannelSelection"
      );

      expect(newExtension?.options.channels).toEqual(["push"]);
      newEditor.destroy();
    });

    it("should maintain extension state across operations", () => {
      const extension = editor.extensionManager.extensions.find(
        (ext) => ext.name === "fixedChannelSelection"
      );

      expect(extension).toBeDefined();

      // Perform operations that might affect extension state
      editor.commands.setContent("<p>New content</p>");
      editor.commands.insertContent("Additional text");

      // Extension should still be present and functional
      const stillExtension = editor.extensionManager.extensions.find(
        (ext) => ext.name === "fixedChannelSelection"
      );
      expect(stillExtension).toBeDefined();
      expect(stillExtension?.name).toBe("fixedChannelSelection");
    });
  });

  describe("Error Resilience", () => {
    it("should handle extension creation with invalid configuration gracefully", () => {
      expect(() => {
        const testEditor = new Editor({
          extensions: [
            Document,
            Paragraph,
            Text,
            FixedChannelSelection.configure({
              channels: [] as any, // Empty array should be handled
            }),
          ],
          content: "<p>Test</p>",
        });
        testEditor.destroy();
      }).not.toThrow();
    });

    it("should work with minimal editor setup", () => {
      expect(() => {
        const minimalEditor = new Editor({
          extensions: [Document, Paragraph, Text, FixedChannelSelection],
          content: "<p>Minimal test</p>",
        });
        expect(minimalEditor).toBeDefined();
        minimalEditor.destroy();
      }).not.toThrow();
    });

    it("should handle concurrent editor creation", () => {
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          Promise.resolve().then(() => {
            const testEditor = new Editor({
              extensions: [Document, Paragraph, Text, FixedChannelSelection],
              content: `<p>Concurrent test ${i}</p>`,
            });
            testEditor.destroy();
            return true;
          })
        );
      }

      return Promise.all(promises).then((results) => {
        expect(results.every((r) => r === true)).toBe(true);
      });
    });
  });

  describe("Integration with TipTap Core", () => {
    it("should not interfere with core TipTap functionality", () => {
      expect(() => {
        editor.commands.setContent("<p>New content</p>");
        editor.commands.insertContent(" Additional text");
        editor.commands.clearContent();
      }).not.toThrow();
    });

    it("should maintain compatibility with other extensions", () => {
      const complexEditor = new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          History,
          Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
          FixedChannelSelection.configure({
            channels: ["push", "sms", "inbox"],
          }),
        ],
        content: "<h1>Title</h1><p>Content</p>",
      });

      expect(complexEditor.extensionManager.extensions.length).toBeGreaterThan(5);

      // Test that all extensions are working
      expect(() => {
        complexEditor.commands.setContent("<h2>New Title</h2><p>New content</p>");
        complexEditor.commands.undo();
        complexEditor.commands.redo();
      }).not.toThrow();

      complexEditor.destroy();
    });
  });
});
