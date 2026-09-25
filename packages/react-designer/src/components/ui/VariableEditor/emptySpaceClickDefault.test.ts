import { Editor } from "@tiptap/core";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { describe, expect, it } from "vitest";
import { emptySpaceClickHandler } from "./emptySpaceClick";

/**
 * `TextSelection.near` is a static that calls `this.findFrom`, so passing it
 * around unbound — which is what a destructuring default does — threw
 * "Cannot read properties of undefined (reading 'findFrom')" on every click in
 * the empty space of the subject row.
 *
 * The other tests inject `near`, so none of them ever ran the default. This one
 * drives a real editor and does not inject anything.
 */
function editorWithText(text: string) {
  return new Editor({
    element: document.createElement("div"),
    extensions: [Document, Paragraph, Text],
    content: `<p>${text}</p>`,
  });
}

describe("the handler's own default", () => {
  it("places the caret at the end without throwing", () => {
    const editor = editorWithText("Subject line");
    const { view } = editor;
    const paragraphEnd = 1 + (view.state.doc.firstChild?.content.size ?? 0);

    // A click past the end of the content, which is the case the handler exists
    // for: resolveEmptySpaceClick returns a target and the default runs.
    const handled = emptySpaceClickHandler()(view, paragraphEnd + 1, {
      clientX: 10_000,
    } as MouseEvent);

    expect(handled).toBe(true);
    expect(view.state.selection.from).toBe(paragraphEnd);
  });

  it("leaves a click inside the content to ProseMirror", () => {
    const editor = editorWithText("Subject line");
    const { view } = editor;

    expect(emptySpaceClickHandler()(view, 3, { clientX: 5 } as MouseEvent)).toBe(false);
  });
});
