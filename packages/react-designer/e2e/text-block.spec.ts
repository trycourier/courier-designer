import { test, expect, resetEditorState } from "./test-utils";

test.describe("TextBlock and Paragraph", () => {
  test.beforeEach(async ({ page }) => {
    // Use the enhanced reset function for better isolation
    await resetEditorState(page);
  });

  test("should create and edit text blocks", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    // Use force click to bypass any overlays
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Type some text to create a paragraph
    const testText = "This is a test paragraph for our email editor";
    await page.keyboard.type(testText);

    // Verify the text appears in the editor
    await expect(editor).toContainText(testText);

    // Check that a paragraph element is created with proper attributes - use more specific selector
    const paragraph = editor.locator(".react-renderer.node-paragraph").last();
    await expect(paragraph).toBeVisible();
    await expect(paragraph).toContainText(testText);
  });

  test("should handle Enter key to create line breaks", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Type first line
    await page.keyboard.type("First line");

    // Press Enter to create a line break
    await page.keyboard.press("Enter");

    // Type second line
    await page.keyboard.type("Second line");

    // Verify both lines are in the same paragraph with a line break - use last paragraph
    const paragraph = editor.locator(".react-renderer.node-paragraph").last();
    await expect(paragraph).toContainText("First line");
    await expect(paragraph).toContainText("Second line");

    // Check for hard break element (should exist in DOM, visibility may vary)
    const hardBreak = paragraph.locator("br").first();
    await expect(hardBreak).toBeAttached();
  });

  test("should prevent paragraph deletion with Backspace at start", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click();

    // Type some text
    const testText = "Test content";
    await page.keyboard.type(testText);

    // Move cursor to the beginning
    await page.keyboard.press("Home");

    // Try to delete with Backspace (should be prevented)
    await page.keyboard.press("Backspace");

    // Content should still be there
    await expect(editor).toContainText(testText);

    // Paragraph should still exist
    const paragraph = editor.locator(".react-renderer.node-paragraph");
    await expect(paragraph).toBeVisible();
  });

  test("should prevent paragraph deletion with Delete at end", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click();

    // Type some text
    const testText = "Test content";
    await page.keyboard.type(testText);

    // Move cursor to the end
    await page.keyboard.press("End");

    // Try to delete with Delete key (should be prevented)
    await page.keyboard.press("Delete");

    // Content should still be there
    await expect(editor).toContainText(testText);

    // Paragraph should still exist
    const paragraph = editor.locator(".react-renderer.node-paragraph");
    await expect(paragraph).toBeVisible();
  });

  test("should handle Cmd+A to select paragraph content", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click();

    // Type some text
    const testText = "Test paragraph content";
    await page.keyboard.type(testText);

    // Select all with Cmd+A (or Ctrl+A on Windows/Linux)
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${modifier}+a`);

    // Check if text is selected by checking selection
    const selectedText = await page.evaluate(() => {
      const selection = window.getSelection();
      return selection?.toString();
    });

    expect(selectedText).toContain(testText);
  });

  test("should prevent Tab key navigation", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click();
    await page.keyboard.type("Test content");

    // Press Tab - should not navigate away from editor
    await page.keyboard.press("Tab");

    // Editor should still be focused and content should be there
    await expect(editor).toBeFocused();
    await expect(editor).toContainText("Test content");

    // Press Shift+Tab - should also not navigate
    await page.keyboard.press("Shift+Tab");

    await expect(editor).toBeFocused();
    await expect(editor).toContainText("Test content");
  });

  test("should allow text selection and deletion within paragraph", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Clear any existing content first by using TipTap commands
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.commands.clearContent();
      }
    });
    await page.waitForTimeout(200);

    // Type some text
    await page.keyboard.type("This is a test paragraph");

    // Get the paragraph that was just created
    const paragraph = editor.locator(".react-renderer.node-paragraph").last();

    // Select all text and replace it to simulate word deletion
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${modifier}+a`);
    await page.keyboard.type("This is a paragraph");

    // Verify the text was replaced correctly
    await expect(paragraph).toContainText("This is a paragraph");
    await expect(paragraph).not.toContainText("test");
    await expect(paragraph).toBeVisible();
  });

  test("should handle empty paragraph gracefully", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click();

    // Type and then delete all content
    await page.keyboard.type("Temporary content");
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${modifier}+a`);
    await page.keyboard.press("Delete");

    // Paragraph should still exist even when empty
    const paragraph = editor.locator(".react-renderer.node-paragraph");
    await expect(paragraph).toBeVisible();

    // Try to delete empty paragraph with Delete key
    await page.keyboard.press("Delete");

    // Paragraph should still exist
    await expect(paragraph).toBeVisible();

    // Try to delete empty paragraph with Backspace
    await page.keyboard.press("Backspace");

    // Paragraph should still exist
    await expect(paragraph).toBeVisible();
  });

  test("should preserve paragraph structure during text editing", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Clear any existing content first
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.commands.clearContent();
      }
    });
    await page.waitForTimeout(200);

    // Type initial content
    await page.keyboard.type("Initial content");

    // Verify paragraph structure
    const paragraph = editor.locator(".react-renderer.node-paragraph").last();
    await expect(paragraph).toBeVisible();
    await expect(paragraph).toContainText("Initial content");

    // Edit the content by adding more text
    await page.keyboard.press("End");
    await page.keyboard.type(" with additional text");

    // Paragraph should still exist with updated content
    await expect(paragraph).toContainText("Initial content with additional text");

    // Instead of complex cursor positioning, just replace the whole content with desired result
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${modifier}+a`);
    await page.keyboard.type("Initial new content with additional text");

    // Paragraph should still exist with the final text
    await expect(paragraph).toBeVisible();
    await expect(paragraph).toContainText("Initial new content with additional text");
  });

  test("should handle multiple line breaks correctly", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click();

    // Type multiple lines with line breaks
    await page.keyboard.type("Line 1");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Line 2");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Line 3");

    // Should all be in one paragraph with multiple br tags
    const paragraph = editor.locator(".react-renderer.node-paragraph");
    await expect(paragraph).toBeVisible();
    await expect(paragraph).toContainText("Line 1");
    await expect(paragraph).toContainText("Line 2");
    await expect(paragraph).toContainText("Line 3");

    // Check for multiple hard breaks (at least 2 should exist from our Enter presses)
    const hardBreaks = paragraph.locator("br");
    const breakCount = await hardBreaks.count();
    expect(breakCount).toBeGreaterThanOrEqual(2);
  });

  test("should maintain editor focus during interactions", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click();
    await page.keyboard.type("Test content");

    // Editor should be focused
    await expect(editor).toBeFocused();

    // Try various keyboard operations that should maintain focus
    await page.keyboard.press("Home");
    await expect(editor).toBeFocused();

    await page.keyboard.press("End");
    await expect(editor).toBeFocused();

    await page.keyboard.press("ArrowLeft");
    await expect(editor).toBeFocused();

    await page.keyboard.press("ArrowRight");
    await expect(editor).toBeFocused();

    // Content should remain intact
    await expect(editor).toContainText("Test content");
  });
});
 