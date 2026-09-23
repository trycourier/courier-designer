import { Editor } from "@tiptap/core";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import Typography from "@tiptap/extension-typography";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HandlebarsSafeTypography } from "./smartTypography";
import { VariableInputRule, VariableNode } from "./Variable";

vi.mock("@tiptap/react", () => ({
  ReactNodeViewRenderer: vi.fn(() => () => ({
    dom: document.createElement("span"),
    contentDOM: null,
  })),
}));

vi.mock("./VariableView", () => ({ VariableView: vi.fn(() => "MockedVariableView") }));

function makeEditor() {
  return new Editor({
    element: document.createElement("div"),
    // Mirrors the extension kit: Typography with the five handlebars-hostile
    // rules off, and the guarded replacements re-added.
    extensions: [
      Document,
      Paragraph,
      Text,
      VariableNode,
      VariableInputRule,
      Typography.configure({
        openDoubleQuote: false,
        closeDoubleQuote: false,
        openSingleQuote: false,
        closeSingleQuote: false,
        ellipsis: false,
      }),
      HandlebarsSafeTypography,
    ],
    content: "<p></p>",
  });
}

/** Type one character the way ProseMirror does, offering it to input rules first. */
function type(editor: Editor, text: string) {
  for (const char of text) {
    const { view } = editor;
    const { from, to } = view.state.selection;
    const handled = view.someProp("handleTextInput", (f) => f(view, from, to, char));
    if (!handled) view.dispatch(view.state.tr.insertText(char, from, to));
  }
}

function read(editor: Editor): string {
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

describe("Typography must not rewrite characters inside an expression", () => {
  let editor: Editor;
  beforeEach(() => {
    editor = makeEditor();
  });

  it("keeps straight quotes in a helper argument", () => {
    // Curly quotes make the renderer drop the argument silently.
    type(editor, '{{truncate data.message 20 "..."}}');
    expect(read(editor)).toContain('"..."');
    expect(read(editor)).not.toMatch(/[“”…]/);
  });

  it("keeps straight quotes around a condition operator", () => {
    type(editor, '{{#if (condition data.a "==" "b")}}');
    expect(read(editor)).toContain('"=="');
    expect(read(editor)).not.toMatch(/[“”]/);
  });

  it("still applies smart typography to ordinary prose", () => {
    type(editor, 'He said "hi"...');
    expect(read(editor)).toMatch(/[“”…]/);
  });

  it("resumes smart typography after the expression closes", () => {
    type(editor, '{{data.x}} then "quoted"');
    const out = read(editor);
    expect(out).toMatch(/[“”]/);
  });
});
