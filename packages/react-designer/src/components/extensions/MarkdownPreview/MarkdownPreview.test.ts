import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import { ExtensionKit } from "@/components/extensions/extension-kit";
import { convertElementalToTiptap } from "@/lib/utils/convertElementalToTiptap";
import { convertTiptapToElemental } from "@/lib/utils/convertTiptapToElemental";
import { getOrCreateInboxElement } from "@/components/TemplateEditor/Channels/Inbox/Inbox";
import type { ElementalNode } from "@/types/elemental.types";
import type { TiptapDoc } from "@/lib/utils";
import { MarkdownPreview, findMarkdownSpans } from "./MarkdownPreview";

// ProseMirror's own mouse handling asks for this; jsdom has none.
document.elementFromPoint ??= () => null;

const spans = (text: string) =>
  findMarkdownSpans(text).map((s) => [s.type, text.slice(s.from, s.to)]);

// Same vocabulary and edge cases as courier-web's inbox markdown renderer (C-23104).
describe("findMarkdownSpans", () => {
  it("finds bold, italic and strike", () => {
    expect(spans("a **b** *c* __d__ _e_ ~~f~~")).toEqual([
      ["bold", "**b**"],
      ["italic", "*c*"],
      ["bold", "__d__"],
      ["italic", "_e_"],
      ["strike", "~~f~~"],
    ]);
  });

  it("nests emphasis inside bold", () => {
    expect(spans("**a _b_ c**")).toEqual([
      ["bold", "**a _b_ c**"],
      ["italic", "_b_"],
    ]);
  });

  it("leaves delimiters that do not hug their content", () => {
    expect(spans("5 * 3 * 2")).toEqual([]);
  });

  it("leaves underscores inside words", () => {
    expect(spans("user_id and snake_case_name")).toEqual([]);
  });

  it("never lets a span cross a line break, as the Inbox renders line by line", () => {
    expect(spans("**a\nb** _c_")).toEqual([["italic", "_c_"]]);
  });

  it("leaves underscores inside bare URLs", () => {
    expect(spans("see https://x.com/_promo_ now")).toEqual([]);
  });

  it("reads a typed link like the Inbox: its text is scanned, its URL consumed", () => {
    expect(spans("[**a**](https://x.com)**b** [c](https://x.com/_d_)")).toEqual([
      ["bold", "**a**"],
      ["bold", "**b**"],
    ]);
  });

  it("does not take the Elemental ~x~ and +x+ forms the inbox ignores", () => {
    expect(spans("~a~ +b+")).toEqual([]);
  });
});

const inboxDoc = (title: string, body: string) =>
  convertElementalToTiptap({
    version: "2022-01-01",
    elements: [
      getOrCreateInboxElement({
        elements: [
          {
            type: "channel",
            channel: "inbox",
            elements: [
              { type: "meta", title },
              { type: "text", content: body },
            ],
          } satisfies ElementalNode,
        ],
      }),
    ],
  });

const mount = (content: ReturnType<typeof inboxDoc>) => {
  const element = document.createElement("div");
  document.body.appendChild(element);
  return new Editor({
    element,
    extensions: [...ExtensionKit({ textMarks: "plain-text" }), MarkdownPreview],
    content,
  });
};

