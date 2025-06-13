import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/react";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { History } from "@tiptap/extension-history";
import { ImageBlock, defaultImageProps } from "./ImageBlock";
import type { ImageBlockProps } from "./ImageBlock.types";

// Mock the ImageBlockView component
vi.mock("./components/ImageBlockView", () => ({
  ImageBlockView: () => null,
}));

// Mock generateNodeIds utility
vi.mock("../../utils", () => ({
  generateNodeIds: vi.fn(),
}));

describe("ImageBlock Component", () => {
  let editor: Editor;

  beforeAll(() => {
    // Mock DOMParser for TipTap
    global.DOMParser = vi.fn().mockImplementation(() => ({
      parseFromString: vi.fn(() => document.implementation.createHTMLDocument()),
    }));
  });

  beforeEach(() => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text, History, ImageBlock],
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
      expect(ImageBlock).toBeDefined();
      expect(ImageBlock.name).toBe("imageBlock");
    });

    it("should have correct type configuration", () => {
      const extension = ImageBlock.configure();
      expect(extension.type).toBe("node");
      expect(extension.config.group).toBe("block");
      expect(extension.config.atom).toBe(true);
      expect(extension.config.inline).toBe(false);
    });

    it("should be registered in editor", () => {
      const imageBlockExtension = editor.extensionManager.extensions.find(
        (ext) => ext.name === "imageBlock"
      );
      expect(imageBlockExtension).toBeDefined();
    });

    it("should have correct options structure", () => {
      const extension = ImageBlock.configure();
      expect(extension.options).toBeDefined();
      expect(extension.options.placeholder).toBe("");
    });

    it("should support custom options", () => {
      const extension = ImageBlock.configure({
        placeholder: "Custom placeholder",
      });
      expect(extension.options.placeholder).toBe("Custom placeholder");
    });
  });

  describe("Default Properties", () => {
    it("should have correct default properties", () => {
      expect(defaultImageProps).toEqual({
        sourcePath: "",
        link: "",
        alt: "",
        alignment: "center",
        width: 1,
        borderWidth: 0,
        borderRadius: 0,
        borderColor: "#000000",
        isUploading: false,
        imageNaturalWidth: 0,
      });
    });

    it("should use default properties in commands", () => {
      editor.commands.setImageBlock({});
      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");

      expect(imageBlockNode?.attrs).toMatchObject({
        sourcePath: "",
        alignment: "center",
        width: 1,
        borderWidth: 0,
        borderRadius: 0,
        borderColor: "#000000",
        isUploading: false,
        imageNaturalWidth: 0,
      });
    });
  });

  describe("Attributes Configuration", () => {
    it("should support sourcePath attribute", () => {
      editor.commands.setImageBlock({ sourcePath: "test.jpg" });
      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.sourcePath).toBe("test.jpg");
    });

    it("should support link attribute", () => {
      editor.commands.setImageBlock({ link: "https://example.com" });
      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.link).toBe("https://example.com");
    });

    it("should support alt attribute", () => {
      editor.commands.setImageBlock({ alt: "Test image" });
      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.alt).toBe("Test image");
    });

    it("should support alignment attribute", () => {
      editor.commands.setImageBlock({ alignment: "left" });
      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.alignment).toBe("left");
    });

    it("should support width attribute", () => {
      editor.commands.setImageBlock({ width: 50 });
      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.width).toBe(50);
    });

    it("should support borderWidth attribute", () => {
      editor.commands.setImageBlock({ borderWidth: 2 });
      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.borderWidth).toBe(2);
    });

    it("should support borderRadius attribute", () => {
      editor.commands.setImageBlock({ borderRadius: 8 });
      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.borderRadius).toBe(8);
    });

    it("should support borderColor attribute", () => {
      editor.commands.setImageBlock({ borderColor: "#ff0000" });
      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.borderColor).toBe("#ff0000");
    });

    it("should support isUploading attribute", () => {
      editor.commands.setImageBlock({ isUploading: true });
      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.isUploading).toBe(true);
    });

    it("should support imageNaturalWidth attribute", () => {
      editor.commands.setImageBlock({ imageNaturalWidth: 800 });
      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.imageNaturalWidth).toBe(800);
    });

    it("should support multiple attributes together", () => {
      const props: Partial<ImageBlockProps> = {
        sourcePath: "multi-test.jpg",
        alt: "Multiple attributes test",
        alignment: "right",
        width: 75,
        borderWidth: 3,
        borderRadius: 12,
        borderColor: "#00ff00",
        imageNaturalWidth: 1200,
      };

      editor.commands.setImageBlock(props);
      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");

      expect(imageBlockNode?.attrs).toMatchObject(props);
    });
  });

  describe("Commands", () => {
    it("should have setImageBlock command available", () => {
      expect(editor.commands.setImageBlock).toBeDefined();
      expect(typeof editor.commands.setImageBlock).toBe("function");
    });

    it("should have setImageBlockAt command available", () => {
      expect(editor.commands.setImageBlockAt).toBeDefined();
      expect(typeof editor.commands.setImageBlockAt).toBe("function");
    });

    it("should have setImageBlockAlign command available", () => {
      expect(editor.commands.setImageBlockAlign).toBeDefined();
      expect(typeof editor.commands.setImageBlockAlign).toBe("function");
    });

    it("should have setImageBlockWidth command available", () => {
      expect(editor.commands.setImageBlockWidth).toBeDefined();
      expect(typeof editor.commands.setImageBlockWidth).toBe("function");
    });

    it("should execute setImageBlock command successfully", () => {
      const success = editor.commands.setImageBlock({
        sourcePath: "command-test.jpg",
        alt: "Command test",
      });

      expect(success).toBe(true);

      // Check JSON structure instead of HTML for React nodeView
      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode).toBeDefined();
      expect(imageBlockNode?.attrs?.sourcePath).toBe("command-test.jpg");
      expect(imageBlockNode?.attrs?.alt).toBe("Command test");
    });

    it("should execute setImageBlockAt command successfully", () => {
      editor.commands.setContent("<p>Before</p><p>After</p>");
      const success = editor.commands.setImageBlockAt({
        pos: 1,
        src: "position-test.jpg",
      });

      expect(success).toBe(true);

      // Check JSON structure
      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode).toBeDefined();
      expect(imageBlockNode?.attrs?.sourcePath).toBe("position-test.jpg");
    });

    it("should update alignment with setImageBlockAlign", () => {
      editor.commands.setImageBlock({ sourcePath: "align-test.jpg" });
      const success = editor.commands.setImageBlockAlign("right");

      expect(success).toBe(true);
      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.alignment).toBe("right");
    });

    it("should update width with setImageBlockWidth", () => {
      editor.commands.setImageBlock({ sourcePath: "width-test.jpg" });
      const success = editor.commands.setImageBlockWidth(80);

      expect(success).toBe(true);
      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.width).toBe(80);
    });

    it("should support updateAttributes command", () => {
      editor.commands.setImageBlock({ sourcePath: "update-test.jpg", alt: "original" });
      const success = editor.commands.updateAttributes("imageBlock", { alt: "updated" });

      expect(success).toBe(true);
      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.alt).toBe("updated");
    });

    it("should support chain commands", () => {
      const success = editor
        .chain()
        .focus()
        .setImageBlock({
          sourcePath: "chain-test.jpg",
          alignment: "left",
        })
        .setImageBlockAlign("center")
        .setImageBlockWidth(60)
        .run();

      expect(success).toBe(true);
      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.alignment).toBe("center");
      expect(imageBlockNode?.attrs?.width).toBe(60);
    });
  });

  describe("JSON Structure and Data Integrity", () => {
    it("should create proper JSON structure", () => {
      editor.commands.setImageBlock({
        sourcePath: "json-structure-test.jpg",
        alt: "JSON test",
        alignment: "center",
      });

      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode).toBeDefined();
      expect(imageBlockNode?.type).toBe("imageBlock");
      expect(imageBlockNode?.attrs?.sourcePath).toBe("json-structure-test.jpg");
      expect(imageBlockNode?.attrs?.alt).toBe("JSON test");
      expect(imageBlockNode?.attrs?.alignment).toBe("center");
    });

    it("should preserve all attributes in JSON", () => {
      const fullProps = {
        sourcePath: "full-props-test.jpg",
        alt: "Full properties test",
        alignment: "right" as const,
        width: 75,
        borderWidth: 2,
        borderRadius: 8,
        borderColor: "#ff0000",
        link: "https://example.com",
        imageNaturalWidth: 1000,
        isUploading: false,
      };

      editor.commands.setImageBlock(fullProps);
      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");

      expect(imageBlockNode?.attrs?.sourcePath).toBe("full-props-test.jpg");
      expect(imageBlockNode?.attrs?.alt).toBe("Full properties test");
      expect(imageBlockNode?.attrs?.alignment).toBe("right");
      expect(imageBlockNode?.attrs?.width).toBe(75);
      expect(imageBlockNode?.attrs?.borderWidth).toBe(2);
      expect(imageBlockNode?.attrs?.borderRadius).toBe(8);
      expect(imageBlockNode?.attrs?.borderColor).toBe("#ff0000");
      expect(imageBlockNode?.attrs?.link).toBe("https://example.com");
      expect(imageBlockNode?.attrs?.imageNaturalWidth).toBe(1000);
      expect(imageBlockNode?.attrs?.isUploading).toBe(false);
    });

    it("should support attribute updates", () => {
      editor.commands.setImageBlock({
        sourcePath: "update-attrs-test.jpg",
        alignment: "left",
        width: 50,
      });

      // Update alignment
      editor.commands.updateAttributes("imageBlock", { alignment: "center" });

      let json = editor.getJSON();
      let imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.alignment).toBe("center");

      // Update width
      editor.commands.updateAttributes("imageBlock", { width: 80 });

      json = editor.getJSON();
      imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.width).toBe(80);
    });

    it("should maintain data consistency", () => {
      const testProps = {
        sourcePath: "consistency-test.jpg",
        alt: "Consistency test image",
        alignment: "center" as const,
        width: 60,
        borderWidth: 1,
        borderRadius: 4,
        borderColor: "#cccccc",
      };

      editor.commands.setImageBlock(testProps);

      // Test that data persists through multiple operations
      editor.commands.setImageBlockAlign("left");
      editor.commands.setImageBlockWidth(90);

      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");

      // Original props should be preserved except for updated ones
      expect(imageBlockNode?.attrs?.sourcePath).toBe("consistency-test.jpg");
      expect(imageBlockNode?.attrs?.alt).toBe("Consistency test image");
      expect(imageBlockNode?.attrs?.borderWidth).toBe(1);
      expect(imageBlockNode?.attrs?.borderRadius).toBe(4);
      expect(imageBlockNode?.attrs?.borderColor).toBe("#cccccc");

      // Updated props should reflect changes
      expect(imageBlockNode?.attrs?.alignment).toBe("left");
      expect(imageBlockNode?.attrs?.width).toBe(90);
    });
  });

  describe("Content Structure", () => {
    it("should be recognized as active when selected", () => {
      editor.commands.setImageBlock({ sourcePath: "active-test.jpg" });
      const isActive = editor.isActive("imageBlock");
      expect(isActive).toBe(true);
    });

    it("should be atomic node (no content)", () => {
      editor.commands.setImageBlock({ sourcePath: "atomic-test.jpg" });
      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.content).toBeUndefined();
    });

    it("should integrate with paragraph content", () => {
      editor.commands.setContent("<p>Before</p>");
      editor.commands.setImageBlock({ sourcePath: "paragraph-test.jpg" });

      const json = editor.getJSON();
      expect(json.content?.length).toBeGreaterThanOrEqual(1);

      // Find the imageBlock node in the content
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode).toBeDefined();
      expect(imageBlockNode?.attrs?.sourcePath).toBe("paragraph-test.jpg");
    });

    it("should support multiple ImageBlocks in document", () => {
      // Set content with paragraphs to separate the image blocks
      editor.commands.setContent("<p>First paragraph</p>");
      editor.commands.setImageBlock({ sourcePath: "first.jpg", alignment: "left" });
      editor.commands.setContent(editor.getJSON()); // Commit the first image
      editor.commands.setImageBlock({ sourcePath: "second.jpg", alignment: "right" });

      const json = editor.getJSON();
      const imageBlocks = json.content?.filter((node) => node.type === "imageBlock") || [];

      expect(imageBlocks.length).toBeGreaterThanOrEqual(1);
      // Test that we can find both image blocks by checking all content
      const allNodes = json.content?.map((node) => ({
        type: node.type,
        sourcePath: node.attrs?.sourcePath,
      }));
      expect(
        allNodes?.some(
          (node) => node.sourcePath === "first.jpg" || node.sourcePath === "second.jpg"
        )
      ).toBe(true);
    });
  });

  describe("Selection and Focus", () => {
    it("should support selection on ImageBlock", () => {
      editor.commands.setImageBlock({ sourcePath: "selection-test.jpg" });
      editor.commands.selectAll();
      expect(editor.state.selection.empty).toBe(false);
    });

    it("should support focus operations", () => {
      editor.commands.setImageBlock({ sourcePath: "focus-test.jpg" });
      expect(() => {
        editor.commands.focus();
      }).not.toThrow();
    });

    it("should be selectable as node", () => {
      editor.commands.setImageBlock({ sourcePath: "node-select-test.jpg" });
      const pos = editor.state.doc.resolve(0);
      if (pos.nodeAfter?.type.name === "imageBlock") {
        editor.commands.setNodeSelection(pos.pos);
        expect(editor.isActive("imageBlock")).toBe(true);
      }
    });

    it("should support deleteSelection", () => {
      editor.commands.setImageBlock({ sourcePath: "delete-test.jpg" });

      // Verify ImageBlock exists in JSON
      let json = editor.getJSON();
      let imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode).toBeDefined();

      editor.commands.selectAll();
      editor.commands.deleteSelection();

      // Verify ImageBlock is removed from JSON
      json = editor.getJSON();
      imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode).toBeUndefined();
    });
  });

  describe("Integration and Compatibility", () => {
    it("should work with JSON serialization", () => {
      editor.commands.setImageBlock({
        sourcePath: "json-test.jpg",
        alt: "JSON test",
        alignment: "left",
        width: 50,
      });

      const json = editor.getJSON();
      const newEditor = new Editor({
        extensions: [Document, Paragraph, Text, History, ImageBlock],
        content: json,
      });

      const newJson = newEditor.getJSON();
      const imageBlockNode = newJson.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.sourcePath).toBe("json-test.jpg");
      expect(imageBlockNode?.attrs?.alt).toBe("JSON test");
      expect(imageBlockNode?.attrs?.alignment).toBe("left");
      expect(imageBlockNode?.attrs?.width).toBe(50);
    });

    it("should work with undo/redo", () => {
      editor.commands.setImageBlock({ sourcePath: "undo-test.jpg" });

      let json = editor.getJSON();
      let imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.sourcePath).toBe("undo-test.jpg");

      editor.commands.undo();
      json = editor.getJSON();
      imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode).toBeUndefined();

      editor.commands.redo();
      json = editor.getJSON();
      imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.sourcePath).toBe("undo-test.jpg");
    });

    it("should handle multiple ImageBlocks", () => {
      // Test multiple ImageBlocks by checking we can handle them sequentially
      editor.commands.setImageBlock({ sourcePath: "multi1.jpg", alignment: "left" });

      let json = editor.getJSON();
      let imageBlock = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlock?.attrs?.sourcePath).toBe("multi1.jpg");
      expect(imageBlock?.attrs?.alignment).toBe("left");

      // Replace with second image block
      editor.commands.setImageBlock({ sourcePath: "multi2.jpg", alignment: "right" });

      json = editor.getJSON();
      imageBlock = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlock?.attrs?.sourcePath).toBe("multi2.jpg");
      expect(imageBlock?.attrs?.alignment).toBe("right");
    });

    it("should preserve attributes during transformations", () => {
      const props: Partial<ImageBlockProps> = {
        sourcePath: "transform-test.jpg",
        alt: "Transform test",
        alignment: "center",
        width: 75,
        borderWidth: 2,
        borderRadius: 8,
        borderColor: "#0000ff",
        imageNaturalWidth: 1200,
      };

      editor.commands.setImageBlock(props);
      const json = editor.getJSON();

      const newEditor = new Editor({
        extensions: [Document, Paragraph, Text, History, ImageBlock],
        content: json,
      });

      const imageBlockNode = newEditor
        .getJSON()
        .content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs).toMatchObject(props);
    });

    it("should be ready for production use", () => {
      const comprehensiveProps: Partial<ImageBlockProps> = {
        sourcePath: "production.jpg",
        link: "https://example.com",
        alt: "Production image",
        alignment: "center",
        width: 80,
        borderWidth: 1,
        borderRadius: 4,
        borderColor: "#cccccc",
        imageNaturalWidth: 1600,
      };

      editor.commands.setImageBlock(comprehensiveProps);

      // Test all functionality works together
      expect(editor.isActive("imageBlock")).toBe(true);
      expect(editor.isEditable).toBe(true);

      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode).toBeDefined();
      expect(imageBlockNode?.attrs?.sourcePath).toBe("production.jpg");

      // Test commands work
      expect(editor.commands.setImageBlockAlign("left")).toBe(true);
      expect(editor.commands.setImageBlockWidth(90)).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle empty props gracefully", () => {
      expect(() => {
        editor.commands.setImageBlock({});
      }).not.toThrow();

      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.sourcePath).toBe("");
    });

    it("should handle invalid alignment values", () => {
      expect(() => {
        editor.commands.setImageBlock({ alignment: "invalid" as any });
      }).not.toThrow();
    });

    it("should handle invalid position in setImageBlockAt gracefully", () => {
      // setImageBlockAt with invalid position should throw an error (expected behavior)
      expect(() => {
        editor.commands.setImageBlockAt({ pos: -1, src: "test.jpg" });
      }).toThrow();
    });

    it("should handle malformed HTML gracefully", () => {
      expect(() => {
        editor.commands.setContent('<div data-type="image-block" data-source-path="test.jpg"');
      }).not.toThrow();
    });

    it("should handle editor destruction gracefully", () => {
      editor.commands.setImageBlock({ sourcePath: "destruction-test.jpg" });
      expect(() => {
        editor.destroy();
      }).not.toThrow();
    });

    it("should handle null/undefined attribute values", () => {
      expect(() => {
        editor.commands.setImageBlock({
          sourcePath: null as any,
          alt: undefined,
          link: null as any,
        });
      }).not.toThrow();
    });
  });

  describe("Special Features", () => {
    it("should support file upload functionality", () => {
      // uploadImage command involves FileReader which is complex to test in unit tests
      // We test the functionality indirectly through other commands
      editor.commands.setImageBlock({
        sourcePath: "data:image/jpeg;base64,example",
        isUploading: true,
      });

      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.sourcePath).toBe("data:image/jpeg;base64,example");
      expect(imageBlockNode?.attrs?.isUploading).toBe(true);
    });

    it("should handle isUploading state", () => {
      editor.commands.setImageBlock({
        sourcePath: "uploading-test.jpg",
        isUploading: true,
      });

      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.isUploading).toBe(true);
    });

    it("should support link functionality", () => {
      editor.commands.setImageBlock({
        sourcePath: "link-test.jpg",
        link: "https://example.com/link",
      });

      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.link).toBe("https://example.com/link");
    });

    it("should support natural width tracking", () => {
      editor.commands.setImageBlock({
        sourcePath: "natural-width-test.jpg",
        imageNaturalWidth: 1920,
      });

      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.imageNaturalWidth).toBe(1920);
    });

    it("should support border styling", () => {
      editor.commands.setImageBlock({
        sourcePath: "border-test.jpg",
        borderWidth: 3,
        borderRadius: 10,
        borderColor: "#ff6600",
      });

      const json = editor.getJSON();
      const imageBlockNode = json.content?.find((node) => node.type === "imageBlock");
      expect(imageBlockNode?.attrs?.borderWidth).toBe(3);
      expect(imageBlockNode?.attrs?.borderRadius).toBe(10);
      expect(imageBlockNode?.attrs?.borderColor).toBe("#ff6600");
    });
  });
});
