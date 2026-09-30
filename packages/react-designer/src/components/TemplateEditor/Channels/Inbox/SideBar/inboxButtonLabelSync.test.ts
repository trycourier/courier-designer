import { ExtensionKit } from "@/components/extensions/extension-kit";
import { updateButtonLabelAndContent } from "@/components/extensions/Button/buttonUtils";
import { convertTiptapToElemental } from "@/lib/utils/convertTiptapToElemental";
import {
  canvasBlockIndexByElement,
  canvasIssuesByBlock,
} from "@/lib/utils/handlebars/canvasIssues";
import { collectTemplateIssues } from "@/lib/utils/handlebars/templateIssues";
import type { ElementalContent } from "@/types";
import { Editor } from "@tiptap/core";
import { describe, expect, it } from "vitest";

/**
 * The real Inbox schema, not a hand-rolled one.
 *
 * The first version of this file built an editor from Document/Paragraph/Text
 * plus the action, which has no `handlebarsExpression` node — so the label path
 * fell back to plain text and the tests passed on a schema Studio never uses.
 */
function inboxEditor(label: string) {
  const editor = new Editor({
    element: document.createElement("div"),
    extensions: ExtensionKit({
      setSelectedNode: () => undefined,
      textMarks: "plain-text",
    } as never),
    content: "<h2>Title</h2><p>X1</p>",
  });

  editor
    .chain()
    .command(({ tr, state }) => {
      tr.insert(
        state.doc.content.size,
        state.schema.nodes.inboxAction.create(
          { label, link: "", actionStyle: "button" },
          label ? state.schema.text(label) : null
        )
      );
      return true;
    })
    .run();

  return editor;
}

const actionAt = (editor: Editor) => {
  let found: { pos: number; label: string; text: string } | undefined;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "inboxAction") {
      found = { pos, label: String(node.attrs.label), text: node.textContent };
    }
  });
  return found;
};

const write = (editor: Editor, pos: number, label: string) =>
  editor
    .chain()
    .command(({ tr, dispatch }) => (dispatch ? updateButtonLabelAndContent(tr, pos, label) : false))
    .run();

const topLevelTypes = (editor: Editor) => editor.state.doc.children.map((node) => node.type.name);

/**
 * The Inbox sidebar writes a button label through `updateButtonLabelAndContent`,
 * which refused any node that was not the EMAIL `button` — so typing a label in
 * the sidebar changed nothing on an Inbox canvas. The two nodes have the same
 * shape: a `label` attribute and inline content.
 */
describe("writing a label into an inbox action", () => {
  it("updates the attribute and the visible content", () => {
    const editor = inboxEditor("Old");
    const before = actionAt(editor)!;

    expect(write(editor, before.pos, "New label")).toBe(true);
    expect(actionAt(editor)).toMatchObject({ label: "New label", text: "New label" });
  });

  it("carries handlebars through unchanged", () => {
    for (const label of ["Hi {{data.s.name}}", "{{#if data.s.t}}A{{/if}}"]) {
      const editor = inboxEditor("Old");
      write(editor, actionAt(editor)!.pos, label);
      expect(actionAt(editor)?.label, label).toBe(label);
    }
  });

  it("still refuses a node that carries no label", () => {
    const editor = inboxEditor("Old");
    expect(write(editor, 0, "x")).toBe(false);
  });
});

/**
 * `inboxAction` used to accept only `(text | variable)`, so an expression node
 * built from the label was not legal inside it. ProseMirror does not fail on
 * that — it fits the node in wherever it IS legal — so every sidebar keystroke
 * after `{{#` left the action untouched and APPENDED a paragraph holding the
 * chip, which then got saved to the draft.
 */
describe("a handlebars label typed in the sidebar", () => {
  it("goes into the action, not into a new paragraph after it", () => {
    const editor = inboxEditor("Geraldo");
    const pos = actionAt(editor)!.pos;
    const shape = topLevelTypes(editor);

    write(editor, pos, "Geraldo {{#if x}}");

    expect(topLevelTypes(editor)).toEqual(shape);
    expect(actionAt(editor)).toMatchObject({
      label: "Geraldo {{#if x}}",
      text: "Geraldo ",
    });
    const chips = actionAt(editor) && editor.state.doc.nodeAt(pos)!.children;
    expect(chips?.map((node) => node.type.name)).toEqual(["text", "handlebarsExpression"]);
  });

  it("leaves nothing behind however many keystrokes it takes", () => {
    const editor = inboxEditor("Geraldo");
    const pos = actionAt(editor)!.pos;
    const shape = topLevelTypes(editor);

    // One write per character, which is what the sidebar does.
    const typed = " {{#if x";
    for (let i = 1; i <= typed.length; i++) {
      write(editor, pos, `Geraldo${typed.slice(0, i)}`);
    }

    expect(topLevelTypes(editor)).toEqual(shape);
    expect(actionAt(editor)?.label).toBe("Geraldo {{#if x");
  });

  it("gets a pill on the action's own block", () => {
    const editor = inboxEditor("Geraldo");
    write(editor, actionAt(editor)!.pos, "Geraldo {{#if x}}");

    const content = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "inbox",
          elements: convertTiptapToElemental(editor.getJSON() as never),
        },
      ],
    } as unknown as ElementalContent;

    const blocks = canvasIssuesByBlock(
      collectTemplateIssues(content),
      "inbox",
      canvasBlockIndexByElement(content, "inbox")
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0].severity).toBe("blocking");
    expect(blocks[0].issues[0].code).toBe("unclosed-block");
    // The action is the third top-level node the canvas draws.
    expect(blocks[0].blockIndex).toBe(topLevelTypes(editor).indexOf("inboxAction"));
  });
});

/**
 * The sidebar reads the `label` ATTRIBUTE. Typing on the canvas only changes the
 * node's inline content, so without a plugin pushing content back into the
 * attribute the sidebar went on showing the label from before the author typed.
 * The email button has had that plugin from the start; the action had none.
 */
describe("typing into the action on the canvas", () => {
  const typeInto = (editor: Editor, pos: number, text: string, offset: number) => {
    editor.view.dispatch(editor.state.tr.insertText(text, pos + 1 + offset));
  };

  it("carries the content back into the label attribute", () => {
    const editor = inboxEditor("Geraldo");
    const pos = actionAt(editor)!.pos;

    typeInto(editor, pos, "Q", 6);

    expect(actionAt(editor)).toMatchObject({ text: "GeraldQo", label: "GeraldQo" });
  });

  it("keeps a chip in the label as handlebars, not as its rendered text", () => {
    const editor = inboxEditor("Geraldo");
    const pos = actionAt(editor)!.pos;
    write(editor, pos, "Hi {{data.name}}");

    typeInto(editor, actionAt(editor)!.pos, "!", 2);

    expect(actionAt(editor)?.label).toBe("Hi! {{data.name}}");
  });
});
