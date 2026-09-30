import { describe, expect, it } from "vitest";
import { isInsideLoopAt } from "./chipScope";

function editorWithAncestors(ancestors: Array<{ name: string; attrs?: Record<string, unknown> }>) {
  return {
    state: {
      doc: {
        resolve: () => ({
          depth: ancestors.length - 1,
          node: (d: number) => ({
            type: { name: ancestors[d].name },
            attrs: ancestors[d].attrs ?? {},
          }),
        }),
      },
    },
  } as never;
}

/**
 * `$.item` and `$.index` only mean something inside a looping list, and the
 * expression chip judged its arguments with `inLoop` hard-coded to false — so
 * `{{capitalize $.item.name}}` inside a loop was drawn red although it sends
 * perfectly well.
 */
describe("isInsideLoopAt", () => {
  it("is true inside a looping list", () => {
    const editor = editorWithAncestors([
      { name: "doc" },
      { name: "list", attrs: { loop: "data.items" } },
      { name: "paragraph" },
    ]);
    expect(isInsideLoopAt(editor, 4)).toBe(true);
  });

  it("is false in a list that is not looping", () => {
    const editor = editorWithAncestors([
      { name: "doc" },
      { name: "list", attrs: {} },
      { name: "paragraph" },
    ]);
    expect(isInsideLoopAt(editor, 4)).toBe(false);
  });

  it("is false outside any list, and for a position that no longer resolves", () => {
    expect(isInsideLoopAt(editorWithAncestors([{ name: "doc" }, { name: "paragraph" }]), 2)).toBe(
      false
    );
    const broken = {
      state: {
        doc: {
          resolve: () => {
            throw new Error("gone");
          },
        },
      },
    } as never;
    expect(isInsideLoopAt(broken, 99)).toBe(false);
  });
});
