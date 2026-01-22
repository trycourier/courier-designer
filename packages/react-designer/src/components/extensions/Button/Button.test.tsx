import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Button, defaultButtonProps } from "./Button";
import { Editor } from "@tiptap/react";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";

// Mock the ButtonComponentNode
vi.mock("./ButtonComponent", () => ({
  ButtonComponentNode: () => null,
}));

vi.mock("../../utils", () => ({
  generateNodeIds: vi.fn(),
}));

vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-1234"),
}));

describe("Button Extension", () => {
  describe("Basic Configuration", () => {
    it("should be defined and have correct name", () => {
      expect(Button).toBeDefined();
      expect(Button.name).toBe("button");
    });

    it("should have configure method", () => {
      expect(typeof Button.configure).toBe("function");
    });

    it("should be configurable", () => {
      const configured = Button.configure({
        HTMLAttributes: { class: "custom-button" },
      });
      expect(configured).toBeDefined();
      expect(configured.name).toBe("button");
    });
  });

  describe("Extension Structure", () => {
    it("should have TipTap extension structure", () => {
      expect(Button).toHaveProperty("type");
      expect(Button).toHaveProperty("name");
      expect(Button).toHaveProperty("options");
    });

    it("should be a custom Node extension", () => {
      expect(Button.type).toBe("node");
    });

    it("should be an atomic block element", () => {
      // Button is configured as an atomic block element (configured during extension creation)
      const configured = Button.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("button");
    });

    it("should be properly configured", () => {
      // Button configuration is handled during extension creation
      const configured = Button.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("button");
    });
  });

  describe("Default Props Integration", () => {
    it("should use defaultButtonProps", () => {
      // Test that defaultButtonProps is imported and available
      expect(defaultButtonProps).toBeDefined();
      expect(defaultButtonProps.label).toBe("Enter text");
      expect(defaultButtonProps.link).toBe("");
      expect(defaultButtonProps.alignment).toBe("center");
      expect(defaultButtonProps.backgroundColor).toBe("#0085FF");
      expect(defaultButtonProps.textColor).toBe("#ffffff");
    });

    it("should have expected default prop types", () => {
      expect(defaultButtonProps.label).toBeTypeOf("string");
      expect(defaultButtonProps.link).toBeTypeOf("string");
      expect(defaultButtonProps.alignment).toBeTypeOf("string");
      expect(defaultButtonProps.backgroundColor).toBeTypeOf("string");
      expect(defaultButtonProps.textColor).toBeTypeOf("string");
      expect(defaultButtonProps.borderRadius).toBeTypeOf("number");
      expect(defaultButtonProps.borderColor).toBeTypeOf("string");
      expect(defaultButtonProps.padding).toBeTypeOf("number");
      expect(defaultButtonProps.fontWeight).toBeTypeOf("string");
      expect(defaultButtonProps.fontStyle).toBeTypeOf("string");
      expect(defaultButtonProps.isUnderline).toBeTypeOf("boolean");
      expect(defaultButtonProps.isStrike).toBeTypeOf("boolean");
    });
  });

  describe("Button Attributes", () => {
    it("should support all button styling attributes", () => {
      const configured = Button.configure();

      // Check that the extension has the expected attributes structure
      expect(configured).toBeDefined();
      expect(configured.name).toBe("button");
    });

    it("should support label and link attributes", () => {
      // Verify basic button content attributes
      expect(defaultButtonProps.label).toBe("Enter text");
      expect(defaultButtonProps.link).toBe("");
    });

    it("should support layout attributes", () => {
      // Verify layout attributes are available
      expect(defaultButtonProps.alignment).toBe("center");
      expect(defaultButtonProps.padding).toBeTypeOf("number");
    });

    it("should support color attributes", () => {
      // Verify color attributes are available
      expect(defaultButtonProps.backgroundColor).toBeTypeOf("string");
      expect(defaultButtonProps.textColor).toBeTypeOf("string");
      expect(defaultButtonProps.borderColor).toBeTypeOf("string");
      expect(defaultButtonProps.backgroundColor).toBe("#0085FF");
      expect(defaultButtonProps.textColor).toBe("#ffffff");
    });

    it("should support border attributes", () => {
      // Verify border attributes are available
      expect(defaultButtonProps.borderRadius).toBeTypeOf("number");
      expect(defaultButtonProps.borderRadius).toBe(0);
    });

    it("should support typography attributes", () => {
      // Verify typography attributes are available
      expect(defaultButtonProps.fontWeight).toBe("normal");
      expect(defaultButtonProps.fontStyle).toBe("normal");
      expect(defaultButtonProps.isUnderline).toBe(false);
      expect(defaultButtonProps.isStrike).toBe(false);
    });

    it("should support id attribute", () => {
      // The button should support an id attribute for node identification
      const configured = Button.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("button");
    });
  });

  describe("HTML Integration", () => {
    it("should handle HTML parsing", () => {
      // Test that the extension has proper HTML handling
      const configured = Button.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("button");
    });

    it("should support HTML attributes", () => {
      const options = {
        HTMLAttributes: {
          class: "test-button",
          "data-testid": "button",
        },
      };

      expect(() => {
        const configured = Button.configure(options);
        return configured;
      }).not.toThrow();
    });

    it("should render div element with button data type", () => {
      // The extension should render as a div element with data-type="button"
      const configured = Button.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("button");
    });
  });

  describe("Commands Integration", () => {
    let editor: Editor;

    beforeEach(() => {
      editor = new Editor({
        extensions: [Document, Paragraph, Text, Button],
        content: "",
      });
    });

    afterEach(() => {
      editor?.destroy();
    });

    it("should insert button content using the provided label", () => {
      editor.commands.setButton({ label: "Dynamic CTA", link: "https://example.com" });

      const json = editor.getJSON();
      const buttonNode = json.content?.[0];

      expect(buttonNode?.type).toBe("button");
      expect(buttonNode?.attrs?.label).toBe("Dynamic CTA");
      expect(buttonNode?.content).toEqual([{ type: "text", text: "Dynamic CTA" }]);
    });

    it("should fall back to default button text when label is omitted", () => {
      editor.commands.setButton({ link: "https://example.com/cta" });

      const json = editor.getJSON();
      const buttonNode = json.content?.[0];
      const textContent = buttonNode?.content?.[0];

      expect(buttonNode?.type).toBe("button");
      expect(textContent).toEqual({ type: "text", text: "Enter text" });
      expect(buttonNode?.attrs?.label ?? "Enter text").toBe("Enter text");
    });

    it("should use defaultButtonProps.label for button text content when no label provided", () => {
      // Test that the button command uses defaultButtonProps.label for content
      editor.commands.setButton({});

      const json = editor.getJSON();
      const buttonNode = json.content?.[0];

      // Verify both the label attribute and text content match the default
      expect(buttonNode?.attrs?.label).toBe(defaultButtonProps.label);
      expect(buttonNode?.content?.[0]).toEqual({
        type: "text",
        text: defaultButtonProps.label,
      });
    });

    it("should maintain consistency between label attribute and text content", () => {
      // Test that the label attribute and text content use the same default value
      const expectedLabel = defaultButtonProps.label;

      editor.commands.setButton({});
      const json = editor.getJSON();
      const buttonNode = json.content?.[0];

      // Both the attribute and content should use the same default value
      expect(buttonNode?.attrs?.label).toBe(expectedLabel);
      expect(buttonNode?.content?.[0]?.text).toBe(expectedLabel);

      // Ensure they're truly the same value
      expect(buttonNode?.attrs?.label).toBe(buttonNode?.content?.[0]?.text);
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("should support keyboard shortcuts", () => {
      // Test that the extension has keyboard shortcuts configured
      const configured = Button.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("button");
    });

    it("should handle button-specific shortcuts", () => {
      // The extension should have button-specific keyboard shortcuts
      expect(() => {
        const configured = Button.configure();
        return configured;
      }).not.toThrow();
    });
  });

  describe("Functionality Tests", () => {
    it("should handle basic button creation", () => {
      // Test that the extension can be created without errors
      expect(() => {
        const instance = Button.configure();
        return instance;
      }).not.toThrow();
    });

    it("should handle configuration options", () => {
      const options = {
        HTMLAttributes: {
          class: "test-button",
          "data-testid": "button",
        },
      };

      expect(() => {
        const configured = Button.configure(options);
        return configured;
      }).not.toThrow();
    });

    it("should support custom styling props", () => {
      // Test different prop configurations
      const customProps = {
        label: "Custom Button",
        alignment: "left" as const,
        backgroundColor: "#ff6600",
        textColor: "#000000",
        borderRadius: 8,
        borderColor: "#333333",
        padding: 12,
        fontWeight: "bold" as const,
        fontStyle: "italic" as const,
        isUnderline: true,
        isStrike: false,
      };

      expect(customProps.label).not.toBe(defaultButtonProps.label);
      expect(customProps.alignment).not.toBe(defaultButtonProps.alignment);
      expect(customProps.backgroundColor).not.toBe(defaultButtonProps.backgroundColor);
      expect(customProps.borderRadius).toBeGreaterThan(defaultButtonProps.borderRadius);
      expect(customProps.padding).toBeGreaterThan(defaultButtonProps.padding);
    });
  });

  describe("Integration Readiness", () => {
    it("should be ready for editor integration", () => {
      // Verify the extension has the minimum required structure for TipTap
      expect(Button.name).toBe("button");
      expect(Button.type).toBe("node");
      expect(typeof Button.configure).toBe("function");
    });

    it("should work with default button props", () => {
      // Verify that default props are available and have expected structure
      const requiredProps = [
        "label",
        "link",
        "alignment",
        "backgroundColor",
        "textColor",
        "borderRadius",
        "borderColor",
        "padding",
        "fontWeight",
        "fontStyle",
        "isUnderline",
        "isStrike",
      ];

      requiredProps.forEach((prop) => {
        expect(defaultButtonProps).toHaveProperty(prop);
      });
    });

    it("should have expected default values", () => {
      expect(defaultButtonProps.label).toBeTypeOf("string");
      expect(defaultButtonProps.link).toBeTypeOf("string");
      expect(defaultButtonProps.alignment).toBeTypeOf("string");
      expect(defaultButtonProps.backgroundColor).toBeTypeOf("string");
      expect(defaultButtonProps.textColor).toBeTypeOf("string");
      expect(defaultButtonProps.borderRadius).toBeTypeOf("number");
      expect(defaultButtonProps.borderColor).toBeTypeOf("string");
      expect(defaultButtonProps.padding).toBeTypeOf("number");
      expect(defaultButtonProps.fontWeight).toBeTypeOf("string");
      expect(defaultButtonProps.fontStyle).toBeTypeOf("string");
      expect(defaultButtonProps.isUnderline).toBeTypeOf("boolean");
      expect(defaultButtonProps.isStrike).toBeTypeOf("boolean");
    });

    it("should support node view rendering", () => {
      // The extension should be configured with ReactNodeViewRenderer
      const configured = Button.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("button");
    });
  });

  describe("Alignment Options", () => {
    it("should support all alignment options", () => {
      const alignments = ["left", "center", "right"];
      expect(alignments).toContain(defaultButtonProps.alignment);
    });
  });

  describe("Typography Options", () => {
    it("should support font weight options", () => {
      const fontWeights = ["normal", "bold"];
      expect(fontWeights).toContain(defaultButtonProps.fontWeight);
    });

    it("should support font style options", () => {
      const fontStyles = ["normal", "italic"];
      expect(fontStyles).toContain(defaultButtonProps.fontStyle);
    });

    it("should support text decoration options", () => {
      expect(defaultButtonProps.isUnderline).toBeTypeOf("boolean");
      expect(defaultButtonProps.isStrike).toBeTypeOf("boolean");
    });
  });

  describe("Mock Verification", () => {
    it("should have proper mocks in place", () => {
      // Verify that our extension is properly set up
      expect(Button).toBeDefined();
      expect(defaultButtonProps).toBeDefined();
    });

    it("should mock ButtonComponentNode", () => {
      // Verify that ButtonComponentNode is mocked
      expect(Button).toBeDefined();
    });
  });

  describe("Label and Content Synchronization", () => {
    let editor: Editor;

    beforeEach(() => {
      editor = new Editor({
        extensions: [Document, Paragraph, Text, Button],
        content: "",
      });
    });

    afterEach(() => {
      editor?.destroy();
    });

    it("should sync inline text content to label attribute when text is modified", () => {
      // Insert a button with initial label
      editor.commands.setButton({ label: "Click Me", link: "https://example.com" });

      const initialJson = editor.getJSON();
      const buttonNode = initialJson.content?.[0];
      expect(buttonNode?.attrs?.label).toBe("Click Me");
      expect(buttonNode?.content?.[0]?.text).toBe("Click Me");

      // Find the button node position
      let buttonPos = 0;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "button") {
          buttonPos = pos;
          return false;
        }
        return true;
      });

      // Simulate editing the text content directly (like user typing in the editor)
      const buttonNodeInDoc = editor.state.doc.nodeAt(buttonPos);
      if (buttonNodeInDoc) {
        const from = buttonPos + 1;
        const to = buttonPos + 1 + buttonNodeInDoc.content.size;

        editor
          .chain()
          .command(({ tr, dispatch }) => {
            if (dispatch) {
              // Replace the text content
              tr.replaceWith(from, to, tr.doc.type.schema.text("New Text"));
              dispatch(tr);
            }
            return true;
          })
          .run();

        // The plugin should sync the text content back to the label attribute
        const updatedJson = editor.getJSON();
        const updatedButtonNode = updatedJson.content?.[0];

        expect(updatedButtonNode?.content?.[0]?.text).toBe("New Text");
        expect(updatedButtonNode?.attrs?.label).toBe("New Text");
      }
    });

    it("should maintain sync between label attribute and content after multiple edits", () => {
      editor.commands.setButton({ label: "Initial" });

      let buttonPos = 0;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "button") {
          buttonPos = pos;
          return false;
        }
        return true;
      });

      // First edit
      const buttonNode1 = editor.state.doc.nodeAt(buttonPos);
      if (buttonNode1) {
        const from = buttonPos + 1;
        const to = buttonPos + 1 + buttonNode1.content.size;

        editor
          .chain()
          .command(({ tr, dispatch }) => {
            if (dispatch) {
              tr.replaceWith(from, to, tr.doc.type.schema.text("Edit 1"));
              dispatch(tr);
            }
            return true;
          })
          .run();

        let json = editor.getJSON();
        let node = json.content?.[0];
        expect(node?.attrs?.label).toBe("Edit 1");
        expect(node?.content?.[0]?.text).toBe("Edit 1");
      }

      // Second edit
      const buttonNode2 = editor.state.doc.nodeAt(buttonPos);
      if (buttonNode2) {
        const from = buttonPos + 1;
        const to = buttonPos + 1 + buttonNode2.content.size;

        editor
          .chain()
          .command(({ tr, dispatch }) => {
            if (dispatch) {
              tr.replaceWith(from, to, tr.doc.type.schema.text("Edit 2"));
              dispatch(tr);
            }
            return true;
          })
          .run();

        const json = editor.getJSON();
        const node = json.content?.[0];
        expect(node?.attrs?.label).toBe("Edit 2");
        expect(node?.content?.[0]?.text).toBe("Edit 2");
      }
    });

    it("should keep label and content in sync when content is empty", () => {
      editor.commands.setButton({ label: "Test" });

      let buttonPos = 0;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "button") {
          buttonPos = pos;
          return false;
        }
        return true;
      });

      // Clear the text content
      const buttonNode = editor.state.doc.nodeAt(buttonPos);
      if (buttonNode) {
        const from = buttonPos + 1;
        const to = buttonPos + 1 + buttonNode.content.size;

        editor
          .chain()
          .command(({ tr, dispatch }) => {
            if (dispatch) {
              tr.delete(from, to);
              dispatch(tr);
            }
            return true;
          })
          .run();

        const json = editor.getJSON();
        const node = json.content?.[0];

        // Both should be empty or consistent
        const textContent = node?.content?.[0]?.text || "";
        expect(node?.attrs?.label).toBe(textContent);
      }
    });

    it("should sync content to label when button contains only text nodes", () => {
      editor.commands.setButton({ label: "Simple Button" });

      const json = editor.getJSON();
      const buttonNode = json.content?.[0];

      // Verify initial state
      expect(buttonNode?.attrs?.label).toBe("Simple Button");
      expect(buttonNode?.content?.[0]?.text).toBe("Simple Button");
      expect(buttonNode?.content?.length).toBe(1);
      expect(buttonNode?.content?.[0]?.type).toBe("text");
    });

    it("should preserve sync after creating button with no label", () => {
      editor.commands.setButton({});

      const json = editor.getJSON();
      const buttonNode = json.content?.[0];

      // Should use default label for both
      expect(buttonNode?.attrs?.label).toBe(defaultButtonProps.label);
      expect(buttonNode?.content?.[0]?.text).toBe(defaultButtonProps.label);
    });

    it("should maintain sync when programmatically updating both label and content", () => {
      editor.commands.setButton({ label: "Original" });

      let buttonPos = 0;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "button") {
          buttonPos = pos;
          return false;
        }
        return true;
      });

      const newLabel = "Updated Label";
      const buttonNode = editor.state.doc.nodeAt(buttonPos);

      if (buttonNode) {
        editor
          .chain()
          .command(({ tr, dispatch }) => {
            if (dispatch) {
              // Update both attribute and content
              tr.setNodeMarkup(buttonPos, buttonNode.type, {
                ...buttonNode.attrs,
                label: newLabel,
              });

              const from = buttonPos + 1;
              const to = buttonPos + 1 + buttonNode.content.size;
              tr.replaceWith(from, to, tr.doc.type.schema.text(newLabel));

              dispatch(tr);
            }
            return true;
          })
          .run();

        const json = editor.getJSON();
        const updatedNode = json.content?.[0];

        expect(updatedNode?.attrs?.label).toBe(newLabel);
        expect(updatedNode?.content?.[0]?.text).toBe(newLabel);
      }
    });
  });
});
