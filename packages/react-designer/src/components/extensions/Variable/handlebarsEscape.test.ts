import { Editor } from "@tiptap/core";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VariableInputRule, VariableNode } from "./Variable";

// The node view itself is irrelevant here — these tests drive document state,
// not rendering — but it has to be a constructor ProseMirror can call.
vi.mock("@tiptap/react", () => ({
  ReactNodeViewRenderer: vi.fn(() => () => ({
    dom: document.createElement("span"),
    contentDOM: null,
  })),
}));

vi.mock("./VariableView", () => ({
  VariableView: vi.fn(() => "MockedVariableView"),
}));

function makeEditor() {
  return new Editor({
    element: document.createElement("div"),
    extensions: [Document, Paragraph, Text, VariableNode, VariableInputRule],
    content: "<p></p>",
  });
}

/**
 * Type one character the way ProseMirror does: offer it to every
 * `handleTextInput` prop first, and only insert it if none claimed it. Typing a
 * whole string in one insert would bypass the input rules entirely, which is
 * what makes browser-automation "type" calls a poor proxy for a real keystroke.
 */
function typeChar(editor: Editor, char: string) {
  const { view } = editor;
  const { from, to } = view.state.selection;
  const handled = view.someProp("handleTextInput", (f) => f(view, from, to, char));
  if (!handled) {
    view.dispatch(view.state.tr.insertText(char, from, to));
  }
}

function type(editor: Editor, text: string) {
  for (const char of text) typeChar(editor, char);
}

/** Serialize the paragraph, rendering a variable chip as `{{id}}`. */
function readBack(editor: Editor): string {
  let out = "";
  editor.state.doc.descendants((node) => {
    if (node.type.name === "variable") {
      out += `{{${node.attrs.id}}}`;
      return false;
    }
    if (node.isText) out += node.text ?? "";
    return true;
  });
  return out;
}

describe("handlebars escape", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = makeEditor();
  });

  it("still turns {{ into an empty variable chip", () => {
    type(editor, "{{");
    const node = editor.state.doc.firstChild?.firstChild;
    expect(node?.type.name).toBe("variable");
    expect(node?.attrs.id).toBe("");
  });

  it("keeps the braces when a block opener is typed", () => {
    type(editor, "{{#if x}}");
    expect(readBack(editor)).toBe("{{#if x}}");
  });

  it("keeps the braces for a block closer", () => {
    type(editor, "{{/if}}");
    expect(readBack(editor)).toBe("{{/if}}");
  });

  it("keeps the braces for else, which has no sigil", () => {
    type(editor, "{{else}}");
    expect(readBack(editor)).toBe("{{else}}");
  });

  it("keeps the braces for an inverse section, partial and comment", () => {
    type(editor, "{{^empty}}");
    expect(readBack(editor)).toBe("{{^empty}}");

    editor = makeEditor();
    type(editor, "{{> part}}");
    expect(readBack(editor)).toBe("{{> part}}");

    editor = makeEditor();
    type(editor, "{{!note}}");
    expect(readBack(editor)).toBe("{{!note}}");
  });

  it("round-trips the Float subject character by character", () => {
    type(
      editor,
      '{{#if (condition data.foo "==" "bar")}}This is bar!{{else}}This is not bar{{/if}}'
    );
    expect(readBack(editor)).toBe(
      '{{#if (condition data.foo "==" "bar")}}This is bar!{{else}}This is not bar{{/if}}'
    );
  });

  it("leaves a plain variable as a chip, not literal braces", () => {
    type(editor, "{{data.name");
    const node = editor.state.doc.firstChild?.firstChild;
    expect(node?.type.name).toBe("variable");
  });
});
