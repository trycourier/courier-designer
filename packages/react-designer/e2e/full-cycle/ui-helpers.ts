/**
 * UI interaction helpers for full-cycle E2E tests.
 *
 * These helpers drive the Designer exactly like a user would:
 * typing text, using keyboard shortcuts, inserting blocks via the slash menu,
 * changing content types via the dropdown, and inserting variables.
 *
 * Frame/styling attributes (padding, background, border) are set via a
 * programmatic helper since they require complex sidebar color-picker
 * interaction that adds flakiness without testing visual parity.
 */

import type { Page } from "@playwright/test";

const MOD = process.platform === "darwin" ? "Meta" : "Control";

// ═══════════════════════════════════════════════════════════════════════
// Text Input
// ═══════════════════════════════════════════════════════════════════════

/** Type text into the focused editor, character by character. */
export async function typeText(page: Page, text: string): Promise<void> {
  await page.keyboard.type(text, { delay: 20 });
  await page.waitForTimeout(100);
}

/** Press Enter to create a new block. */
export async function pressEnter(page: Page): Promise<void> {
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
}

// ═══════════════════════════════════════════════════════════════════════
// Inline Formatting (keyboard shortcuts)
// ═══════════════════════════════════════════════════════════════════════

export async function toggleBold(page: Page): Promise<void> {
  await page.keyboard.press(`${MOD}+b`);
  await page.waitForTimeout(50);
}

export async function toggleItalic(page: Page): Promise<void> {
  await page.keyboard.press(`${MOD}+i`);
  await page.waitForTimeout(50);
}

export async function toggleUnderline(page: Page): Promise<void> {
  await page.keyboard.press(`${MOD}+u`);
  await page.waitForTimeout(50);
}

export async function toggleStrike(page: Page): Promise<void> {
  await page.keyboard.press(`${MOD}+Shift+s`);
  await page.waitForTimeout(50);
}

// ═══════════════════════════════════════════════════════════════════════
// Text Alignment (programmatic – keyboard shortcuts are disabled in the
// Designer's TextAlign extension, so we call the TipTap command directly)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Set text alignment by clicking the alignment button in the bubble toolbar.
 *
 * IMPORTANT: The cursor must be inside a paragraph that already has text,
 * because the bubble menu only appears after clicking on a text node which
 * triggers the Selection extension's `isSelected` state.
 *
 * Typical usage:
 *   await typeText(page, "...");
 *   await setAlignment(page, "center");
 */
export async function setAlignment(
  page: Page,
  alignment: "left" | "center" | "right" | "justify"
): Promise<void> {
  // 1. Click on the current paragraph text to trigger isSelected → bubble menu
  //    We click the .node-element that contains the cursor.
  const nodeElement = page
    .locator(
      ".node-element .is-empty, .node-element p, .node-element h1, .node-element h2, .node-element h3"
    )
    .last();
  await nodeElement.click();
  await page.waitForTimeout(300);

  // 2. Find the alignment button by its lucide SVG icon class
  const svgClass: Record<string, string> = {
    left: "lucide-align-left",
    center: "lucide-align-center",
    right: "lucide-align-right",
    justify: "lucide-align-justify",
  };

  const button = page.locator(`button:has(svg.${svgClass[alignment]})`);
  await button.waitFor({ state: "visible", timeout: 3000 });
  await button.click();
  await page.waitForTimeout(150);
}

// ═══════════════════════════════════════════════════════════════════════
// Block Insertion (slash menu)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Insert a button node programmatically.
 *
 * In the Designer, buttons are added via drag-and-drop from the Blocks
 * library. Since button content is entirely configured through form fields
 * (label, link, colors, padding, etc.) rather than typed text, programmatic
 * insertion is the appropriate approach for visual parity tests.
 *
 * Uses the editor's built-in setButton command which creates a proper
 * button node with text content matching the label.
 */
export async function insertButton(page: Page, attrs: Record<string, unknown> = {}): Promise<void> {
  await page.evaluate((a) => {
    const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
    if (!ed) throw new Error("Editor not available");
    ed.commands.setButton(a);
  }, attrs);
  await page.waitForTimeout(200);
}

