import { describe, expect, it } from "vitest";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { menuPreview, type ButtonEntry } from "./MSTeamsButtonOverflow";

const entries = (ids: string[]): ButtonEntry[] =>
  ids.map((id, index) => ({
    node: { attrs: { id } } as unknown as ProseMirrorNode,
    pos: index,
    index,
  }));

const ids = (list: ButtonEntry[]) => list.map(({ node }) => node.attrs.id);

const all = entries(["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9"]);
const overflow = all.slice(6);
const without = (id: string) => all.filter(({ node }) => node.attrs.id !== id);

describe("menuPreview", () => {
  it("lists the hidden buttons when no drag runs", () => {
    const { listed, placeAt } = menuPreview(null, overflow, null, null, false);
    expect(ids(listed)).toEqual(["B7", "B8", "B9"]);
    expect(placeAt).toBeNull();
  });

  it("drops a row button at the menu row under the pointer, pulling B7 up into the row", () => {
    const { listed, placeAt } = menuPreview(without("B1"), overflow, 1, null, false);
    expect(ids(listed)).toEqual(["B8", "B9"]);
    expect(placeAt).toBe(1);
  });

  it("pushes the 6th under the menu when a menu button lands in the row", () => {
    const { listed, placeAt } = menuPreview(
      without("B8"),
      overflow,
      null,
      { id: "B2", edge: "left" },
      true
    );
    expect(ids(listed)).toEqual(["B6", "B7", "B9"]);
    expect(placeAt).toBeNull();
  });

  it("keeps the menu as it is when a row button moves within the row", () => {
    const { listed } = menuPreview(
      without("B1"),
      overflow,
      null,
      { id: "B3", edge: "right" },
      false
    );
    expect(ids(listed)).toEqual(["B7", "B8", "B9"]);
  });

  it("puts a button dropped right after a full row's 6th at the top of the menu", () => {
    const { listed, placeAt } = menuPreview(all, overflow, null, { id: "B6", edge: "right" }, true);
    expect(ids(listed)).toEqual(["B7", "B8", "B9"]);
    expect(placeAt).toBe(0);
  });

  it("puts a new button that ends a full row at the end of the menu", () => {
    const { listed, placeAt } = menuPreview(all, overflow, null, "end", true);
    expect(placeAt).toBe(listed.length);
  });
});
