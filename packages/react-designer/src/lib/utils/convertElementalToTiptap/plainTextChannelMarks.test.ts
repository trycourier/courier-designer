import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import { ExtensionKit } from "@/components/extensions/extension-kit";
import type { ElementalContent, ElementalNode } from "@/types/elemental.types";
import { convertElementalToTiptap } from "./convertElementalToTiptap";

const MARKED = "X2 **bold** _i_ ~s~ +u+ tail";

const doc = (channel: string, elements: ElementalNode[]): ElementalContent => ({
  version: "2022-01-01",
  elements: [{ type: "channel", channel, elements }],
});

// SMS/Push editors run without formatting marks; a mark in the converted doc
// makes Tiptap discard the whole document (C-21259).
describe("plain-text channels keep markdown markers as text", () => {
  it.each([
    [
      "sms",
      [
        { type: "text", content: "X1 plain" },
        { type: "text", content: MARKED },
      ],
    ],
    [
      "push",
      [
        { type: "meta", title: "P" },
        { type: "text", content: MARKED },
      ],
    ],
  ] as [string, ElementalNode[]][])("%s editor loads every block", (channel, elements) => {
    const content = convertElementalToTiptap(doc(channel, elements));
    const editor = new Editor({ extensions: ExtensionKit({ textMarks: "plain-text" }), content });

    expect(editor.getText()).toContain(MARKED);
    editor.destroy();
  });

  it("sms keeps variables as chips", () => {
    const content = convertElementalToTiptap(
      doc("sms", [{ type: "text", content: "**{{name}}** hi" }])
    );
    const inline = content.content[0].content ?? [];

    expect(inline.map((n) => n.type)).toEqual(["text", "variable", "text"]);
  });

  it("email still parses markdown into marks", () => {
    const content = convertElementalToTiptap(doc("email", [{ type: "text", content: MARKED }]));
    const marks = (content.content[0].content ?? []).flatMap((n) => n.marks ?? []);

    expect(marks.map((m) => m.type)).toEqual(["bold", "italic", "strike", "underline"]);
  });
});
