import { describe, expect, it } from "vitest";
import {
  caretAfterChip,
  CHIP_NODE_PRIORITY,
  replaceChipWithHelper,
  shouldRestoreCaret,
} from "@/components/extensions/chipEditing";
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

/**
 * The sidebar's Label field offered only variables, while the same label edited
 * on the canvas offered helpers too — the same text, two different lists.
 */
describe("helpers in the subject and label inputs", () => {
  it("inserts the helper as an expression chip, opened for editing", () => {
    const calls: Array<Record<string, unknown>> = [];
    const created: Array<Record<string, unknown>> = [];
    const chain = {
      focus: () => chain,
      command: (fn: (arg: { tr: unknown }) => boolean) => {
        fn({
          tr: {
            replaceWith: (from: number, to: number, node: unknown) => {
              calls.push({ from, to, node });
            },
          },
        });
        return chain;
      },
      run: () => true,
    };
    const editorStub = {
      chain: () => chain,
      schema: {
        nodes: {
          handlebarsExpression: {
            create: (attrs: Record<string, unknown>) => {
              created.push(attrs);
              return attrs;
            },
          },
        },
      },
    };
    const editor = editorStub as never;

    expect(
      replaceChipWithHelper({
        editor,
        pos: 3,
        nodeSize: 1,
        helperName: "capitalize",
        isBlock: false,
      })
    ).toBe(true);
    expect(created[0]).toMatchObject({ raw: "{{capitalize }}", autoEdit: true });
    expect(calls[0]).toMatchObject({ from: 3, to: 4 });
  });

  it("gives a block helper its sigil, so the template stays balanced", () => {
    const created: Array<Record<string, unknown>> = [];
    const chain = {
      focus: () => chain,
      command: (fn: (arg: { tr: unknown }) => boolean) => {
        fn({ tr: { replaceWith: () => undefined } });
        return chain;
      },
      run: () => true,
    };
    const editorStub = {
      chain: () => chain,
      schema: {
        nodes: {
          handlebarsExpression: {
            create: (attrs: Record<string, unknown>) => {
              created.push(attrs);
              return attrs;
            },
          },
        },
      },
    };
    const editor = editorStub as never;

    replaceChipWithHelper({ editor, pos: 0, nodeSize: 1, helperName: "each", isBlock: true });
    expect(created[0]).toMatchObject({ raw: "{{#each }}", kind: "blockOpen" });
  });

  it("does nothing in an editor with no expression node, rather than throwing", () => {
    const emptySchema = { schema: { nodes: {} } };
    const editor = emptySchema as never;
    expect(
      replaceChipWithHelper({
        editor,
        pos: 0,
        nodeSize: 1,
        helperName: "capitalize",
        isBlock: false,
      })
    ).toBe(false);
  });
});

/**
 * A chip commits a frame after it blurs. Clicking another block blurs it, so
 * restoring the caret unconditionally dragged the caret back to the chip: the
 * block clicked was highlighted, and the typing went to the old line.
 */
describe("putting the caret back after a chip that has committed", () => {
  const chip = { pos: 10, nodeSize: 1 };

  it("restores it while the selection is still at the chip", () => {
    expect(shouldRestoreCaret({ selectionFrom: 10, ...chip })).toBe(true);
    expect(shouldRestoreCaret({ selectionFrom: 11, ...chip })).toBe(true);
  });

  it("leaves a caret the author has put somewhere else alone", () => {
    expect(shouldRestoreCaret({ selectionFrom: 40, ...chip })).toBe(false);
    expect(shouldRestoreCaret({ selectionFrom: 2, ...chip })).toBe(false);
  });
});

/**
 * The subject, From and Label inputs had no way to put the caret back after a
 * chip, so closing one with `}}` left the caret nowhere and the characters
 * typed next were dropped.
 */
describe("the caret after a chip in a single-line input", () => {
  it("goes just after the chip", () => {
    const selections: number[] = [];
    const editor = {
      state: {
        selection: { from: 3 },
        tr: {
          setSelection: (selection: { from: number }) => selections.push(selection.from),
        },
        doc: {},
      },
      view: { dispatch: () => undefined, focus: () => undefined },
      isDestroyed: false,
    } as never;

    caretAfterChip({ editor, pos: 3, nodeSize: 1, createSelection: (_doc, at) => ({ from: at }) });
    expect(selections).toEqual([4]);
  });

  it("leaves a caret the author has moved elsewhere alone", () => {
    const selections: number[] = [];
    const editor = {
      state: {
        selection: { from: 40 },
        tr: { setSelection: (s: { from: number }) => selections.push(s.from) },
        doc: {},
      },
      view: { dispatch: () => undefined, focus: () => undefined },
      isDestroyed: false,
    } as never;

    caretAfterChip({ editor, pos: 3, nodeSize: 1, createSelection: (_doc, at) => ({ from: at }) });
    expect(selections).toEqual([]);
  });
});

