import { Editor } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { ExtensionKit } from "@/components/extensions/extension-kit";
import { convertElementalToTiptap } from "./convertElementalToTiptap/convertElementalToTiptap";
import { convertTiptapToElemental } from "./convertTiptapToElemental/convertTiptapToElemental";
import type {
  ElementalContent,
  ElementalTextContentNode,
  ElementalTextNodeWithElements,
} from "@/types/elemental.types";

const SRC = "https://cc-public-content.clearcompany.com/images/icons/fa-check-circle-green.png";

const withElements = (elements: ElementalTextContentNode[]): ElementalContent => {
  const text: ElementalTextNodeWithElements = { type: "text", elements };
  return {
    version: "2022-01-01",
    elements: [{ type: "channel", channel: "email", elements: [text] }],
  };
};

// The SUP-782 payload: an img between a string and a link inside one text element.
const stored: ElementalTextContentNode[] = [
  { type: "string", content: "Embedded Image: " },
  { type: "img", src: SRC },
  { type: "link", href: "https://html5zombo.com/", content: "anything is possible" },
];

describe("img inside a text element", () => {
  it("loads into the editor as an inline image between the text and the link", () => {
    const doc = convertElementalToTiptap(withElements(stored), { channel: "email" });
    const editor = new Editor({ extensions: ExtensionKit(), content: doc });
    const paragraph = editor.getJSON().content?.[0];
    expect(paragraph?.content?.map((n) => n.type)).toEqual(["text", "inlineImage", "text"]);
    expect(paragraph?.content?.[1].attrs?.src).toBe(SRC);
    editor.destroy();
  });

  it("survives an unedited open and save", () => {
    const doc = convertElementalToTiptap(withElements(stored), { channel: "email" });
    const [saved] = convertTiptapToElemental(doc as never);
    expect((saved as { elements: ElementalTextContentNode[] }).elements).toEqual(stored);
  });

  it("keeps href, alt text, width and tracking", () => {
    const img: ElementalTextContentNode = {
      type: "img",
      src: SRC,
      href: "https://example.com",
      alt_text: "check",
      width: "16px",
      disable_tracking: true,
    };
    const doc = convertElementalToTiptap(withElements([img]), { channel: "email" });
    const [saved] = convertTiptapToElemental(doc as never);
    expect((saved as { elements: ElementalTextContentNode[] }).elements).toEqual([img]);
  });

  // Mirrors the renderer, which wraps each img in whitespace (C-21289 sends).
  it("shows a gap wherever the rendered email has one", () => {
    const img: ElementalTextContentNode = { type: "img", src: SRC };
    const gaps = (elements: ElementalTextContentNode[]) => {
      const doc = convertElementalToTiptap(withElements(elements), { channel: "email" });
      const editor = new Editor({ extensions: ExtensionKit(), content: doc });
      const count = editor.view.dom.querySelectorAll("[data-inline-image-gap]").length;
      editor.destroy();
      return count;
    };
    const str = (content: string): ElementalTextContentNode => ({ type: "string", content });

    expect(gaps([str("a"), img, str("b")])).toBe(2);
    expect(gaps([str("a "), img, str(" b")])).toBe(0);
    expect(gaps([str("c"), img, img, str("d")])).toBe(3);
    expect(gaps([img, str("i")])).toBe(1);
    expect(gaps([str("x"), img])).toBe(1);
    expect(gaps([str("y"), img, { type: "link", href: "https://x.com", content: "L" }])).toBe(2);
  });
});
