import { test, expect } from "@playwright/test";
import { setupMockedTest, mockTemplateDataSamples } from "./template-test-utils";

test.describe("EmailEditor", () => {
  test.beforeEach(async ({ page }) => {
    // Setup with mocked API - no real credentials needed
    await setupMockedTest(page, mockTemplateDataSamples.fullTemplate);

    // Wait for editor to be ready
    const editor = page.locator(".tiptap.ProseMirror").first();
    await expect(editor).toBeVisible({ timeout: 10000 });
    await expect(editor).toHaveAttribute("contenteditable", "true");

    // Clear any existing subject value
    const subjectInput = page.locator('input[placeholder="Write subject..."]');
    if (await subjectInput.isVisible()) {
      await subjectInput.click();
      await page.keyboard.press("Control+a");
      await page.keyboard.press("Delete");
      await subjectInput.fill("");
      await page.keyboard.press("Escape");
    }

    // Ensure the editor is ready for interaction
    await page.waitForTimeout(500);
  });

  test.afterEach(async ({ page }) => {
    // Additional cleanup to ensure no state leaks
    try {
      const subjectInput = page.locator('input[placeholder="Write subject..."]');
      await subjectInput.click();
      await page.keyboard.press("Control+a");
      await page.keyboard.press("Delete");
      await page.waitForTimeout(100);
    } catch (error) {
      // Ignore cleanup errors if page is already closed
    }
  });

  test("should render EmailEditor with basic structure", async ({ page }) => {
    // Check that the editor is visible and editable
    const editor = page.locator(".tiptap.ProseMirror").first();
    await expect(editor).toBeVisible();
    await expect(editor).toHaveAttribute("contenteditable", "true");

    // Check for subject field
    const subjectInput = page.locator('input[placeholder="Write subject..."]');
    await expect(subjectInput).toBeVisible();
    // Note: Don't check for empty value since there might be default content

    // Verify editor is interactive (click works without errors)
    await editor.click();
    await page.waitForTimeout(300);

    // Verify editor remains functional after interaction
    await expect(editor).toBeVisible();
    await expect(editor).toHaveAttribute("contenteditable", "true");
  });

  test("should allow editing the subject line", async ({ page }) => {
    const subjectInput = page.locator('input[placeholder="Write subject..."]');

    // Clear any existing content first
    await subjectInput.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");

    await subjectInput.fill("Test Subject");
    await page.waitForTimeout(300);

    await expect(subjectInput).toHaveValue("Test Subject");
  });

  test("should maintain subject value after losing focus", async ({ page }) => {
    const subjectInput = page.locator('input[placeholder="Write subject..."]');
    const editor = page.locator(".tiptap.ProseMirror").first();

    // Clear any existing content first
    await subjectInput.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");

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

    // Clear any existing content
    await subjectInput.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");

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

    // Clear any existing content
    await subjectInput.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");

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
