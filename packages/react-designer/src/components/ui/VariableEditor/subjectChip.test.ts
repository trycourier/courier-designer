import { describe, expect, it } from "vitest";
import { CHIP_NODE_PRIORITY } from "@/components/extensions/chipEditing";
import { shouldPreventEnter, SimpleVariableNode } from "./shared";
import { NodeSelection, TextSelection } from "prosemirror-state";

/**
 * The subject and header inputs use their own variable node. It behaved
 * differently from the canvas chip: not selectable, so a click never selected
 * it and the arrow keys stepped straight past; no Enter shortcut, so a selected
 * chip could not be opened; and no `autoEdit`, so nothing could ask it to open.
 */
describe("SimpleVariableNode, the subject chip", () => {
  it("is selectable, so a click selects it and arrows land on it", () => {
    expect(SimpleVariableNode.config.selectable).toBe(true);
  });

  it("outranks Paragraph, or Enter splits the line instead of opening the chip", () => {
    expect(SimpleVariableNode.config.priority).toBe(CHIP_NODE_PRIORITY);
  });

  it("carries autoEdit, which is how Enter and the autocomplete open it", () => {
    const attrs = SimpleVariableNode.config.addAttributes?.call({
      name: "variable",
    } as never) as Record<string, unknown>;
    expect(attrs).toHaveProperty("autoEdit");
  });

  it("binds Enter", () => {
    const shortcuts = SimpleVariableNode.config.addKeyboardShortcuts?.call({
      editor: { state: { selection: {} }, commands: {} },
      type: {},
      name: "variable",
    } as never) as Record<string, unknown>;
    expect(shortcuts).toHaveProperty("Enter");
  });

  it("lets Enter through when a chip is selected, so the shortcut can open it", () => {
    // `editorProps.handleKeyDown` runs before extension shortcuts, so a
    // single-line input that swallows every Enter also swallows the one that
    // means "open this chip".
    const onChip = Object.create(NodeSelection.prototype) as NodeSelection;
    expect(shouldPreventEnter(onChip)).toBe(false);
  });

  it("still swallows Enter with a caret, so a header stays one line", () => {
    const caret = Object.create(TextSelection.prototype) as TextSelection;
    expect(shouldPreventEnter(caret)).toBe(true);
  });
});
