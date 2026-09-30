import { Document } from "@tiptap/extension-document";
import { Text } from "@tiptap/extension-text";
import { Editor } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { Paragraph } from "../Paragraph/Paragraph";
import { HandlebarsExpressionNode } from "../HandlebarsExpression";
import { VariableNode } from "../Variable/Variable";
import { Button as ButtonNode } from "./Button";
import { extractButtonTextContent } from "./buttonUtils";

/**
 * A button label holding a helper crashed the whole template on load —
 * `RangeError: Invalid content for node type button` — because the schema
 * allowed only text and variables while the converter builds expression nodes
 * for anything that is not a plain variable.
 */
function editorWith(content: unknown) {
  return new Editor({
    extensions: [Document, Paragraph, Text, VariableNode, HandlebarsExpressionNode, ButtonNode],
    content: content as never,
  });
}

const label = (parts: unknown[]) => ({
  type: "doc",
  content: [{ type: "button", attrs: { label: "x" }, content: parts }],
});

describe("a button label containing a helper", () => {
  it("loads without throwing", () => {
    expect(() =>
      editorWith(
        label([
          { type: "text", text: "Hi " },
          {
            type: "handlebarsExpression",
            attrs: { raw: "{{capitalize data.name}}", kind: "helperCall", name: "capitalize" },
          },
        ])
      )
    ).not.toThrow();
  });

  it("keeps the helper in the button's content", () => {
    const editor = editorWith(
      label([
        { type: "text", text: "Hi " },
        {
          type: "handlebarsExpression",
          attrs: { raw: "{{capitalize data.name}}", kind: "helperCall", name: "capitalize" },
        },
      ])
    );
    expect(JSON.stringify(editor.getJSON())).toContain("handlebarsExpression");
  });

  it("round-trips the label text, helper included", () => {
    const editor = editorWith(
      label([
        { type: "text", text: "Hi " },
        {
          type: "handlebarsExpression",
          attrs: { raw: "{{capitalize data.name}}", kind: "helperCall", name: "capitalize" },
        },
      ])
    );
    const button = editor.state.doc.firstChild;
    expect(button).toBeTruthy();
    expect(extractButtonTextContent(button as never)).toBe("Hi {{capitalize data.name}}");
  });
});
