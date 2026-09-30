import { SimpleVariableNode } from "@/components/ui/VariableEditor/shared";
import { Editor } from "@tiptap/core";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { describe, expect, it, vi } from "vitest";
import { HandlebarsExpressionNode } from "@/components/extensions/HandlebarsExpression";
import { blockScopeAt } from "../blockContext";

vi.mock("@tiptap/react", () => ({
  ReactNodeViewRenderer: vi.fn(() => () => ({
    dom: document.createElement("span"),
    contentDOM: null,
  })),
}));

/** One paragraph per entry; `#if x` becomes an expression chip. */
function docOf(paragraphs: string[][]) {
  const editor = new Editor({
    element: document.createElement("div"),
    extensions: [Document, Paragraph, Text, SimpleVariableNode, HandlebarsExpressionNode],
    content: "<p></p>",
  });

  editor
    .chain()
    .command(({ tr, state }) => {
      const nodes = paragraphs.map((chips) =>
        state.schema.nodes.paragraph.create(
          null,
          chips.map((raw) => {
            const inner = raw.replace(/^\{\{|\}\}$/g, "");
            const kind = inner.startsWith("#")
              ? "blockOpen"
              : inner.startsWith("/")
                ? "blockClose"
                : "helperCall";
            return state.schema.nodes.handlebarsExpression.create({
              raw,
              kind,
              name: inner.replace(/^[#/]/, "").split(" ")[0],
              isInvalid: false,
            });
          })
        )
      );
      tr.replaceWith(0, state.doc.content.size, nodes);
      return true;
    })
    .run();

  return editor;
}

/** Position just inside the nth paragraph, after its chips. */
const endOf = (editor: Editor, paragraph: number) => {
  let pos = 0;
  editor.state.doc.forEach((node, offset, index) => {
    if (index === paragraph) pos = offset + node.nodeSize - 1;
  });
  return pos;
};

/**
 * A `{{#if}}` left open in one block used to put every chip in every LATER
 * block "in scope", and a chip that believes it is inside a block is never put
 * to the host's validator — so a bare `{{name}}` the host rejects stayed
 * unmarked on the canvas. The renderer compiles each element on its own, so an
 * unclosed opener is that block's own error and opens nothing after it.
 */
describe("the blocks open around a position", () => {
  it("does not carry an unclosed opener into a later block", () => {
    const editor = docOf([["{{#if data.s.t}}"], ["{{data.s.name}}"]]);
    expect(blockScopeAt(editor.state.doc, endOf(editor, 1))).toEqual({
      inBlockScope: false,
      contextDepth: 0,
    });
  });

  it("sees an opener in the same block", () => {
    const editor = docOf([["{{#if data.s.t}}", "{{data.s.name}}"]]);
    expect(blockScopeAt(editor.state.doc, endOf(editor, 0))).toEqual({
      inBlockScope: true,
      // `#if` does not rebase the context, so a bare name is still the host's.
      contextDepth: 0,
    });
  });

  it("counts each and with as rebasing, and their closers", () => {
    const editor = docOf([["{{#each data.items}}", "{{name}}"]]);
    expect(blockScopeAt(editor.state.doc, endOf(editor, 0))).toEqual({
      inBlockScope: true,
      contextDepth: 1,
    });

    const closed = docOf([["{{#each data.items}}", "{{/each}}", "{{name}}"]]);
    expect(blockScopeAt(closed.state.doc, endOf(closed, 0))).toEqual({
      inBlockScope: false,
      contextDepth: 0,
    });
  });

  it("reads nothing into a block that has no markers", () => {
    const editor = docOf([["{{data.s.name}}"]]);
    expect(blockScopeAt(editor.state.doc, endOf(editor, 0))).toEqual({
      inBlockScope: false,
      contextDepth: 0,
    });
  });
});
