import type { ElementalTextContentNode } from "@/types/elemental.types";
import type { Editor } from "@tiptap/core";
import { undoDepth } from "@tiptap/pm/history";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getTranslationToolbarConfig } from "./getTranslationToolbarConfig";
import { TranslationEditor } from "./TranslationEditor";

/**
 * A heading whose toolbar hides bold still has to RENDER bold content that is
 * already in the template. Hiding a button must not remove the mark from the
 * schema: ProseMirror throws on an unknown mark, TipTap swallows it and
 * substitutes an empty document, and the i18n cell silently goes blank — which
 * then gets committed back over the real content on the next translate.
 */
const boldRun: ElementalTextContentNode[] = [
  { type: "string", content: "Heading with a " },
  { type: "string", content: "bold run", bold: true },
];

const renderCell = (textStyle: string, elements: ElementalTextContentNode[]) =>
  render(
    <TranslationEditor
      elements={elements}
      toolbarConfig={getTranslationToolbarConfig("email", "text", textStyle)}
    />
  );

describe("TranslationEditor", () => {
  it("renders bold content inside a heading, whose toolbar hides bold", () => {
    renderCell("h1", boldRun);
    expect(screen.getByText(/Heading with a/)).toBeInTheDocument();
    expect(screen.getByText("bold run")).toBeInTheDocument();
  });

  it("renders bold content inside body text, whose toolbar keeps bold", () => {
    renderCell("text", boldRun);
    expect(screen.getByText(/Heading with a/)).toBeInTheDocument();
    expect(screen.getByText("bold run")).toBeInTheDocument();
  });

  it("renders marked-up content on a channel with no toolbar at all", () => {
    // sms/push/inbox and raw/meta/action get `false` — every mark drops out.
    render(
      <TranslationEditor
        elements={[
          { type: "string", content: "plain " },
          { type: "string", content: "bold", bold: true },
          { type: "link", content: "a link", href: "https://example.com" },
        ]}
        toolbarConfig={getTranslationToolbarConfig("inbox", "text", "text")}
      />
    );
    expect(screen.getByText(/plain/)).toBeInTheDocument();
    expect(screen.getByText("bold")).toBeInTheDocument();
    expect(screen.getByText("a link")).toBeInTheDocument();
  });
});

// /localize saved the template on open: helpers loaded as variable chips, the
// chips flagged themselves invalid, and that attribute change was a doc update.
describe("TranslationEditor with handlebars helpers", () => {
  const helperText = 'Hi {{default data.name "friend"}}, {{#if data.vip}}VIP{{else}}std{{/if}}';

  const editorOf = (container: HTMLElement) =>
    (container.querySelector(".ProseMirror") as HTMLElement & { editor?: Editor }).editor;

  it.each([
    ["value", { value: helperText }],
    [
      "elements",
      { elements: [{ type: "string", content: helperText }] as ElementalTextContentNode[] },
    ],
  ])("loads helpers from %s as expression chips without changing the doc", async (_, props) => {
    const { container } = render(<TranslationEditor {...props} />);
    await waitFor(() => expect(editorOf(container)).toBeDefined());
    await new Promise((r) => setTimeout(r, 50));

    const editor = editorOf(container)!;
    const types: string[] = [];
    editor.state.doc.descendants((n) => {
      if (n.isInline && !n.isText) types.push(n.type.name);
    });
    expect(types).toEqual(Array(4).fill("handlebarsExpression"));
    expect(container.querySelector(".courier-variable-chip-invalid")).toBeNull();
    expect(undoDepth(editor.state)).toBe(0);
  });

  it("emits helpers verbatim when the author edits the text", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <TranslationEditor value={helperText} onChange={onChange} toolbarConfig={false} />
    );
    await waitFor(() => expect(editorOf(container)).toBeDefined());
    editorOf(container)!.commands.insertContentAt(1, "X");
    expect(onChange).toHaveBeenLastCalledWith(`X${helperText}`);
  });
});
