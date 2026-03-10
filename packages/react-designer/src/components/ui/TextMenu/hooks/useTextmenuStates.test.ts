import { describe, it, expect, vi, afterEach } from "vitest";
import { Editor } from "@tiptap/react";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { NodeSelection } from "prosemirror-state";
import { Button } from "@/components/extensions/Button/Button";
import { VariableNode } from "@/components/extensions/Variable/Variable";

vi.mock("@/components/extensions/Button/ButtonComponent", () => ({
  ButtonComponentNode: () => null,
}));

vi.mock("@/components/extensions/Variable/VariableView", () => ({
  VariableView: () => null,
}));

vi.mock("@/components/utils", () => ({
  generateNodeIds: vi.fn(),
}));

vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid"),
}));

function createShouldShow() {
  return ({ editor }: { editor: Editor }) => {
    const { selection } = editor.state;
    if (selection instanceof NodeSelection && selection.node.type.name === "variable") {
      const $pos = selection.$from;
      for (let d = $pos.depth; d >= 0; d--) {
        if ($pos.node(d).type.name === "button") {
          return false;
        }
      }
      return true;
    }

    const elements = ["paragraph", "heading", "blockquote"];
    const { $head } = selection;
    const selectedNode = $head.node();

    if (elements.includes(selectedNode.type.name) && selectedNode.attrs.isSelected) {
      return true;
    }

    return false;
  };
}

describe("useTextmenuStates shouldShow logic", () => {
  let editor: Editor;

  afterEach(() => {
    editor?.destroy();
  });

  it("should return false when variable is inside a button", () => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text, VariableNode, Button],
      content: {
        type: "doc",
        content: [
          {
            type: "button",
            attrs: { label: "{{test}}", link: "https://example.com" },
            content: [{ type: "variable", attrs: { id: "test", isInvalid: false } }],
          },
        ],
      },
    });

    let variablePos = -1;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "variable") {
        variablePos = pos;
        return false;
      }
      return true;
    });

    expect(variablePos).toBeGreaterThan(-1);

    const tr = editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, variablePos));
    editor.view.dispatch(tr);

    const shouldShow = createShouldShow();
    expect(shouldShow({ editor })).toBe(false);
  });

  it("should return true when variable is inside a paragraph", () => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text, VariableNode, Button],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Hello " },
              { type: "variable", attrs: { id: "name", isInvalid: false } },
            ],
          },
        ],
      },
    });

    let variablePos = -1;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "variable") {
        variablePos = pos;
        return false;
      }
      return true;
    });

    expect(variablePos).toBeGreaterThan(-1);

    const tr = editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, variablePos));
    editor.view.dispatch(tr);

    const shouldShow = createShouldShow();
    expect(shouldShow({ editor })).toBe(true);
  });
});
