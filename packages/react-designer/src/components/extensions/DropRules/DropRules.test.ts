import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import {
  DropRules,
  acceptsSidebarBlock,
  currentSourceId,
  allowedInsertPosition,
  getDropRules,
  isFixedFirstBlock,
  isTrailingType,
  isWholeDragType,
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
      wholeDragTypes: null,
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

  it("keeps the caret in the block it was in when trailing blocks move", () => {
    editor = new Editor({
      extensions: [StarterKit, DropRules.configure({ trailingTypes: ["heading"] })],
      content: "<p>Body</p><h2>Header</h2>",
    });
    // Typing in "Body" between two headings, as a pasted button splitting the text does.
    editor.commands.insertContentAt(0, "<h2>Pasted</h2>");
    expect(order(editor)).toEqual(["paragraph", "heading", "heading"]);

    editor.commands.setTextSelection(3);
    editor.commands.insertContentAt(3, "<h2>Split</h2>");
    editor.commands.insertContent("X");

    expect(editor.getHTML()).toBe(
      "<p>Bo</p><p>Xdy</p><h2>Split</h2><h2>Pasted</h2><h2>Header</h2>"
    );
  });

  it("leaves the order alone when off", () => {
    const e = create();
    setTrailingTypes(e, null);
    expect(order(e)).toEqual(["heading", "paragraph"]);
  });
});

describe("wholeDragTypes", () => {
  it("matches a block or preset type it lists, and nothing without the option", () => {
    const e = create({ wholeDragTypes: ["heading"] });
    expect(isWholeDragType(e, "heading")).toBe(true);
    expect(isWholeDragType(e, "heading:big")).toBe(true);
    expect(isWholeDragType(e, "paragraph")).toBe(false);
  });

  it("drags nothing whole by default", () => {
    expect(isWholeDragType(create(), "heading")).toBe(false);
  });
});

describe("currentSourceId", () => {
  const doc = (ids: string[]) => {
    const nodes = ids.map((id) => ({ attrs: { id } }));
    return {
      state: {
        doc: {
          childCount: nodes.length,
          child: (i: number) => nodes[i],
          forEach: (fn: (node: { attrs: { id: string } }) => void) => nodes.forEach(fn),
        },
      },
    } as unknown as Parameters<typeof currentSourceId>[0];
  };

  it("keeps an id the document still has", () => {
    expect(currentSourceId(doc(["a", "b"]), { type: "editor", id: "b", index: 0 })).toBe("b");
  });

  it("finds a block whose id changed by the index it was dragged from", () => {
    expect(currentSourceId(doc(["x", "y"]), { type: "editor", id: "old", index: 1 })).toBe("y");
  });

  it("leaves a sidebar drag alone", () => {
    expect(currentSourceId(doc(["x"]), { type: "sidebar", id: "new" })).toBe("new");
  });
});
