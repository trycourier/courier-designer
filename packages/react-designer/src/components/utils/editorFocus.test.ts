import { describe, expect, it } from "vitest";
import { editorHoldsFocus } from "./editorFocus";

function editorWith({ isFocused, dom }: { isFocused: boolean; dom?: HTMLElement }) {
  return { isFocused, view: dom ? { dom } : undefined } as never;
}

/**
 * A chip is edited in its own contenteditable span inside a node view, and
 * ProseMirror does not count that as the editor being focused. The delayed
 * content sync only skipped `setContent` for a focused editor, so a save that
 * landed mid-edit replaced the whole document, destroyed the chip being typed
 * in and threw away the keys that followed.
 */
describe("editorHoldsFocus", () => {
  it("is true for a focused editor", () => {
    expect(editorHoldsFocus(editorWith({ isFocused: true }))).toBe(true);
  });

  it("is true while a chip's span inside the editor has focus", () => {
    const dom = document.createElement("div");
    const span = document.createElement("span");
    span.setAttribute("contenteditable", "true");
    span.tabIndex = 0;
    dom.appendChild(span);
    document.body.appendChild(dom);
    span.focus();

    expect(document.activeElement).toBe(span);
    expect(editorHoldsFocus(editorWith({ isFocused: false, dom }))).toBe(true);
  });

  it("is false when the focus is somewhere else entirely", () => {
    const dom = document.createElement("div");
    document.body.appendChild(dom);
    const outside = document.createElement("input");
    document.body.appendChild(outside);
    outside.focus();

    expect(editorHoldsFocus(editorWith({ isFocused: false, dom }))).toBe(false);
  });

  it("falls back to the editor's own flag when it has no view", () => {
    expect(editorHoldsFocus(editorWith({ isFocused: false }))).toBe(false);
  });
});
