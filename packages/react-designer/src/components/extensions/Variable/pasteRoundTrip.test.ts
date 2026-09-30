import { Editor } from "@tiptap/core";
import { Document } from "@tiptap/extension-document";
import { Text } from "@tiptap/extension-text";
import { DOMParser as PMDOMParser, DOMSerializer } from "@tiptap/pm/model";
import type { Schema } from "@tiptap/pm/model";
import { describe, expect, it } from "vitest";
import { Paragraph } from "../Paragraph/Paragraph";
import { SimpleVariableNode } from "@/components/ui/VariableEditor/shared";
import { HandlebarsExpressionNode } from "../HandlebarsExpression";
import { VariableNode } from "./Variable";
import { replaceVariablePatternsInHtml } from "./VariablePaste";

/**
 * Copy then paste has to return exactly what the author had.
 *
 * This drives ProseMirror's own clipboard path — `DOMSerializer` to produce the
 * HTML a copy puts on the clipboard, then the paste transform, then
 * `DOMParser.parseSlice` — so it pins the guarantee rather than inferring it
 * from a dispatched event. The transform used to rewrite `{{…}}` inside its own
 * `data-raw` attributes, so pasting copied chips produced literal span text and
 * double-escaped operators.
 */
const FLOAT_SUBJECT =
  "[{{tenant.name}}] {{#if data.has_all_payment_connections}}A bank connection was " +
  "successful on Float!{{else}}Float accounts can now be funded!{{/if}} " +
  '{{#if (condition data.count ">" 2)}}{{data.count}} items{{else}}one item{{/if}}';

/** The body editor's chip-bearing extensions. */
const BODY = [Document, Paragraph, Text, VariableNode, HandlebarsExpressionNode];

/**
 * `VariableInput`'s — the subject line. A different variable node
 * (`SimpleVariableNode`), so its serialization is worth pinning separately
 * rather than assuming the body's result covers it.
 */
const SUBJECT = [Document, Paragraph, Text, SimpleVariableNode, HandlebarsExpressionNode];

function editorWith(extensions: typeof BODY, html?: string) {
  return new Editor({ extensions, content: html ?? "<p></p>" });
}

/** What a copy puts on the clipboard. */
function clipboardHtml(editor: Editor): string {
  const { doc, schema } = editor.state;
  const container = document.createElement("div");
  container.appendChild(DOMSerializer.fromSchema(schema as Schema).serializeFragment(doc.content));
  return container.innerHTML;
}

/** What a paste does with it: the transform, then ProseMirror's parser. */
function pasteInto(editor: Editor, html: string) {
  const transformed = replaceVariablePatternsInHtml(html);
  const dom = new window.DOMParser().parseFromString(transformed, "text/html");
  const slice = PMDOMParser.fromSchema(editor.state.schema as Schema).parseSlice(dom.body);
  editor.view.dispatch(editor.state.tr.replaceSelection(slice));
}

/** Node types and their source, in order — what the author sees as chips. */
function shape(editor: Editor) {
  const out: string[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "variable") out.push(`variable:${node.attrs.id}`);
    else if (node.type.name === "handlebarsExpression") out.push(`expr:${node.attrs.raw}`);
    else if (node.isText) out.push(`text:${node.text}`);
  });
  return out;
}

describe("copy then paste round trip", () => {
  for (const [label, extensions] of [
    ["body editor", BODY],
    ["subject editor", SUBJECT],
  ] as const) {
    it(`returns the same chips and text in the ${label}`, () => {
      const source = editorWith(extensions as typeof BODY);
      // Author types/pastes the raw string once: this is the "before" state.
      pasteInto(source, `<p>${FLOAT_SUBJECT}</p>`);
      const before = shape(source);
      const beforeText = source.state.doc.textBetween(0, source.state.doc.content.size, "");

      // Guard against a vacuous pass: if serialization ever stopped producing
      // chips, "identical" would be trivially true for two empty docs.
      expect(before.filter((part) => part.startsWith("expr:")).length).toBe(6);
      expect(before.filter((part) => part.startsWith("variable:")).length).toBe(2);

      // Copy it, paste it into a fresh editor.
      const target = editorWith(extensions as typeof BODY);
      pasteInto(target, clipboardHtml(source));

      expect(shape(target)).toEqual(before);
      expect(target.state.doc.textBetween(0, target.state.doc.content.size, "")).toBe(beforeText);
    });
  }

  it("survives a second round trip, so nothing degrades on repeat", () => {
    const first = editorWith(BODY);
    pasteInto(first, `<p>${FLOAT_SUBJECT}</p>`);

    const second = editorWith(BODY);
    pasteInto(second, clipboardHtml(first));

    const third = editorWith(BODY);
    pasteInto(third, clipboardHtml(second));

    expect(shape(third)).toEqual(shape(first));
  });

  it("keeps a quoted operator byte-identical through the round trip", () => {
    const source = editorWith(BODY);
    pasteInto(source, '<p>{{#if (condition data.count ">" 2)}}x{{/if}}</p>');

    const target = editorWith(BODY);
    pasteInto(target, clipboardHtml(source));

    const raws = shape(target).filter((part) => part.startsWith("expr:"));
    expect(raws[0]).toBe('expr:{{#if (condition data.count ">" 2)}}');
    // The operator must not pick up an entity on the way through.
    expect(raws.join("")).not.toContain("&gt;");
    expect(raws.join("")).not.toContain("&quot;");
  });
});