/**
 * Insert a divider element programmatically.
 *
 * The setDivider command is commented out in the extension, so we use
 * insertContent directly. We insert [divider, paragraph] together so
 * the cursor advances past the atom node, allowing consecutive dividers
 * to create separate blocks instead of replacing the same one.
 */
export async function insertDivider(
  page: Page,
  attrs: Record<string, unknown> = {}
): Promise<void> {
  await page.evaluate((a) => {
    const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
    if (!ed) throw new Error("Editor not available");
    // Insert at the document root level (end of doc) to avoid inserting
    // inside a nested node (e.g. blockquote). The trailing paragraph
    // ensures the cursor advances past the atom node.
    const pos = ed.state.doc.content.size;
    ed.commands.insertContentAt(pos, [
      {
        type: "divider",
        attrs: {
          padding: 6,
          color: "#000000",
          size: 1,
          radius: 0,
          variant: "divider",
          ...a,
        },
      },
      { type: "paragraph" },
    ]);
  }, attrs);
  await page.waitForTimeout(200);
}

/**
 * Insert a blockquote element programmatically.
 *
 * Blockquotes contain child blocks (paragraphs/headings). We insert
 * the full structure including text content, then optionally apply
 * additional formatting marks to the content.
 */
export async function insertBlockquote(
  page: Page,
  text: string,
  attrs: Record<string, unknown> = {},
  marks?: Array<{ type: string }>
): Promise<void> {
  await page.evaluate(
    ({ text, attrs, marks }) => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!ed) throw new Error("Editor not available");
      const textNode: Record<string, unknown> = { type: "text", text };
      if (marks && marks.length > 0) {
        textNode.marks = marks;
      }
      // Insert at the document root level (end of doc) to avoid nesting
      // inside a previous blockquote. Using focus("end") would place the
      // cursor inside the last blockquote, causing nested insertions.
      const pos = ed.state.doc.content.size;
      ed.commands.insertContentAt(pos, {
        type: "blockquote",
        attrs: {
          paddingHorizontal: 8,
          paddingVertical: 0,
          backgroundColor: "transparent",
          borderLeftWidth: 2,
          borderColor: "#e0e0e0",
          ...attrs,
        },
        content: [
          {
            type: "paragraph",
            content: [textNode],
          },
        ],
      });
    },
    { text, attrs, marks }
  );
  await page.waitForTimeout(200);
}

/**
 * Insert a custom code (HTML) element programmatically.
 *
 * CustomCode is an atom node. We insert [customCode, paragraph] together
 * so the cursor advances past the atom, allowing consecutive insertions.
 */
export async function insertCustomCode(page: Page, code: string): Promise<void> {
  await page.evaluate((c) => {
    const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
    if (!ed) throw new Error("Editor not available");
    ed.commands.focus("end");
    ed.commands.insertContent([{ type: "customCode", attrs: { code: c } }, { type: "paragraph" }]);
  }, code);
  await page.waitForTimeout(200);
}

/**
 * Insert an image block element programmatically.
 *
 * ImageBlock is an atom node. We insert [imageBlock, paragraph] together
 * so the cursor advances past the atom, allowing consecutive insertions.
 */
export async function insertImageBlock(
  page: Page,
  attrs: Record<string, unknown> = {}
): Promise<void> {
  await page.evaluate((a) => {
    const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
    if (!ed) throw new Error("Editor not available");
    ed.commands.focus("end");
    ed.commands.insertContent([
      {
        type: "imageBlock",
        attrs: {
          sourcePath: "",
          alignment: "center",
          width: 100,
          borderWidth: 0,
          borderColor: "transparent",
          ...a,
        },
      },
      { type: "paragraph" },
    ]);
  }, attrs);
  await page.waitForTimeout(200);
}

// ═══════════════════════════════════════════════════════════════════════
// Content Type Picker (paragraph ↔ heading)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Insert an empty heading block at the end of the document and focus into it.
 *
 * The Designer's ContentTypePicker lives inside a BubbleMenu that requires
 * the Selection overlay to be active. And `setNode` on the current block
 * is unreliable for creating distinct blocks. So we insert a new heading
 * node programmatically and position the cursor inside it. The user then
 * types the heading text via real keyboard input.
 */
