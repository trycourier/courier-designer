import { test, expect } from "@playwright/test";
import { setupMockedTest, mockTemplateDataSamples } from "./template-test-utils";
import { MAIN_EDITOR_SELECTOR } from "./test-utils";

// The subject field is now a VariableInput (TipTap editor), not a regular input
// We need to find it by the label and then get the TipTap editor inside
const SUBJECT_EDITOR_SELECTOR = '.tiptap.ProseMirror:not([data-testid="email-editor"] .tiptap.ProseMirror)';

async function getSubjectEditor(page: import("@playwright/test").Page) {
  // Find the subject container by looking for the "Subject:" label
  const subjectLabel = page.locator('h4:has-text("Subject:")');
  const subjectContainer = subjectLabel.locator("..");
  return subjectContainer.locator(".tiptap.ProseMirror");
}

test.describe("EmailEditor", () => {
  test.beforeEach(async ({ page }) => {
    // Setup with mocked API - no real credentials needed
    await setupMockedTest(page, mockTemplateDataSamples.fullTemplate);

    // Wait for editor to be ready
    const editor = page.locator(MAIN_EDITOR_SELECTOR);
    await expect(editor).toBeVisible({ timeout: 10000 });
    await expect(editor).toHaveAttribute("contenteditable", "true");

    // Ensure the editor is ready for interaction
    await page.waitForTimeout(500);
  });

  test("should render EmailEditor with basic structure", async ({ page }) => {
    // Check that the editor is visible and editable
    const editor = page.locator(MAIN_EDITOR_SELECTOR);
    await expect(editor).toBeVisible();
    await expect(editor).toHaveAttribute("contenteditable", "true");

    // Check for subject field (now a VariableInput TipTap editor)
    const subjectEditor = await getSubjectEditor(page);
    await expect(subjectEditor).toBeVisible();

    // Verify editor is interactive (click works without errors)
    await editor.click();
    await page.waitForTimeout(300);

    // Verify editor remains functional after interaction
    await expect(editor).toBeVisible();
    await expect(editor).toHaveAttribute("contenteditable", "true");
  });

  test("should allow editing the subject line", async ({ page }) => {
    const subjectEditor = await getSubjectEditor(page);

    // Clear any existing content first
    await subjectEditor.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");

    // Type new content
    await page.keyboard.type("Test Subject");
    await page.waitForTimeout(300);

    // Verify the content
    const content = await subjectEditor.textContent();
    expect(content).toContain("Test Subject");
  });

  test("should maintain subject value after losing focus", async ({ page }) => {
    const subjectEditor = await getSubjectEditor(page);
    const editor = page.locator(MAIN_EDITOR_SELECTOR);

    // Clear any existing content first
    await subjectEditor.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");

    // Type content
    await page.keyboard.type("Persistent Subject");
    await page.waitForTimeout(300);

    // Click elsewhere to lose focus
    await editor.click();
    await page.waitForTimeout(300);

    // Verify content is preserved
    const content = await subjectEditor.textContent();
    expect(content).toContain("Persistent Subject");
  });

  test("should be editable and respond to keyboard input", async ({ page }) => {
    const editor = page.locator(MAIN_EDITOR_SELECTOR);

    await editor.click();
    await expect(editor).toHaveAttribute("contenteditable", "true");

    // Try keyboard navigation
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowUp");

    // Editor should remain functional
    await expect(editor).toHaveAttribute("contenteditable", "true");
  });

  test("should handle focus management between components", async ({ page }) => {
    const editor = page.locator(MAIN_EDITOR_SELECTOR);
    const subjectEditor = await getSubjectEditor(page);

    // Clear any existing content
    await subjectEditor.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");

    // Type in subject
    await page.keyboard.type("Focus Test");
    await page.waitForTimeout(200);

    // Move to editor
    await editor.click();
    await page.waitForTimeout(200);

    // Return to subject
    await subjectEditor.click();
    await page.waitForTimeout(200);

    // Verify subject is preserved
    const content = await subjectEditor.textContent();
    expect(content).toContain("Focus Test");
    await expect(editor).toHaveAttribute("contenteditable", "true");
  });

  test("should have email editor context", async ({ page }) => {
    // Subject field should be present (as VariableInput)
    const subjectEditor = await getSubjectEditor(page);
    await expect(subjectEditor).toBeVisible();

    // Main editor should be present and editable
    const editor = page.locator(MAIN_EDITOR_SELECTOR);
    await expect(editor).toBeVisible();
    await expect(editor).toHaveAttribute("contenteditable", "true");

    // Should have some content structure
    const hasContent = await editor.textContent();
    expect(hasContent).not.toBeNull();
  });

  test("should support basic keyboard interactions", async ({ page }) => {
    const editor = page.locator(MAIN_EDITOR_SELECTOR);

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
    const editor = page.locator(MAIN_EDITOR_SELECTOR);
    const subjectEditor = await getSubjectEditor(page);

    // Clear any existing content
    await subjectEditor.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");

    // Type in subject
    await page.keyboard.type("State Test");
    await editor.click();
    await page.waitForTimeout(200);

    // Verify both components remain functional
    const content = await subjectEditor.textContent();
    expect(content).toContain("State Test");
    await expect(editor).toHaveAttribute("contenteditable", "true");
    await expect(editor).toBeVisible();
  });
});
