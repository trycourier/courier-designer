import { Document } from "@tiptap/extension-document";
import { Text } from "@tiptap/extension-text";
import { Editor } from "@tiptap/core";
import { NodeSelection } from "prosemirror-state";
import { beforeEach, describe, expect, it } from "vitest";
import { HandlebarsExpressionNode } from "../HandlebarsExpression";
import { VariableNode } from "../Variable/Variable";
import { Paragraph } from "./Paragraph";

/**
 * A selected chip has to be deletable wherever it sits.
 *
 * `preventElementDeletion` exists to stop a caret deletion from eating an
 * element it merely sits beside, but it ran before the keyboard shortcut that
 * exempts a NodeSelection — so a chip at the START of a block read as
 * "Backspace at the start with nothing before it" and the key was swallowed.
 * Reported from Studio: click the chip, press Backspace, nothing happens.
 */
function editorWith(content: unknown) {
  return new Editor({
    extensions: [Document, Paragraph, Text, VariableNode, HandlebarsExpressionNode],
    content: content as never,
  });
}

const expressionChip = (raw: string) => ({
  type: "handlebarsExpression",
  attrs: { raw, kind: "blockOpen", name: "if", isInvalid: false },
});

const variableChip = (id: string) => ({ type: "variable", attrs: { id, isInvalid: false } });

/** Press a key the way ProseMirror's own handlers see it. */
function press(editor: Editor, key: string) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  editor.view.someProp("handleKeyDown", (handler) => handler(editor.view, event));
  return event;
}

function selectChipAt(editor: Editor, pos: number) {
  const selection = NodeSelection.create(editor.state.doc, pos);
  editor.view.dispatch(editor.state.tr.setSelection(selection));
}

describe("deleting a selected chip", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = null as unknown as Editor;
  });

  it("removes an expression chip at the start of a block on Backspace", () => {
    editor = editorWith({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [expressionChip("{{#if data.test}}"), { type: "text", text: "kept" }],
        },
      ],
    });
    selectChipAt(editor, 1);
    press(editor, "Backspace");

    expect(editor.state.doc.textContent).toBe("kept");
    expect(JSON.stringify(editor.getJSON())).not.toContain("handlebarsExpression");
  });

  it("removes a variable chip at the start of a block on Backspace", () => {
    editor = editorWith({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [variableChip("data.name"), { type: "text", text: "kept" }],
        },
      ],
    });
    selectChipAt(editor, 1);
    press(editor, "Backspace");

    expect(editor.state.doc.textContent).toBe("kept");
    expect(JSON.stringify(editor.getJSON())).not.toContain('"variable"');
  });

  it("removes a chip at the end of a block on Delete", () => {
    editor = editorWith({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "kept" }, expressionChip("{{/if}}")],
        },
      ],
    });
    // The chip sits after the four characters of "kept", inside the paragraph.
    selectChipAt(editor, 5);
    press(editor, "Delete");

    expect(editor.state.doc.textContent).toBe("kept");
    expect(JSON.stringify(editor.getJSON())).not.toContain("handlebarsExpression");
  });

  it("still guards a caret deletion, which is what the plugin is for", () => {
    editor = editorWith({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "kept" }] }],
    });
    editor.commands.setTextSelection(1);
    const before = JSON.stringify(editor.getJSON());
    press(editor, "Backspace");

    // Backspace at the start of the only block must not remove the block or
    // its text — the exemption above is for a SELECTED node, nothing else.
    expect(JSON.stringify(editor.getJSON())).toBe(before);
    expect(editor.state.doc.textContent).toBe("kept");
  });
});
