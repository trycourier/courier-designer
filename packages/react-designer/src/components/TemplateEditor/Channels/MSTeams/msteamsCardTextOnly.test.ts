import { afterEach, describe, expect, it } from "vitest";
import { Editor, Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { MSTeamsCardTextOnly } from "./msteamsCardTextOnly";

let editor: Editor | undefined;
afterEach(() => {
  editor?.destroy();
  editor = undefined;
});

// Stand-ins for the designer's image and divider blocks, which StarterKit lacks.
const leaf = (name: string, tag: string) =>
  Node.create({
    name,
    group: "block",
    atom: true,
    parseHTML: () => [{ tag }],
    renderHTML: () => [tag],
  });

const make = (enabled: boolean) => {
  editor = new Editor({
    extensions: [
      StarterKit,
      leaf("imageBlock", "image-block"),
      leaf("divider", "divider-block"),
      MSTeamsCardTextOnly.configure({ enabled }),
    ],
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

  it("drops images and dividers in card mode (a dropped image file, the --- input rule)", () => {
    const e = make(true);
    e.chain()
      .focus("end")
      .insertContent("<image-block></image-block><divider-block></divider-block><p>After</p>")
      .run();

    expect(types(e)).not.toContain("imageBlock");
    expect(types(e)).not.toContain("divider");
    expect(e.getText()).toContain("After");
  });

  it("keeps images and dividers outside card mode", () => {
    const e = make(false);
    e.chain()
      .focus("end")
      .insertContent("<image-block></image-block><divider-block></divider-block>")
      .run();

    expect(types(e)).toEqual(expect.arrayContaining(["imageBlock", "divider"]));
  });
});