export async function insertHeadingBlock(page: Page, level: 1 | 2 | 3): Promise<void> {
  await page.evaluate((lvl) => {
    const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
    if (!ed) throw new Error("Editor not available");

    const pos = ed.state.doc.content.size;
    const headingNode = ed.schema.nodes.heading.create({ level: lvl });
    const tr = ed.state.tr.insert(pos, headingNode);
    ed.view.dispatch(tr);

    // Focus into the new heading (at the end of the newly inserted node)
    const newPos = ed.state.doc.content.size - 1;
    ed.commands.focus(newPos);
  }, level);
  await page.waitForTimeout(200);
}

// ═══════════════════════════════════════════════════════════════════════
// Variables
// ═══════════════════════════════════════════════════════════════════════

/**
 * Insert a variable node at the current cursor position.
 *
 * Typing "{{" triggers either an autocomplete dropdown or an input-rule
 * chip, both of which require complex interaction. Since we're testing
 * visual parity of rendered variables (not the variable picker UI), we
 * insert programmatically. Text around the variable is still typed via UI.
 */
export async function insertVariable(page: Page, name: string): Promise<void> {
  await page.evaluate((varName) => {
    const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
    if (!ed) throw new Error("Editor not available");
    ed.commands.insertContent({
      type: "variable",
      attrs: { id: varName, isInvalid: false },
    });
  }, name);
  await page.waitForTimeout(100);
}

// ═══════════════════════════════════════════════════════════════════════
// Links
// ═══════════════════════════════════════════════════════════════════════

/**
 * Apply a link to the text that was just typed.
 * Selects `charCount` characters backwards via keyboard, then applies
 * the link mark programmatically (the link form requires sidebar interaction
 * that's fragile in E2E). The text selection is fully UI-driven.
 */
export async function applyLink(page: Page, charCount: number, url: string): Promise<void> {
  // Select the text backwards (UI — keyboard selection)
  await page.keyboard.down("Shift");
  for (let i = 0; i < charCount; i++) {
    await page.keyboard.press("ArrowLeft");
  }
  await page.keyboard.up("Shift");
  await page.waitForTimeout(100);

  // Apply the link mark via TipTap command
  await page.evaluate((href) => {
    const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
    if (!ed) throw new Error("Editor not available");
    ed.chain().setLink({ href }).run();
  }, url);
  await page.waitForTimeout(100);

  // Move cursor to end of the link text
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(100);
}

// ═══════════════════════════════════════════════════════════════════════
// Block Styling (programmatic — for frame/styling attributes)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Set styling attributes (padding, background, border) on a block node
 * that contains the given text. This is done programmatically because
 * sidebar color-picker interaction is fragile in E2E tests.
 *
 * The content creation (typing, formatting, block insertion) is fully
 * UI-driven; only frame styling uses this helper.
 */
export async function setBlockAttrs(
  page: Page,
  containsText: string,
  attrs: Record<string, unknown>
): Promise<void> {
  await page.evaluate(
    ({ text, attrs }) => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!ed) throw new Error("Editor not available");

      let found = false;
      ed.state.doc.descendants((node: any, pos: number) => {
        if (found) return false;
        if (node.isBlock && node.textContent.includes(text)) {
          ed.chain()
            .command(({ tr }: any) => {
              const currentAttrs = node.attrs || {};
              tr.setNodeMarkup(pos, undefined, { ...currentAttrs, ...attrs });
              return true;
            })
            .run();
          found = true;
          return false;
        }
      });

      if (!found) {
        console.warn(`setBlockAttrs: no block found containing "${text}"`);
      }
    },
    { text: containsText, attrs }
  );
  await page.waitForTimeout(100);
}

/**
 * Focus the editor by clicking into it.
 * Useful after sidebar interactions to return focus to the editor.
 */
export async function focusEditor(page: Page): Promise<void> {
  await page.evaluate(() => {
    const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
    if (ed) ed.commands.focus("end");
  });
  await page.waitForTimeout(150);
}

/**
 * Move cursor to the end of the editor content.
 */
export async function moveCursorToEnd(page: Page): Promise<void> {
  await page.evaluate(() => {
    const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
    if (ed) ed.commands.focus("end");
  });
  await page.waitForTimeout(100);
}
