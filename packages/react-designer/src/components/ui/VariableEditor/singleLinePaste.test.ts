import { Editor } from "@tiptap/core";
import { Document } from "@tiptap/extension-document";
import { Text } from "@tiptap/extension-text";
import { Paragraph } from "@tiptap/extension-paragraph";
import { DOMParser as PMDOMParser, Slice } from "@tiptap/pm/model";
import { describe, expect, it } from "vitest";
import { flattenSliceToOneLine } from "./shared";

/**
 * A header input is one line. Pasting several paragraphs into it used to insert
 * them as blocks, which rendered over the row below.
 */
function editor() {
  return new Editor({ extensions: [Document, Paragraph, Text], content: "<p></p>" });
}

function sliceFrom(html: string, ed: Editor) {
  const el = document.createElement("div");
  el.innerHTML = html;
  return PMDOMParser.fromSchema(ed.state.schema).parseSlice(el);
}

describe("pasting into a single-line input", () => {
  it("flattens several paragraphs into one line", () => {
    const ed = editor();
    const slice = sliceFrom("<p>one</p><p>two</p><p>three</p>", ed);
    const flat = flattenSliceToOneLine(slice, ed.state.schema);

    expect(flat.content.childCount).toBe(1);
    expect(flat.content.firstChild?.textContent).toBe("one two three");
  });

  it("leaves a single paragraph alone", () => {
    const ed = editor();
    const slice = sliceFrom("<p>just one</p>", ed);
    const flat = flattenSliceToOneLine(slice, ed.state.schema);

    expect(flat.content.childCount).toBe(1);
    expect(flat.content.firstChild?.textContent).toBe("just one");
  });

  it("returns an empty slice untouched", () => {
    const ed = editor();
    expect(flattenSliceToOneLine(Slice.empty, ed.state.schema)).toBe(Slice.empty);
  });
});
