import { describe, it, expect, vi, afterEach } from "vitest";
import { Editor } from "@tiptap/react";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { TextStyle } from "@tiptap/extension-text-style";
import { NodeSelection } from "prosemirror-state";
import { Button } from "@/components/extensions/Button/Button";
import { VariableNode } from "@/components/extensions/Variable/Variable";
import { Color } from "@/components/extensions/Color/Color";
import { isBrandColorRef } from "@/lib/utils/brandColors";
import type { ChannelType } from "@/store";

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

function createShouldShow(channel: ChannelType = "email") {
  return ({ editor }: { editor: Editor }) => {
    const { selection } = editor.state;
    if (selection instanceof NodeSelection && selection.node.type.name === "variable") {
      if (channel !== "email") {
        const $pos = selection.$from;
        for (let d = $pos.depth; d >= 0; d--) {
          if ($pos.node(d).type.name === "button") {
            return false;
          }
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

function createButtonEditor(): Editor {
  return new Editor({
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
}

function selectVariable(editor: Editor): void {
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
}

describe("useTextmenuStates shouldShow logic", () => {
  let editor: Editor;

  afterEach(() => {
    editor?.destroy();
  });

  it("should return false when variable is inside a button in Slack", () => {
    editor = createButtonEditor();
    selectVariable(editor);

    const shouldShow = createShouldShow("slack");
    expect(shouldShow({ editor })).toBe(false);
  });

  it("should return true when variable is inside a button in Email", () => {
    editor = createButtonEditor();
    selectVariable(editor);

    const shouldShow = createShouldShow("email");
    expect(shouldShow({ editor })).toBe(true);
  });

  it("should return true when variable is inside a paragraph regardless of channel", () => {
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

    selectVariable(editor);

    expect(createShouldShow("email")({ editor })).toBe(true);
    expect(createShouldShow("slack")({ editor })).toBe(true);
  });
});

describe("currentColor detection logic", () => {
  let editor: Editor;

  afterEach(() => {
    editor?.destroy();
  });

  function extractCurrentColor(ed: Editor): string | undefined {
    const { from, to } = ed.state.selection;
    let color: string | undefined;
    ed.state.doc.nodesBetween(from, to, (node) => {
      if (color || !node.isInline) return;
      const mark = node.marks?.find((m) => m.type.name === "textStyle");
      const c = mark?.attrs?.color as string | undefined;
      if (c && (/^#[0-9a-fA-F]{3,8}$/.test(c) || isBrandColorRef(c))) {
        color = c;
      }
    });
    return color;
  }

  it("should detect hex color from textStyle mark", () => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text, TextStyle, Color],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "red text",
                marks: [{ type: "textStyle", attrs: { color: "#ff0000" } }],
              },
            ],
          },
        ],
      },
    });

    editor.commands.selectAll();
    expect(extractCurrentColor(editor)).toBe("#ff0000");
  });

  it("should detect brand color ref from textStyle mark", () => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text, TextStyle, Color],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "brand text",
                marks: [
                  { type: "textStyle", attrs: { color: "{brand.colors.primary}" } },
                ],
              },
            ],
          },
        ],
      },
    });

    editor.commands.selectAll();
    expect(extractCurrentColor(editor)).toBe("{brand.colors.primary}");
  });

  it("should return undefined for text without color mark", () => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text, TextStyle, Color],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "plain text" }],
          },
        ],
      },
    });

    editor.commands.selectAll();
    expect(extractCurrentColor(editor)).toBeUndefined();
  });

  it("should return undefined for invalid color strings", () => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text, TextStyle, Color],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "bad color",
                marks: [{ type: "textStyle", attrs: { color: "not-a-color" } }],
              },
            ],
          },
        ],
      },
    });

    editor.commands.selectAll();
    expect(extractCurrentColor(editor)).toBeUndefined();
  });
});
