import { test, expect } from "@playwright/test";
import {
  COURIER_AUTH_TOKEN,
  MOD,
  loadDesignerEditor,
  resetEditor,
  saveTemplate,
  publishTemplate,
  sendAndGetRenderedHtml,
} from "./full-cycle-utils";

/**
 * Full-Cycle E2E: Bold markdown rendering
 *
 * Creates a paragraph with bold "Who: " + a {{variable}} via real UI
 * interactions, sends through the Courier backend, and verifies the
 * rendered email preserves the bold formatting.
 */

test.describe("Full Cycle: Designer → Backend → Email Render", () => {
  test.skip(!COURIER_AUTH_TOKEN, "COURIER_AUTH_TOKEN not set – skipping full-cycle test");
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    await loadDesignerEditor(page);
    await resetEditor(page);
  });

  test("create template, send notification, verify rendered email", async ({
    page,
    request,
  }) => {
    const editor = page.locator('[data-testid="email-editor"] .tiptap.ProseMirror[contenteditable="true"]');

    // ─── Step 1: Type bold "Who: " followed by {{variable}} using real UI ─
    console.log('Step 1: Using UI to type bold "Who: " + {{variable}}...');

    await editor.click();
    await page.waitForTimeout(300);

    // Bold on → type "Who: " → bold off
    await page.keyboard.press(`${MOD}+b`);
    await page.waitForTimeout(100);
    await page.keyboard.type("Who: ", { delay: 50 });
    await page.waitForTimeout(200);
    await page.keyboard.press(`${MOD}+b`);
    await page.waitForTimeout(100);

    // Type "{{" to trigger variable chip
    await page.keyboard.type("{{", { delay: 50 });
    await page.waitForTimeout(500);

    const variableChip = editor.locator('.courier-variable-node [role="textbox"][contenteditable="true"]');
    await expect(variableChip).toBeVisible({ timeout: 5000 });
    await variableChip.fill("variable", { force: true });
    await page.waitForTimeout(200);

    // Click outside to confirm variable
    await editor.click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);

    // Verify content
    await expect(editor).toContainText("Who:");
    await expect(editor).toContainText("variable");

    // Verify bold in TipTap document
    const hasBoldInEditor = await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!ed) return false;
      let found = false;
      ed.state.doc.descendants((node: any) => {
        if (node.isText && node.text?.includes("Who:") && node.marks?.some((m: any) => m.type.name === "bold")) {
          found = true;
          return false;
        }
      });
      return found;
    });
    expect(hasBoldInEditor).toBe(true);
    console.log('  ✓ Typed bold "Who: " + {{variable}} via UI');

    // ─── Step 2: Save ───────────────────────────────────────────────
    console.log("Step 2: Saving template...");
    await saveTemplate(page);
    console.log("  ✓ Template saved");

    // ─── Step 3: Publish ────────────────────────────────────────────
    console.log("Step 3: Publishing template...");
    await publishTemplate(page);
    console.log("  ✓ Template published");

    // ─── Step 4: Send and poll for rendered content ──────────────────
    console.log("Step 4: Capturing content and sending...");
    const { emailElements, renderedHtml, messageStatus } =
      await sendAndGetRenderedHtml(page, request);

    console.log(
      `  Email elements (${emailElements.length}): ${JSON.stringify(emailElements).substring(0, 300)}`
    );

    // ─── Step 5: Verify Elemental intermediate format ───────────────
    console.log("Step 5: Verifying Elemental content...");

    const textElement = emailElements.find((el: any) => el.type === "text");
    expect(textElement, "Elemental should contain a text element").toBeTruthy();

    // The converter now produces ElementalTextNodeWithElements (elements array)
    // instead of ElementalTextNodeWithContent (content string).
    // Check that "Who:" appears as a bold string element.
    const elements = textElement.elements as Array<{ type: string; content?: string; bold?: boolean }> | undefined;
    const boldWho = elements?.find(
      (el) => el.type === "string" && el.bold === true && el.content?.includes("Who:")
    );
    expect(
      boldWho,
      `Elemental text elements should contain a bold "Who:" string element, got: ${JSON.stringify(elements)}`
    ).toBeTruthy();
    console.log('  ✓ Elemental contains bold "Who:" element');

    // ─── Step 6: Verify the rendered email ──────────────────────────
    console.log("Step 6: Verifying rendered content...");

    expect(messageStatus).toBeTruthy();
    console.log(`  Final message status: ${messageStatus}`);

    expect(renderedHtml).toContain("Who:");
    console.log('  ✓ Rendered HTML contains "Who:"');

    // Verify "Who:" is bold in the rendered HTML
    const hasBoldWho = renderedHtml!.includes("<strong>Who:") ||
      renderedHtml!.includes("<b>Who:") ||
      renderedHtml!.includes("font-weight:bold") ||
      renderedHtml!.includes("font-weight: bold") ||
      renderedHtml!.includes("font-weight:700") ||
      renderedHtml!.includes("font-weight: 700");
    console.log(`  ${hasBoldWho ? "✓" : "✗"} "Who:" is rendered bold: ${hasBoldWho}`);
    expect(hasBoldWho).toBe(true); // MUST be bold in final render

    console.log("\n✅ Full-cycle test complete!");
  });
});
