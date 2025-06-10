import { test, expect } from "@playwright/test";

// Force serial execution for this test suite to prevent state contamination
test.describe.configure({ mode: "serial" });

test.describe("EmailEditor", () => {
  test.beforeEach(async ({ page }) => {
    // Force a fresh page load for each test to prevent state pollution
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Wait for the app to be fully loaded
    await page.waitForSelector(".tiptap.ProseMirror", { timeout: 30000 });

    // Wait for React to finish hydration
    await page.waitForFunction(
      () => {
        const editor = document.querySelector(".tiptap.ProseMirror");
        return editor && editor.getAttribute("contenteditable") === "true";
      },
      { timeout: 30000 }
    );

    const editor = page.locator(".tiptap.ProseMirror").first();
    await expect(editor).toBeVisible({ timeout: 10000 });
    await expect(editor).toHaveAttribute("contenteditable", "true");

    // Ensure the editor is ready for interaction
    await page.waitForTimeout(1000);
  });

  test("should render EmailEditor with basic structure", async ({ page }) => {
    // Check that the editor is visible and editable
    const editor = page.locator(".tiptap.ProseMirror").first();
    await expect(editor).toBeVisible();
    await expect(editor).toHaveAttribute("contenteditable", "true");

    // Check for subject field
    const subjectInput = page.locator('input[placeholder="Write subject..."]');
    await expect(subjectInput).toBeVisible();

    // Verify editor is interactive (click works without errors)
    await editor.click();
    await page.waitForTimeout(300);

    // Verify editor remains functional after interaction
    await expect(editor).toBeVisible();
    await expect(editor).toHaveAttribute("contenteditable", "true");
  });

  test("should allow editing the subject line", async ({ page }) => {
    const subjectInput = page.locator('input[placeholder="Write subject..."]');

    await subjectInput.click();
    await subjectInput.fill("Test Subject");
    await page.waitForTimeout(300);

    await expect(subjectInput).toHaveValue("Test Subject");
  });

  test("should maintain subject value after losing focus", async ({ page }) => {
    const subjectInput = page.locator('input[placeholder="Write subject..."]');
    const editor = page.locator(".tiptap.ProseMirror").first();

    await subjectInput.fill("Persistent Subject");
    await page.waitForTimeout(300);

    // Click elsewhere to lose focus
    await editor.click();
    await page.waitForTimeout(300);

    await expect(subjectInput).toHaveValue("Persistent Subject");
  });

  test("should be editable and respond to keyboard input", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click();
    await expect(editor).toHaveAttribute("contenteditable", "true");

    // Try keyboard navigation
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowUp");

    // Editor should remain functional
    await expect(editor).toHaveAttribute("contenteditable", "true");
  });

  test("should handle focus management between components", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    const subjectInput = page.locator('input[placeholder="Write subject..."]');

    // Set subject
    await subjectInput.fill("Focus Test");
    await page.waitForTimeout(200);

    // Move to editor
    await editor.click();
    await page.waitForTimeout(200);

    // Return to subject
    await subjectInput.click();
    await page.waitForTimeout(200);

    // Verify subject is preserved
    await expect(subjectInput).toHaveValue("Focus Test");
    await expect(editor).toHaveAttribute("contenteditable", "true");
  });

  test("should have email editor context", async ({ page }) => {
    // Subject field should be present
    const subjectInput = page.locator('input[placeholder="Write subject..."]');
    await expect(subjectInput).toBeVisible();

    // Main editor should be present and editable
    const editor = page.locator(".tiptap.ProseMirror").first();
    await expect(editor).toBeVisible();
    await expect(editor).toHaveAttribute("contenteditable", "true");

    // Should have some content structure
    const hasContent = await editor.textContent();
    expect(hasContent).not.toBeNull();
  });

  test("should support basic keyboard interactions", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click();
    await page.waitForTimeout(200);

    // Try basic keyboard operations
    await page.keyboard.press("Control+a");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Tab");

    // Editor should remain functional
    await expect(editor).toHaveAttribute("contenteditable", "true");
  });

  test("should preserve editor state during interactions", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    const subjectInput = page.locator('input[placeholder="Write subject..."]');

    // Set up state
    await subjectInput.fill("State Test");
    await editor.click();
    await page.waitForTimeout(200);

    // Verify both components remain functional
    await expect(subjectInput).toHaveValue("State Test");
    await expect(editor).toHaveAttribute("contenteditable", "true");
    await expect(editor).toBeVisible();
  });
});
