import { SimpleVariableNode } from "@/components/ui/VariableEditor/shared";
import { Editor } from "@tiptap/core";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { describe, expect, it, vi } from "vitest";
import { convertVariableChipToExpression } from "../HandlebarsExpression/convertVariableChip";
import { HandlebarsExpressionNode } from "../HandlebarsExpression";
import { VariableInputRule } from "./index";

vi.mock("@tiptap/react", () => ({
  ReactNodeViewRenderer: vi.fn(() => () => ({
    dom: document.createElement("span"),
    contentDOM: null,
  })),
}));

/**
 * The header fields — subject, CC, Reply-To — build their own extension list
 * rather than using the canvas's, and they leave out the `Variable` NODE. What
 * they keep is `VariableInputRule`, and that is the extension carrying the
 * escape plugin, so a block opener typed in a header becomes an expression
 * exactly as it does on the canvas.
 *
 * This is the guard on that: the list is assembled by hand in `VariableInput`
 * and `VariableTextarea`, and dropping the input rule from either would
 * silently leave `{{#if x}}` inside a variable chip in those fields alone.
 */
function headerEditor() {
  return new Editor({
    element: document.createElement("div"),
    extensions: [
      Document,
      Paragraph,
      Text,
      SimpleVariableNode,
      HandlebarsExpressionNode,
      VariableInputRule,
    ],
    content: "<p></p>",
  });
}

/** One character at a time, the way ProseMirror delivers a keystroke. */
function type(editor: Editor, text: string) {
  for (const char of text) {
    const { view } = editor;
    const { from, to } = view.state.selection;
    const handled = view.someProp("handleTextInput", (f) => f(view, from, to, char));
    if (!handled) view.dispatch(view.state.tr.insertText(char, from, to));
  }
}

function nodeNames(editor: Editor): string[] {
  const names: string[] = [];
  editor.state.doc.descendants((node) => {
    if (!node.isText && node.type.name !== "paragraph" && node.type.name !== "doc") {
      names.push(node.type.name);
    }
    return true;
  });
  return names;
}

describe("handlebars typed in a header field", () => {
  it("makes an expression for a block opener, as the canvas does", () => {
    const editor = headerEditor();
    type(editor, "{{#if data.x}}");
    expect(nodeNames(editor)).toContain("handlebarsExpression");
    expect(nodeNames(editor)).not.toContain("variable");
  });

  it("makes an expression for a closer too", () => {
    const editor = headerEditor();
    type(editor, "{{/if}}");
    expect(nodeNames(editor)).toContain("handlebarsExpression");
  });

  // `{{else}}` has no sigil to key off, so both surfaces put the literal braces
  // back and leave it as text rather than opening a chip on it.
  it("leaves else as the literal text, here as on the canvas", () => {
    const editor = headerEditor();
    type(editor, "{{else}}");
    expect(nodeNames(editor)).toEqual([]);
    expect(editor.state.doc.textContent).toBe("{{else}}");
  });

  it("still makes a variable chip for a plain path", () => {
    const editor = headerEditor();
    type(editor, "{{data.name");
    expect(nodeNames(editor)).toContain("variable");
    expect(nodeNames(editor)).not.toContain("handlebarsExpression");
  });
});

/**
 * The other side of the race: once the chip's span has focus the keystroke goes
 * to the chip, not the document, and the swap has to be made from there. This is
 * what the chip calls when its own text turns out to start with a sigil.
 */
describe("swapping a variable chip for an expression", () => {
  const withVariable = (id: string) => {
    const editor = headerEditor();
    editor.commands.setContent(`<p></p>`);
    editor
      .chain()
      .command(({ tr, state }) => {
        tr.replaceWith(1, 1, state.schema.nodes.variable.create({ id, isInvalid: false }));
        return true;
      })
      .run();
    return editor;
  };

  it("replaces the node, keeping the text as the expression body", () => {
    const editor = withVariable("#if data.x");
    const node = editor.state.doc.firstChild?.firstChild;

    expect(
      convertVariableChipToExpression({
        editor,
        getPos: () => 1,
        nodeSize: node?.nodeSize ?? 1,
        text: "#if data.x",
        autoEdit: true,
      })
    ).toBe(true);

    const swapped = editor.state.doc.firstChild?.firstChild;
    expect(swapped?.type.name).toBe("handlebarsExpression");
    expect(swapped?.attrs.raw).toBe("{{#if data.x}}");
    // Opened in edit mode, so the keystrokes that follow carry on into it.
    expect(swapped?.attrs.autoEdit).toBe(true);
  });

  it("opens a committed swap without edit mode", () => {
    const editor = withVariable("#if data.x");
    convertVariableChipToExpression({
      editor,
      getPos: () => 1,
      nodeSize: editor.state.doc.firstChild?.firstChild?.nodeSize ?? 1,
      text: "#if data.x",
      autoEdit: false,
    });
    expect(editor.state.doc.firstChild?.firstChild?.attrs.autoEdit).toBeFalsy();
  });

  it("declines when the position has gone, so the chip carries on", () => {
    const editor = withVariable("#if data.x");
    expect(
      convertVariableChipToExpression({
        editor,
        getPos: () => undefined,
        nodeSize: 1,
        text: "#if data.x",
        autoEdit: true,
      })
    ).toBe(false);
    expect(editor.state.doc.firstChild?.firstChild?.type.name).toBe("variable");
  });
});

/**
 * What the header fields were failing at: the swap happened, but everything
 * typed after the sigil landed in the FIELD rather than in the new chip, which
 * kept `{{#}}`. The chip's span takes focus a frame later, and until it does the
 * keystrokes still belong to the document — so the document has to put them in.
 */
describe("typing on after a chip has been swapped", () => {
  const expressionIn = (editor: Editor) => {
    let found: { raw: string; name: string } | undefined;
    editor.state.doc.descendants((node) => {
      if (node.type.name === "handlebarsExpression") {
        found = { raw: String(node.attrs.raw), name: String(node.attrs.name) };
      }
      return true;
    });
    return found;
  };

  it("carries on into the chip, not into the field", () => {
    const editor = headerEditor();
    type(editor, "{{#if data.x");

    expect(expressionIn(editor)).toEqual({ raw: "{{#if data.x}}", name: "if" });
    // Nothing leaked into the field beside the chip.
    expect(editor.state.doc.textContent).toBe("");
  });

  it("keeps the kind and name in step as the text grows", () => {
    const editor = headerEditor();
    type(editor, "{{/ea");
    expect(expressionIn(editor)?.raw).toBe("{{/ea}}");

    type(editor, "ch");
    expect(expressionIn(editor)).toEqual({ raw: "{{/each}}", name: "each" });
  });

  it("does the same on the canvas, where the chip is quicker to focus", () => {
    const editor = headerEditor();
    type(editor, "{{^unless data.vip");
    expect(expressionIn(editor)?.raw).toBe("{{^unless data.vip}}");
  });
});
