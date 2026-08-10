import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/react";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { Heading } from "@tiptap/extension-heading";
import { Blockquote } from "@tiptap/extension-blockquote";
import { TextSelection } from "prosemirror-state";
import { resolveSelectionFontSize } from "./useTextmenuStates";

/**
 * Stand-ins for the real block extensions: only the `fontSize` attribute the
 * walk reads matters here, and plain tiptap nodes keep the test free of the
 * node-view mocking the full extension kit needs.
 */
const withFontSize = <T extends { extend: (config: object) => unknown }>(node: T) =>
  node.extend({
    addAttributes(this: { parent?: () => object }) {
      // Keep the node's own attributes — Heading's `level` decides its tier.
      return { ...this.parent?.(), fontSize: { default: null } };
    },
  });

const EXTENSIONS = [
  Document,
  Text,
  withFontSize(Paragraph),
  withFontSize(Heading),
  withFontSize(Blockquote),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
] as any[];

/** An editor with the caret inside the first text node of the document. */
const editorWith = (content: object) => {
  const editor = new Editor({ extensions: EXTENSIONS, content });
  let textPos: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (textPos === null && node.isText) textPos = pos;
  });
  editor.view.dispatch(
    editor.state.tr.setSelection(TextSelection.create(editor.state.doc, textPos ?? 1))
  );
  return editor;
};

const paragraph = (attrs: Record<string, unknown> = {}) => ({
  type: "doc",
  content: [{ type: "paragraph", attrs, content: [{ type: "text", text: "hello" }] }],
});

describe("resolveSelectionFontSize", () => {
  it("falls back to the tier preset with nothing set anywhere", () => {
    expect(resolveSelectionFontSize(editorWith(paragraph()), null, null)).toBe(14);
  });

  it("takes the document base when the block sets nothing", () => {
    expect(resolveSelectionFontSize(editorWith(paragraph()), 13, 15)).toBe(13);
  });

  it("prefers the block's own size over the document base", () => {
    expect(resolveSelectionFontSize(editorWith(paragraph({ fontSize: 20 })), 13, 15)).toBe(20);
  });

  it("uses the heading preset, which the document base never reaches", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "hello" }] },
      ],
    };
    expect(resolveSelectionFontSize(editorWith(doc), 13, 15)).toBe(32);
  });

  // Each block sets the tier variable on its own wrapper, so the closest
  // ancestor that sets a size is the one the canvas actually applies.
  it("reports the quote's size for an unsized paragraph inside it", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "blockquote",
          attrs: { fontSize: 22 },
          content: [{ type: "paragraph", content: [{ type: "text", text: "hello" }] }],
        },
      ],
    };
    expect(resolveSelectionFontSize(editorWith(doc), 13, 15)).toBe(22);
  });

  it("lets the inner paragraph's own size win over the quote's", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "blockquote",
          attrs: { fontSize: 22 },
          content: [
            {
              type: "paragraph",
              attrs: { fontSize: 30 },
              content: [{ type: "text", text: "hello" }],
            },
          ],
        },
      ],
    };
    expect(resolveSelectionFontSize(editorWith(doc), 13, 15)).toBe(30);
  });

  it("resolves an unsized quote off the quote preset, then the document base", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [{ type: "paragraph", content: [{ type: "text", text: "hello" }] }],
        },
      ],
    };
    expect(resolveSelectionFontSize(editorWith(doc), null, null)).toBe(14);
    expect(resolveSelectionFontSize(editorWith(doc), 13, 15)).toBe(13);
  });
});
