import { test, expect } from "@playwright/test";

test.describe("Editor", () => {
  test("should load the editor", async ({ page }) => {
    await page.goto("/");

    // Wait for the editor to be visible
    const editor = await page.locator(".tiptap.ProseMirror").first();
    await expect(editor).toBeVisible();

    // Clear the editor and type some text
    await editor.click();
    await editor.evaluate((element: HTMLElement) => {
      element.innerHTML = "";
    });
    await page.keyboard.type("Hello, Playwright!");

    // Wait for the content to be updated and verify
    await expect(editor).toHaveText("Hello, Playwright!", { timeout: 10000 });
  });
});
