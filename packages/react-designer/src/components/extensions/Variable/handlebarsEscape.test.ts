import { Editor } from "@tiptap/core";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VariableInputRule, VariableNode } from "./Variable";
import { HandlebarsExpressionNode } from "../HandlebarsExpression";

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

/**
 * With the expression node in the schema, a block sigil opens a live chip
 * instead of literal text.
 *
 * Literal `{{#if data.us` is plain text, so nothing suggests anything while the
 * author types the condition — the one place a variable path is hardest to
 * remember.
 */
describe("a block sigil in an editor that has expression chips", () => {
  const makeFullEditor = () =>
    new Editor({
      element: document.createElement("div"),
      extensions: [
        Document,
        Paragraph,
        Text,
        VariableNode,
        VariableInputRule,
        HandlebarsExpressionNode,
      ],
      content: "<p></p>",
    });

  it("opens an expression chip in edit mode", () => {
    const editor = makeFullEditor();
    type(editor, "{{#");
    const node = editor.state.doc.firstChild?.firstChild;
    expect(node?.type.name).toBe("handlebarsExpression");
    expect(node?.attrs.raw).toBe("{{#}}");
    // Without this the chip sits there closed and the author has to click it.
    expect(node?.attrs.autoEdit).toBe(true);
  });

  it("does the same for a closer and an inverse section", () => {
    for (const sigil of ["/", "^"]) {
      const editor = makeFullEditor();
      type(editor, `{{${sigil}`);
      expect(editor.state.doc.firstChild?.firstChild?.attrs.raw, sigil).toBe(`{{${sigil}}}`);
    }
  });

  it("leaves comments and partials as literal text, which have nothing to suggest", () => {
    for (const sigil of ["!", ">"]) {
      const editor = makeFullEditor();
      type(editor, `{{${sigil}`);
      expect(readBack(editor), sigil).toBe(`{{${sigil}`);
    }
  });
});

/**
 * Autocomplete, IME and "paste a word" all deliver several characters in one
 * input event. `{{cap` in one burst opened the chip and left `cap` sitting
 * after it as plain text.
 */
describe("{{ arriving with text after it in one burst", () => {
  it("carries the text into the chip when it arrives as one string", () => {
    const editor = makeEditor();
    typeChar(editor, "{{cap");

    const node = editor.state.doc.firstChild?.firstChild;
    expect(node?.type.name).toBe("variable");
    expect(node?.attrs.id).toBe("cap");
    expect(readBack(editor)).toBe("{{cap}}");
  });

  it("still opens an empty chip for a bare {{", () => {
    const editor = makeEditor();
    typeChar(editor, "{{");
    expect(editor.state.doc.firstChild?.firstChild?.attrs.id).toBe("");
  });

  it("leaves text that only looks like a name alone", () => {
    const editor = makeEditor();
    typeChar(editor, "plain words");
    expect(readBack(editor)).toBe("plain words");
  });
});

/**
 * A browser sends one insertText event per character, milliseconds apart. The
 * chip's edit span takes focus a render later, so the characters typed in
 * between reached the document instead: `{{cap` left an empty chip with `cap`
 * as paragraph text after it, and the suggestion list showed everything.
 */
describe("characters typed while a fresh chip is still taking focus", () => {
  it("go into the chip, one event per character", () => {
    const editor = makeEditor();
    type(editor, "{{cap");

    const node = editor.state.doc.firstChild?.firstChild;
    expect(node?.type.name).toBe("variable");
    expect(node?.attrs.id).toBe("cap");
    expect(readBack(editor)).toBe("{{cap}}");
  });

  it("keeps a dotted path together", () => {
    const editor = makeEditor();
    type(editor, "{{data.name");
    expect(readBack(editor)).toBe("{{data.name}}");
  });

  it("leaves a chip that has already been committed alone", () => {
    const editor = makeEditor();
    type(editor, "{{data.name");
    // Committing is what the edit span does on blur; from the document's side
    // it is the chip no longer waiting for input.
    const pos = 1;
    editor.view.dispatch(
      editor.state.tr.setNodeMarkup(pos, undefined, {
        ...editor.state.doc.firstChild?.firstChild?.attrs,
        autoEdit: false,
      })
    );

    type(editor, "x");
    expect(readBack(editor)).toBe("{{data.name}}x");
  });
});

