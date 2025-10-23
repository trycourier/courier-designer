import { setupMockedTest, mockTemplateDataSamples } from "./template-test-utils";
import { test, expect } from "@playwright/test";

// Force serial execution to prevent state contamination
test.describe.configure({ mode: "serial" });

test.describe("Editor", () => {
  test.beforeEach(async ({ page }) => {
    await setupMockedTest(page, mockTemplateDataSamples.emptyTemplate);
  });

  test("should load the editor", async ({ page }) => {
    await page.waitForTimeout(500);

    // Wait for the editor to be visible and fully loaded
    const editor = await page.locator(".tiptap.ProseMirror").first();
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Wait for the editor to be available in the window object
    await page.waitForFunction(() => (window as any).__COURIER_CREATE_TEST__?.currentEditor !== null, { timeout: 10000 });

    // Use TipTap's commands to clear and set content reliably
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
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
