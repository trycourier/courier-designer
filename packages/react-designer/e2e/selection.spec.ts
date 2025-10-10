import { test, expect, resetEditorState } from "./test-utils";

test.describe("Selection Component", () => {
  test.beforeEach(async ({ page }) => {
    // Use the enhanced reset function for better isolation
    await resetEditorState(page);
  });

  test("should verify selection extension is available", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if selection commands are available
    const hasSelectionCommands = await page.evaluate(() => {
      if ((window as any).editor) {
        try {
          return typeof (window as any).editor.commands.updateSelectionState === "function";
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(hasSelectionCommands).toBe(true);
  });

  test("should verify selection extension is registered", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if selection extension is registered
    const hasSelectionExtension = await page.evaluate(() => {
      if ((window as any).editor) {
        const extensions = (window as any).editor.extensionManager.extensions;
        return extensions.some((ext: any) => ext.name === "selection");
      }
      return false;
    });

    expect(hasSelectionExtension).toBe(true);
  });

  test("should check selection global attributes on paragraphs", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if isSelected attribute exists on paragraph nodes
    const hasSelectionAttributes = await page.evaluate(() => {
      if ((window as any).editor) {
        const paragraphNode = (window as any).editor.schema.nodes.paragraph;
        return paragraphNode && paragraphNode.spec.attrs && paragraphNode.spec.attrs.isSelected;
      }
      return false;
    });

    expect(hasSelectionAttributes).toBeDefined();
  });

  test("should handle basic content insertion and selection", async ({ page }) => {
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

    // Add simple content
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.commands.insertContent("<p>Test paragraph</p>");
      }
    });

    await page.waitForTimeout(500);

    // Verify content appears
    await expect(editor).toContainText("Test paragraph");

    // Click on the paragraph to test selection
    const paragraph = editor.locator("p").first();
    await paragraph.click({ force: true });
    await page.waitForTimeout(100);

    // Verify content is still there after selection
    await expect(paragraph).toContainText("Test paragraph");
  });

  test("should handle selection command execution", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Clear content first
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.commands.clearContent();
      }
    });

    await page.waitForTimeout(200);

    // Add content
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.commands.insertContent("<p>Command test</p>");
      }
    });

    await page.waitForTimeout(300);

    // Test updateSelectionState command
    const commandResult = await page.evaluate(() => {
      if ((window as any).editor) {
        try {
          return (window as any).editor.commands.updateSelectionState(null);
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(commandResult).toBe(true);
    await expect(editor).toContainText("Command test");
  });

  test("should maintain editor stability during selection operations", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Clear content first
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.commands.clearContent();
      }
    });

    await page.waitForTimeout(200);

    // Add content
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.commands.insertContent("<p>Stability test</p>");
      }
    });

    await page.waitForTimeout(300);

    // Perform multiple selection operations
    const paragraph = editor.locator("p").first();

    for (let i = 0; i < 3; i++) {
      await paragraph.click({ force: true });
      await page.waitForTimeout(100);
    }

    // Verify content is still there
    await expect(editor).toContainText("Stability test");

    // Test editor is still functional - use programmatic cursor positioning for reliability
    await page.evaluate(() => {
      if ((window as any).editor) {
        const { editor } = window as any;
        // Set cursor to end of document
        const endPos = editor.state.doc.content.size - 1;
        editor.commands.setTextSelection(endPos);
        editor.commands.focus();
      }
    });

    await page.waitForTimeout(100);
    await page.keyboard.type(" - extra");
    await page.waitForTimeout(100);

    await expect(editor).toContainText("Stability test - extra");
  });
});
