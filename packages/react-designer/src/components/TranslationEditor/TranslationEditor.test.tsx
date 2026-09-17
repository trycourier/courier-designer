import type { ElementalTextContentNode } from "@/types/elemental.types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
