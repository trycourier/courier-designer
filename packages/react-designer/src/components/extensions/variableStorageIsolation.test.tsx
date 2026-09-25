import { Editor } from "@tiptap/core";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { render, waitFor } from "@testing-library/react";
import type { Editor as TiptapEditor } from "@tiptap/core";
import React from "react";
import { describe, expect, it } from "vitest";
import { TranslationEditor } from "@/components/TranslationEditor/TranslationEditor";
import { VariableNode } from "./Variable";
import { getVariableViewMode, setVariableViewMode } from "./Variable/variable-storage.utils";
import { ExtensionKit } from "./extension-kit";

/**
 * TipTap shares an extension's storage across every editor built from the same
 * extension instance. The variable view mode lives there, so Preview & Test
 * leaving a tab in `wysiwyg` put every other editor in the tab into preview
 * too — the /localize cells then drew their expressions as nothing, and a
 * Backspace at the end of a cell silently deleted an invisible `{{/if}}`,
 * leaving an unclosed block that blocks the send.
 */
const editorOf = (container: HTMLElement) =>
  (container.querySelector(".ProseMirror") as HTMLElement & { editor?: TiptapEditor }).editor;

describe("view mode does not leak between editors", () => {
  it("leaves a translation cell in show-variables whatever another editor did", async () => {
    // Another editor in the tab, in preview — what Preview & Test leaves behind.
    const preview = new Editor({
      element: document.createElement("div"),
      extensions: [Document, Paragraph, Text, VariableNode],
    });
    setVariableViewMode(preview, "wysiwyg");

    const { container } = render(
      <TranslationEditor value={'Bonjour {{data.name}} {{#if data.vip}}VIP{{/if}}'} />
    );
    await waitFor(() => expect(editorOf(container)).toBeDefined());

    expect(getVariableViewMode(editorOf(container))).toBe("show-variables");
    // And it draws them, rather than rendering nothing where they are.
    expect(container.querySelectorAll("[data-handlebars-kind], [data-id]").length).toBeGreaterThan(
      0
    );
  });

  it("keeps two canvas editors independent", () => {
    const one = new Editor({ element: document.createElement("div"), extensions: ExtensionKit({}) });
    const two = new Editor({ element: document.createElement("div"), extensions: ExtensionKit({}) });

    setVariableViewMode(one, "wysiwyg");

    expect(getVariableViewMode(one)).toBe("wysiwyg");
    expect(getVariableViewMode(two)).toBe("show-variables");
  });
});
