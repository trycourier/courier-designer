import { describe, it, expect, vi } from "vitest";
import { NodeSelection } from "prosemirror-state";
import { LiquidTagNode, LiquidTagInputRule } from "./LiquidTag";
import { VARIABLE_ENTER_EDIT_META } from "../Variable/Variable.types";

vi.mock("@tiptap/react", () => ({
  ReactNodeViewRenderer: vi.fn(() => "MockedReactNodeViewRenderer"),
}));

vi.mock("./LiquidTagView", () => ({
  LiquidTagView: vi.fn(() => "MockedLiquidTagView"),
}));

describe("LiquidTagNode", () => {
  it("is an inline atom named liquidTag", () => {
    expect(LiquidTagNode.name).toBe("liquidTag");
    expect(LiquidTagNode.config.group).toBe("inline");
    expect(LiquidTagNode.config.inline).toBe(true);
    expect(LiquidTagNode.config.atom).toBe(true);
  });

  it("has elevated priority so Enter-to-edit beats Paragraph", () => {
    expect(LiquidTagNode.config.priority).toBe(1001);
  });

  describe("Enter-to-edit shortcut", () => {
    function invokeEnter(editor: unknown) {
      const shortcuts = (
        LiquidTagNode.config.addKeyboardShortcuts as (this: { editor: unknown; name: string }) => {
          Enter: () => boolean;
        }
      ).call({ editor, name: "liquidTag" });
      return shortcuts.Enter();
    }

    function makeTagSelection(from: number) {
      const selection = Object.create(NodeSelection.prototype);
      Object.defineProperty(selection, "node", {
        value: { type: { name: "liquidTag" } },
        configurable: true,
      });
      Object.defineProperty(selection, "from", { value: from, configurable: true });
      return selection;
    }

    it("requests edit mode when a tag node is selected", () => {
      const dispatch = vi.fn();
      const setMeta = vi.fn(() => ({ marked: true }));
      const editor = {
        isEditable: true,
        state: { selection: makeTagSelection(7), tr: { setMeta } },
        view: { dispatch },
      };

      expect(invokeEnter(editor)).toBe(true);
      expect(setMeta).toHaveBeenCalledWith(VARIABLE_ENTER_EDIT_META, 7);
      expect(dispatch).toHaveBeenCalledWith({ marked: true });
    });

    it("ignores Enter for a non-tag selection", () => {
      const editor = {
        isEditable: true,
        state: { selection: { from: 1 }, tr: { setMeta: vi.fn() } },
        view: { dispatch: vi.fn() },
      };
      expect(invokeEnter(editor)).toBe(false);
    });
  });

  it("input rule is disabled by default (enabled only under Liquid)", () => {
    expect(LiquidTagInputRule.name).toBe("liquidTagInputRule");
    expect(LiquidTagInputRule.storage).toEqual({ disabled: true });
  });
});
