import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import {
  DropRules,
  acceptsSidebarBlock,
  allowedInsertPosition,
  getDropRules,
  isFixedFirstBlock,
  isTrailingType,
  setTrailingTypes,
} from "./DropRules";

let editor: Editor | undefined;

const create = (withRules?: Parameters<typeof DropRules.configure>[0]) => {
  editor = new Editor({
    extensions: withRules ? [StarterKit, DropRules.configure(withRules)] : [StarterKit],
    content: "<h2>Header</h2><p>Body</p>",
  });
  return editor;
};

afterEach(() => {
  editor?.destroy();
  editor = undefined;
});

describe("without DropRules (every other channel)", () => {
  it("has no rules and allows every drop", () => {
    const e = create();

    expect(getDropRules(e)).toBeUndefined();
    expect(acceptsSidebarBlock(e, "image")).toBe(true);
    expect(allowedInsertPosition(e, 0)).toBe(0);
    expect(isFixedFirstBlock(e, 0)).toBe(false);
  });

  it("allows every drop without an editor", () => {
    expect(acceptsSidebarBlock(null, "image")).toBe(true);
    expect(isFixedFirstBlock(undefined, 0)).toBe(false);
  });
});

describe("with DropRules", () => {
  it("defaults to no restriction", () => {
    const e = create({});

    expect(getDropRules(e)).toEqual({
      fixedFirstBlock: false,
      sidebarTypes: null,
      trailingTypes: null,
    });
    expect(acceptsSidebarBlock(e, "image")).toBe(true);
    expect(allowedInsertPosition(e, 0)).toBe(0);
  });

  it("takes only the listed sidebar blocks", () => {
    const e = create({ sidebarTypes: ["text", "list"] });

    expect(acceptsSidebarBlock(e, "text")).toBe(true);
    expect(acceptsSidebarBlock(e, "list")).toBe(true);
    expect(acceptsSidebarBlock(e, "image")).toBe(false);
    expect(acceptsSidebarBlock(e, undefined)).toBe(false);
  });

  it("moves an insert at the very top to after a fixed first block", () => {
    const e = create({ fixedFirstBlock: true });
    const header = e.state.doc.firstChild!.nodeSize;

    expect(allowedInsertPosition(e, 0)).toBe(header);
    expect(allowedInsertPosition(e, header)).toBe(header);
    expect(allowedInsertPosition(e, header + 3)).toBe(header + 3);
  });

  it("marks only the first block as fixed", () => {
    const e = create({ fixedFirstBlock: true });

    expect(isFixedFirstBlock(e, 0)).toBe(true);
    expect(isFixedFirstBlock(e, e.state.doc.firstChild!.nodeSize)).toBe(false);
  });
});

describe("trailingTypes", () => {
  const order = (e: Editor) => {
    const names: string[] = [];
    e.state.doc.forEach((n) => names.push(n.type.name));
    return names;
  };

  it("matches a preset drag type by its block type", () => {
    const e = create({ trailingTypes: ["heading"] });
    expect(isTrailingType(e, "heading:big")).toBe(true);
    expect(isTrailingType(e, "paragraph")).toBe(false);
  });

  it("moves trailing blocks last when turned on, and keeps them last on edits", () => {
    const e = create();
    e.destroy();
    editor = new Editor({
      extensions: [StarterKit, DropRules],
      content: "<h2>Header</h2><p>Body</p>",
    });
    setTrailingTypes(editor, ["heading"]);
    expect(order(editor)).toEqual(["paragraph", "heading"]);

    editor.commands.insertContentAt(0, "<h2>Another</h2>");
    expect(order(editor)).toEqual(["paragraph", "heading", "heading"]);
  });

  it("leaves the order alone when off", () => {
    const e = create();
    setTrailingTypes(e, null);
    expect(order(e)).toEqual(["heading", "paragraph"]);
  });
});
