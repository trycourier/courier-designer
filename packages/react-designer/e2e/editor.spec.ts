import { test, expect } from "@playwright/test";

// Force serial execution to prevent state contamination
test.describe.configure({ mode: "serial" });

test.describe("Editor", () => {
  test("should load the editor", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Wait for the editor to be visible and fully loaded
    const editor = await page.locator(".tiptap.ProseMirror").first();
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Wait for the editor to be available in the window object
    await page.waitForFunction(() => (window as any).editor !== null, { timeout: 10000 });

    // Use TipTap's commands to clear and set content reliably
    await page.evaluate(() => {
      if ((window as any).editor) {
        const editor = (window as any).editor;
        // Clear content and insert text using TipTap commands
        editor.commands.clearContent();
        editor.commands.insertContent("Hello, Playwright!");
      }
    });

    // Give TipTap some time to process the content
    await page.waitForTimeout(500);

    // Verify the content was added properly
    await expect(editor).toHaveText("Hello, Playwright!", { timeout: 10000 });
  });
});
