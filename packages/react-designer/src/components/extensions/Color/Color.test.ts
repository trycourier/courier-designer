import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "./Color";

function createEditor(content?: Record<string, unknown>): Editor {
  return new Editor({
    extensions: [Document, Paragraph, Text, TextStyle, Color],
    content: content || {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }],
    },
  });
}

describe("Color extension", () => {
  let editor: Editor;

  afterEach(() => {
    editor?.destroy();
  });

  describe("commands", () => {
    it("should set a hex color via setColor command", () => {
      editor = createEditor();
      editor.commands.selectAll();
      editor.commands.setColor("#ff0000");

      const mark = editor.state.doc.firstChild!.firstChild!.marks[0];
      expect(mark.type.name).toBe("textStyle");
      expect(mark.attrs.color).toBe("#ff0000");
    });

    it("should set a brand color ref via setColor command", () => {
      editor = createEditor();
      editor.commands.selectAll();
      editor.commands.setColor("{brand.colors.primary}");

      const mark = editor.state.doc.firstChild!.firstChild!.marks[0];
      expect(mark.type.name).toBe("textStyle");
      expect(mark.attrs.color).toBe("{brand.colors.primary}");
    });

    it("should unset color via unsetColor command", () => {
      editor = createEditor();
      editor.commands.selectAll();
      editor.commands.setColor("#ff0000");
      editor.commands.unsetColor();

      const marks = editor.state.doc.firstChild!.firstChild!.marks;
      expect(marks).toHaveLength(0);
    });
  });

  describe("renderHTML", () => {
    it("should render hex color as inline style", () => {
      editor = createEditor();
      editor.commands.selectAll();
      editor.commands.setColor("#ff0000");

      const html = editor.getHTML();
      expect(html).toContain('style="color: #ff0000"');
      expect(html).not.toContain("data-brand-color");
    });

    it("should render brand color ref as CSS variable with data attribute", () => {
      editor = createEditor();
      editor.commands.selectAll();
      editor.commands.setColor("{brand.colors.primary}");

      const html = editor.getHTML();
      expect(html).toContain("var(--courier-brand-color-primary)");
      expect(html).toContain('data-brand-color="{brand.colors.primary}"');
    });

    it("should render secondary brand color ref correctly", () => {
      editor = createEditor();
      editor.commands.selectAll();
      editor.commands.setColor("{brand.colors.secondary}");

      const html = editor.getHTML();
      expect(html).toContain("var(--courier-brand-color-secondary)");
      expect(html).toContain('data-brand-color="{brand.colors.secondary}"');
    });

    it("should render tertiary brand color ref correctly", () => {
      editor = createEditor();
      editor.commands.selectAll();
      editor.commands.setColor("{brand.colors.tertiary}");

      const html = editor.getHTML();
      expect(html).toContain("var(--courier-brand-color-tertiary)");
      expect(html).toContain('data-brand-color="{brand.colors.tertiary}"');
    });

    it("should not render anything when color is null", () => {
      editor = createEditor();
      const html = editor.getHTML();
      expect(html).not.toContain("style");
      expect(html).not.toContain("data-brand-color");
    });
  });

  describe("parseHTML", () => {
    it("should parse color from inline style", () => {
      editor = createEditor();
      editor.commands.setContent(
        '<p><span style="color: #ff0000">red text</span></p>'
      );

      const mark = editor.state.doc.firstChild!.firstChild!.marks[0];
      // Browser normalizes hex to rgb() in element.style.color
      expect(mark.attrs.color).toBe("rgb(255, 0, 0)");
    });

    it("should recover brand color ref from data-brand-color attribute", () => {
      editor = createEditor();
      editor.commands.setContent(
        '<p><span style="color: var(--courier-brand-color-primary)" data-brand-color="{brand.colors.primary}">primary text</span></p>'
      );

      const mark = editor.state.doc.firstChild!.firstChild!.marks[0];
      expect(mark.attrs.color).toBe("{brand.colors.primary}");
    });

    it("should recover secondary brand color ref from data-brand-color attribute", () => {
      editor = createEditor();
      editor.commands.setContent(
        '<p><span style="color: var(--courier-brand-color-secondary)" data-brand-color="{brand.colors.secondary}">secondary text</span></p>'
      );

      const mark = editor.state.doc.firstChild!.firstChild!.marks[0];
      expect(mark.attrs.color).toBe("{brand.colors.secondary}");
    });

    it("should ignore invalid data-brand-color values and fall back to style", () => {
      editor = createEditor();
      editor.commands.setContent(
        '<p><span style="color: #ff0000" data-brand-color="not-a-brand-ref">text</span></p>'
      );

      const mark = editor.state.doc.firstChild!.firstChild!.marks[0];
      // Browser normalizes hex to rgb() in element.style.color
      expect(mark.attrs.color).toBe("rgb(255, 0, 0)");
    });
  });

  describe("round-trip (set → getHTML → parse)", () => {
    it("should round-trip hex colors (browser normalizes to rgb)", () => {
      editor = createEditor();
      editor.commands.selectAll();
      editor.commands.setColor("#abcdef");

      const html = editor.getHTML();
      editor.commands.setContent(html);

      const mark = editor.state.doc.firstChild!.firstChild!.marks[0];
      // Browser normalizes hex in style to rgb() during parseHTML
      expect(mark.attrs.color).toBe("rgb(171, 205, 239)");
    });

    it("should round-trip brand color refs", () => {
      editor = createEditor();
      editor.commands.selectAll();
      editor.commands.setColor("{brand.colors.primary}");

      const html = editor.getHTML();
      editor.commands.setContent(html);

      const mark = editor.state.doc.firstChild!.firstChild!.marks[0];
      expect(mark.attrs.color).toBe("{brand.colors.primary}");
    });
  });
});
