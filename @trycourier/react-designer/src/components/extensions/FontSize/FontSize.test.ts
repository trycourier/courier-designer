import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "../Color/Color";
import { FontSize } from "./FontSize";

function createEditor(enabled = true): Editor {
  return new Editor({
    extensions: [Document, Paragraph, Text, TextStyle, Color, FontSize.configure({ enabled })],
    content: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }],
    },
  });
}

describe("FontSize extension", () => {
  let editor: Editor;

  afterEach(() => {
    editor?.destroy();
  });

  describe("commands", () => {
    it("sets a px size via setFontSize", () => {
      editor = createEditor();
      editor.commands.selectAll();
      editor.commands.setFontSize("28px");

      const mark = editor.state.doc.firstChild!.firstChild!.marks[0];
      expect(mark.type.name).toBe("textStyle");
      expect(mark.attrs.fontSize).toBe("28px");
    });

    it("rejects non-px values the renderer would drop", () => {
      editor = createEditor();
      editor.commands.selectAll();

      expect(editor.commands.setFontSize("2em")).toBe(false);
      expect(editor.commands.setFontSize("28")).toBe(false);
      expect(editor.state.doc.firstChild!.firstChild!.marks).toHaveLength(0);
    });

    it("clears the size via unsetFontSize", () => {
      editor = createEditor();
      editor.commands.selectAll();
      editor.commands.setFontSize("28px");
      editor.commands.unsetFontSize();

      expect(editor.state.doc.firstChild!.firstChild!.marks).toHaveLength(0);
    });

    it("keeps a color mark when the size is cleared", () => {
      editor = createEditor();
      editor.commands.selectAll();
      editor.commands.setColor("#ff0000");
      editor.commands.setFontSize("28px");
      editor.commands.unsetFontSize();

      const mark = editor.state.doc.firstChild!.firstChild!.marks[0];
      expect(mark.attrs.color).toBe("#ff0000");
      expect(mark.attrs.fontSize).toBeNull();
    });

    it("shares the single textStyle mark with color", () => {
      editor = createEditor();
      editor.commands.selectAll();
      editor.commands.setColor("#00ff00");
      editor.commands.setFontSize("22px");

      const marks = editor.state.doc.firstChild!.firstChild!.marks;
      expect(marks).toHaveLength(1);
      expect(marks[0].attrs).toMatchObject({ color: "#00ff00", fontSize: "22px" });
    });
  });

  describe("renderHTML / parseHTML", () => {
    it("renders the size as an inline style", () => {
      editor = createEditor();
      editor.commands.selectAll();
      editor.commands.setFontSize("30px");

      expect(editor.getHTML()).toContain("font-size: 30px");
    });

    it("parses a px inline style back into the mark", () => {
      editor = createEditor();
      editor.commands.setContent('<p><span style="font-size: 26px">Hello</span></p>');

      const mark = editor.state.doc.firstChild!.firstChild!.marks[0];
      expect(mark.attrs.fontSize).toBe("26px");
    });

    it("ignores a non-px inline style on parse", () => {
      editor = createEditor();
      editor.commands.setContent('<p><span style="font-size: 2em">Hello</span></p>');

      const marks = editor.state.doc.firstChild!.firstChild!.marks;
      expect(marks.every((m) => m.attrs.fontSize === null)).toBe(true);
    });
  });

  describe("enabled: false", () => {
    // Hiding the toolbar button is not enough. Paste goes straight to `parseHTML`,
    // so with the gate off a copied `<span style="font-size:28px">` still reached
    // Elemental as `font_size` — the write the gate exists to prevent.
    it("discards an inline px size on parse", () => {
      editor = createEditor(false);
      editor.commands.setContent('<p><span style="font-size: 28px">Hello</span></p>');

      const marks = editor.state.doc.firstChild!.firstChild!.marks;
      expect(marks.every((m) => m.attrs.fontSize === null)).toBe(true);
    });

    it("refuses setFontSize", () => {
      editor = createEditor(false);
      editor.commands.selectAll();

      expect(editor.commands.setFontSize("30px")).toBe(false);
      expect(editor.getHTML()).not.toContain("font-size");
    });

    it("still loads a mark set directly, so stored values round-trip", () => {
      // Elemental → Tiptap sets the attribute rather than parsing HTML. Dropping
      // the extension when gated would strip values authored while it was open.
      editor = createEditor(false);
      editor.commands.setContent({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Hello",
                marks: [{ type: "textStyle", attrs: { fontSize: "28px" } }],
              },
            ],
          },
        ],
      });

      expect(editor.state.doc.firstChild!.firstChild!.marks[0].attrs.fontSize).toBe("28px");
      expect(editor.getHTML()).toContain("font-size: 28px");
    });
  });
});
