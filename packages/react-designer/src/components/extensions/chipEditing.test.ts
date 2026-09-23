import type { Editor } from "@tiptap/core";
import type { NodeType } from "prosemirror-model";
import { NodeSelection, TextSelection } from "prosemirror-state";
import { describe, expect, it, vi } from "vitest";
import { autoEditAttribute, CHIP_NODE_PRIORITY, enterOpensChip } from "./chipEditing";

/** The chip's own node type; identity is all the shortcut compares on. */
const CHIP_TYPE = Object.create(null) as NodeType;

/** Enough of an editor to exercise the shortcut without mounting one. */
function harness(selection: unknown) {
  const updateAttributes = vi.fn(() => true);
  const editor: Editor = {
    state: { selection },
    commands: { updateAttributes },
  } as unknown as Editor;
  return { run: enterOpensChip({ editor, type: CHIP_TYPE, name: "chip" }), updateAttributes };
}

const nodeSelectionOf = (type: unknown) =>
  Object.create(NodeSelection.prototype, { node: { value: { type } } });

describe("enterOpensChip", () => {
  it("opens the chip when it is the selected node", () => {
    const { run, updateAttributes } = harness(nodeSelectionOf(CHIP_TYPE));
    expect(run()).toBe(true);
    expect(updateAttributes).toHaveBeenCalledWith("chip", { autoEdit: true });
  });

  it("leaves Enter alone for a text selection, so the block still splits", () => {
    const { run, updateAttributes } = harness(Object.create(TextSelection.prototype));
    expect(run()).toBe(false);
    expect(updateAttributes).not.toHaveBeenCalled();
  });

  it("leaves Enter alone when a different node type is selected", () => {
    const { run, updateAttributes } = harness(nodeSelectionOf({}));
    expect(run()).toBe(false);
    expect(updateAttributes).not.toHaveBeenCalled();
  });
});

describe("autoEditAttribute", () => {
  it("never survives a round trip through HTML", () => {
    expect(autoEditAttribute.default).toBe(false);
    expect(autoEditAttribute.parseHTML?.({} as HTMLElement)).toBe(false);
    expect(autoEditAttribute.renderHTML?.({ autoEdit: true })).toEqual({});
  });
});

describe("CHIP_NODE_PRIORITY", () => {
  it("outranks Paragraph, which would otherwise take Enter", () => {
    expect(CHIP_NODE_PRIORITY).toBeGreaterThan(100);
  });
});
