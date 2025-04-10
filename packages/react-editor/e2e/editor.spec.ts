import { test, expect } from "@playwright/test";

test.describe("Editor", () => {
  test("should load the editor", async ({ page }) => {
    await page.goto("/");

    // Wait for the editor to be visible and fully loaded
    const editor = await page.locator(".tiptap.ProseMirror").first();
    await expect(editor).toBeVisible();

    // Focus the editor and clear it
    await editor.click();
    await editor.focus();

    // Use a more reliable way to clear and set content in TipTap
    await page.evaluate(() => {
      const editorElement = document.querySelector(".tiptap.ProseMirror");
      if (editorElement) {
        // Clear the editor using innerHTML
        editorElement.innerHTML = "<p></p>";
        // Dispatch an input event to ensure TipTap recognizes the change
        editorElement.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    // Type directly into the editor with a short pause to ensure TipTap processes each keystroke
    await editor.click();
    await page.keyboard.type("Hello, Playwright!", { delay: 50 });

    // Give TipTap some time to process the input before checking
    await page.waitForTimeout(500);

    // Verify the content was added properly
    await expect(editor).toHaveText("Hello, Playwright!", { timeout: 10000 });
  });
});
