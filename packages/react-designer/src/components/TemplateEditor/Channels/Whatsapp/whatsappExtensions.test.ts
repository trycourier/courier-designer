import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { WhatsappFlatLists, WhatsappHeaderFirst } from "./whatsappExtensions";

let editor: Editor | undefined;

const create = (content: object) => {
  editor = new Editor({
    extensions: [StarterKit, WhatsappHeaderFirst, WhatsappFlatLists],
    content,
  });
  return editor;
};

const heading = (text?: string) => ({
  type: "heading",
  attrs: { level: 2 },
  ...(text && { content: [{ type: "text", text }] }),
});
const paragraph = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });

const blocks = (e: Editor) =>
  e.getJSON().content?.map((node) => [node.type, node.content?.[0]?.text]);

afterEach(() => {
  editor?.destroy();
  editor = undefined;
});

describe("WhatsappHeaderFirst", () => {
  it("moves the header line back first when a block lands above it", () => {
    const e = create({ type: "doc", content: [heading("Order update"), paragraph("Body")] });

    e.commands.insertContentAt(0, paragraph("Dropped"));

    expect(blocks(e)).toEqual([
      ["heading", "Order update"],
      ["paragraph", "Dropped"],
      ["paragraph", "Body"],
    ]);
  });

  it("restores an empty header line when the header is removed", () => {
    const e = create({ type: "doc", content: [heading("Order update"), paragraph("Body")] });

    e.commands.deleteRange({ from: 0, to: e.state.doc.firstChild!.nodeSize });

    expect(blocks(e)).toEqual([
      ["heading", undefined],
      ["paragraph", "Body"],
    ]);
  });

  it("leaves a document that starts with the header alone", () => {
    const e = create({ type: "doc", content: [heading("Order update"), paragraph("Body")] });
    const before = e.getJSON();

    e.commands.insertContentAt(e.state.doc.content.size, paragraph("More"));

    expect(e.getJSON().content?.[0]).toEqual(before.content?.[0]);
  });
});

describe("WhatsappFlatLists", () => {
  const list = {
    type: "doc",
    content: [
      heading(),
      {
        type: "bulletList",
        content: [
          { type: "listItem", content: [paragraph("One")] },
          { type: "listItem", content: [paragraph("Two")] },
        ],
      },
    ],
  };

  // WhatsApp renders one level, and the translator refuses a nested list.
  it("does not nest a list item on Tab", () => {
    const e = create(list);
    const second = e.state.doc.child(1).child(1);
    let pos = 0;
    e.state.doc.descendants((node, offset) => {
      if (node === second) pos = offset;
    });

    e.commands.setTextSelection(pos + 3);
    e.commands.keyboardShortcut("Tab");

    expect(e.getJSON().content?.[1].content?.map((item) => item.content?.length)).toEqual([1, 1]);
  });
});
