import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { MSTeamsCardTextOnly } from "./msteamsCardTextOnly";

let editor: Editor | undefined;
afterEach(() => {
  editor?.destroy();
  editor = undefined;
});

const make = (enabled: boolean) => {
  editor = new Editor({
    extensions: [StarterKit, MSTeamsCardTextOnly.configure({ enabled })],
    content: "<p>Start</p>",
  });
  return editor;
};

const types = (e: Editor) => {
  const names: string[] = [];
  e.state.doc.forEach((node) => names.push(node.type.name));
  return names;
};

describe("MSTeamsCardTextOnly", () => {
  it("turns a quote or heading made any way (input rule, shortcut, command) into paragraphs in card mode", () => {
    const e = make(true);
    e.commands.setContent("<p>Start</p>");
    e.chain()
      .focus("end")
      .insertContent("<blockquote><p>Quoted</p></blockquote><h1>Title</h1>")
      .run();
    e.chain().focus("end").toggleBlockquote().run();

    expect(types(e).every((name) => name === "paragraph")).toBe(true);
    expect(e.getText()).toContain("Quoted");
    expect(e.getText()).toContain("Title");
  });

  it("leaves them alone outside card mode", () => {
    const e = make(false);
    e.chain()
      .focus("end")
      .insertContent("<blockquote><p>Quoted</p></blockquote><h1>Title</h1>")
      .run();

    expect(types(e)).toEqual(expect.arrayContaining(["blockquote", "heading"]));
  });
});