describe("MarkdownPreview in the In-app editor", () => {
  it("styles the span and hides its markers when the editor is not focused", () => {
    const editor = mount(inboxDoc("Your **order** shipped", "Track it _here_"));
    const html = editor.view.dom.innerHTML;

    expect(html).toContain("font-weight: 700");
    expect(html).toContain("font-style: italic");
    expect(editor.view.dom.querySelectorAll(".courier-md-marker")).toHaveLength(4);
    // display:none would put line-end before a hidden closing marker (C-23104).
    for (const marker of editor.view.dom.querySelectorAll<HTMLElement>(".courier-md-marker")) {
      expect(marker.style.fontSize).toBe("0px");
      expect(marker.style.lineHeight).toBe("0");
      expect(marker.style.display).toBe("");
    }
    editor.destroy();
  });

  it("keeps the markers in the document, so saving writes back what was typed", () => {
    const content = inboxDoc("Your **order** shipped", "Track it _here_ and **{{name}}**");
    const editor = mount(content);
    const elemental = convertTiptapToElemental(editor.getJSON() as TiptapDoc);

    expect(JSON.stringify(elemental)).toContain("Your **order** shipped");
    expect(editor.getText()).toContain("Track it _here_ and **");
    editor.destroy();
  });

  it("decorates the right positions after a variable chip", () => {
    const editor = mount(inboxDoc("T", "Hi {{name}} **bold**"));
    const markers = [...editor.view.dom.querySelectorAll(".courier-md-marker")].map(
      (el) => el.textContent
    );
    const styled = editor.view.dom.querySelector('[style*="font-weight: 700"]');

    expect(markers).toEqual(["**", "**"]);
    expect(styled?.textContent).toBe("bold");
    editor.destroy();
  });

  it("reveals a span's markers while the focused caret is on it", () => {
    const editor = mount(inboxDoc("T", "a **bold** z"));
    let inside = 0;
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text?.includes("bold")) inside = pos + node.text.indexOf("bold") + 1;
    });

    editor.view.dom.dispatchEvent(new FocusEvent("focus"));
    editor.commands.setTextSelection(inside);
    expect(editor.view.dom.querySelectorAll(".courier-md-marker")).toHaveLength(0);

    editor.view.dom.dispatchEvent(new FocusEvent("blur"));
    expect(editor.view.dom.querySelectorAll(".courier-md-marker")).toHaveLength(2);
    editor.destroy();
  });

  it("keeps markers still through the first click, where mousedown comes before focus", () => {
    const editor = mount(inboxDoc("T", "a **bold** z"));
    const markers = () => editor.view.dom.querySelectorAll(".courier-md-marker").length;
    let inside = 0;
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text?.includes("bold")) inside = pos + node.text.indexOf("bold") + 1;
    });

    editor.view.dom.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    editor.view.dom.dispatchEvent(new FocusEvent("focus"));
    editor.commands.setTextSelection(inside);
    expect(markers()).toBe(2);

    editor.view.dom.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    expect(markers()).toBe(0);
    editor.destroy();
  });

  it("reveals markers when the caret is in a word glued to the span", () => {
    const editor = mount(inboxDoc("T", "a **bold**ly z"));
    let end = 0;
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text?.includes("ly")) end = pos + node.text.indexOf("ly") + 2;
    });

    editor.view.dom.dispatchEvent(new FocusEvent("focus"));
    editor.commands.setTextSelection(end);
    expect(editor.view.dom.querySelectorAll(".courier-md-marker")).toHaveLength(0);

    editor.commands.setTextSelection(end + 2);
    expect(editor.view.dom.querySelectorAll(".courier-md-marker")).toHaveLength(2);
    editor.destroy();
  });

  it("leaves action button labels alone, as the Inbox draws them as plain text", () => {
    const content = convertElementalToTiptap({
      version: "2022-01-01",
      elements: [
        getOrCreateInboxElement({
          elements: [
            {
              type: "channel",
              channel: "inbox",
              elements: [
                { type: "meta", title: "T" },
                { type: "text", content: "B" },
                { type: "action", content: "*Shop now*", href: "https://example.com" },
              ],
            } satisfies ElementalNode,
          ],
        }),
      ],
    });
    const editor = mount(content);

    expect(editor.getText()).toContain("*Shop now*");
    expect(editor.view.dom.querySelectorAll(".courier-md-marker")).toHaveLength(0);
    editor.destroy();
  });

  it("unfreezes on a key press when the mouseup never arrived", () => {
    const editor = mount(inboxDoc("T", "a **bold** z"));
    const markers = () => editor.view.dom.querySelectorAll(".courier-md-marker").length;
    let inside = 0;
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text?.includes("bold")) inside = pos + node.text.indexOf("bold") + 1;
    });

    editor.view.dom.dispatchEvent(new FocusEvent("focus"));
    editor.view.dom.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    editor.commands.setTextSelection(inside);
    expect(markers()).toBe(2);

    editor.view.dom.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })
    );
    expect(markers()).toBe(0);
    editor.destroy();
  });

  it("releases the freeze on a mouseup anywhere in the document", () => {
    const editor = mount(inboxDoc("T", "a **bold** z"));
    const markers = () => editor.view.dom.querySelectorAll(".courier-md-marker").length;
    let inside = 0;
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text?.includes("bold")) inside = pos + node.text.indexOf("bold") + 1;
    });

    editor.view.dom.dispatchEvent(new FocusEvent("focus"));
    editor.view.dom.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    editor.commands.setTextSelection(inside);
    expect(markers()).toBe(2);

    document.body.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    expect(markers()).toBe(0);
    editor.destroy();
  });
});
