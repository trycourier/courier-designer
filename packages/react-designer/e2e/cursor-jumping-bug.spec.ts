import { test, expect, resetEditorState } from "./test-utils";

test.describe("Cursor Jumping Bug Fix - Email Editor", () => {
  test.beforeEach(async ({ page }) => {
    await resetEditorState(page);
  });

  test("should maintain cursor position in heading while typing during auto-save", async ({
    page,
  }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await expect(editor).toBeVisible();

    // Use force click to bypass any overlays
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Create a heading using the reliable pattern from existing tests
    await page.keyboard.type("Test Header");

    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.chain().focus().setNode("heading", { level: 1 }).run();
      }
    });

    await page.waitForTimeout(300);

    // Verify heading was created
    const heading = editor.locator("h1").first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText("Test Header");

    // Position cursor at END of header (where the cursor jumping bug occurs)
    await heading.click({ force: true });
    await page.keyboard.press("End");
    await page.waitForTimeout(200);

    // Store initial text content
    const initialText = await heading.textContent();

    // Type additional text with pauses to trigger auto-save operations
    // This is where the bug would cause cursor to jump out of the heading
    await page.keyboard.type(" - Additional");
    await page.waitForTimeout(500); // Allow auto-save debounce to trigger

    await page.keyboard.type(" Text");
    await page.waitForTimeout(500); // Allow another auto-save cycle

    // CRITICAL TEST: Verify all text went to the heading
    const finalText = await heading.textContent();
    expect(finalText).toBe("Test Header - Additional Text");

    // If the cursor jumping bug existed, the additional text would either:
    // 1. Not appear in the heading
    // 2. Appear in a different element
    // 3. Cause a TipTap selection error

    // Verify we can still type in the heading (cursor is still properly positioned)
    await page.keyboard.type(" More");
    await page.waitForTimeout(300);

    const finalFinalText = await heading.textContent();
    expect(finalFinalText).toBe("Test Header - Additional Text More");
  });

  test("should not cause TipTap selection errors during rapid typing in headings", async ({
    page,
  }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Create heading
    await page.keyboard.type("Header");
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.chain().focus().setNode("heading", { level: 1 }).run();
      }
    });

    const heading = editor.locator("h1").first();
    await expect(heading).toContainText("Header");

    // Position at end and type rapidly (no delays to stress-test)
    await heading.click({ force: true });
    await page.keyboard.press("End");

    // Rapid typing that would trigger the TipTap selection error before our fix
    await page.keyboard.type(" Rapid", { delay: 0 });
    await page.keyboard.type(" Typing", { delay: 0 });
    await page.keyboard.type(" Test", { delay: 0 });

    // Allow processing time
    await page.waitForTimeout(1000);

    // Verify text appears correctly (if bug existed, this would fail)
    const finalText = await heading.textContent();
    expect(finalText).toBe("Header Rapid Typing Test");

    // Check no console errors occurred (TipTap selection errors would show in console)
    const consoleErrors = await page.evaluate(() => {
      return (window as any).testConsoleErrors || [];
    });

    // Filter for TipTap-related errors
    const tiptapErrors = consoleErrors.filter(
      (error: string) => error.includes("TextSelection") || error.includes("endpoint not pointing")
    );

    expect(tiptapErrors).toHaveLength(0);
  });
});
