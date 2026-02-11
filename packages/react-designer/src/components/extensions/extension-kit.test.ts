import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import { ExtensionKit } from "./extension-kit";

describe("ExtensionKit", () => {
  describe("Text Marks Configuration", () => {
    it("should enable Bold, Italic, Strike, and Underline marks by default", () => {
      const extensions = ExtensionKit();
      const editor = new Editor({ extensions });
      
      // Check that formatting marks are available in the schema
      expect(editor.schema.marks.bold).toBeDefined();
      expect(editor.schema.marks.italic).toBeDefined();
      expect(editor.schema.marks.strike).toBeDefined();
      expect(editor.schema.marks.underline).toBeDefined();
      
      editor.destroy();
    });

    describe("Plain-text configuration (disable all marks)", () => {
      it("should disable all marks when textMarks is 'plain-text'", () => {
        const extensions = ExtensionKit({ textMarks: "plain-text" });
        const editor = new Editor({ extensions });
        
        // Check that formatting marks are NOT available in the schema
        expect(editor.schema.marks.bold).toBeUndefined();
        expect(editor.schema.marks.italic).toBeUndefined();
        expect(editor.schema.marks.strike).toBeUndefined();
        expect(editor.schema.marks.underline).toBeUndefined();
        
        editor.destroy();
      });

      it("should still include other essential marks when textMarks is 'plain-text'", () => {
        const extensions = ExtensionKit({ textMarks: "plain-text" });
        const editor = new Editor({ extensions });
        
        // Core marks should still be available
        expect(editor.schema.marks.link).toBeDefined();
        
        editor.destroy();
      });

      it("should exclude Underline extension from extension array when textMarks is 'plain-text'", () => {
        const extensions = ExtensionKit({ textMarks: "plain-text" });
        const extensionNames = extensions.map((ext) => ext?.name).filter(Boolean);
        
        expect(extensionNames).not.toContain("underline");
      });
    });

    describe("Object configuration (selective control)", () => {
      it("should disable only underline and strike when set to 'disabled' (MS Teams use case)", () => {
        const extensions = ExtensionKit({
          textMarks: { underline: "disabled", strike: "disabled" },
        });
        const editor = new Editor({ extensions });
        
        // Bold and italic should still be available
        expect(editor.schema.marks.bold).toBeDefined();
        expect(editor.schema.marks.italic).toBeDefined();
        
        // Underline and strike should be disabled
        expect(editor.schema.marks.underline).toBeUndefined();
        expect(editor.schema.marks.strike).toBeUndefined();
        
        editor.destroy();
      });

      it("should disable only bold when set to 'disabled'", () => {
        const extensions = ExtensionKit({
          textMarks: { bold: "disabled" },
        });
        const editor = new Editor({ extensions });
        
        // Bold should be disabled
        expect(editor.schema.marks.bold).toBeUndefined();
        
        // Other marks should still be available
        expect(editor.schema.marks.italic).toBeDefined();
        expect(editor.schema.marks.strike).toBeDefined();
        expect(editor.schema.marks.underline).toBeDefined();
        
        editor.destroy();
      });

      it("should allow granular control with 'disabled' and 'default'", () => {
        const extensions = ExtensionKit({
          textMarks: {
            bold: "disabled",
            italic: "default",
            underline: "disabled",
            strike: "default",
          },
        });
        const editor = new Editor({ extensions });
        
        // Bold and underline should be disabled
        expect(editor.schema.marks.bold).toBeUndefined();
        expect(editor.schema.marks.underline).toBeUndefined();
        
        // Italic and strike should still be available
        expect(editor.schema.marks.italic).toBeDefined();
        expect(editor.schema.marks.strike).toBeDefined();
        
        editor.destroy();
      });

      it("should treat undefined mark config as enabled (default behavior)", () => {
        const extensions = ExtensionKit({
          textMarks: {
            bold: "disabled",
            // italic, strike, underline left undefined
          },
        });
        const editor = new Editor({ extensions });
        
        // Bold should be disabled
        expect(editor.schema.marks.bold).toBeUndefined();
        
        // Other marks should use default (enabled)
        expect(editor.schema.marks.italic).toBeDefined();
        expect(editor.schema.marks.strike).toBeDefined();
        expect(editor.schema.marks.underline).toBeDefined();
        
        editor.destroy();
      });
    });

    it("should include Underline extension in extension array by default", () => {
      const extensions = ExtensionKit();
      const extensionNames = extensions.map((ext) => ext?.name).filter(Boolean);
      
      expect(extensionNames).toContain("underline");
    });
  });
});
