import { test, expect, setupComponentTest } from "./test-utils";

test.describe("UniqueId Component E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Use the enhanced reset function for better isolation
    await setupComponentTest(page);
  });

  test("should verify editor works normally (UniqueId extension not loaded by default)", async ({
    page,
  }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // UniqueId is not included in the main editor by default (commented out in extension-kit.ts)
    // This test verifies the editor still works normally
    const editorWorks = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        return (window as any).__COURIER_CREATE_TEST__?.currentEditor.isEditable;
      }
      return false;
    });

    expect(editorWorks).toBe(true);
  });

  test("should handle content insertion without UniqueId extension", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Clear any existing content first
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
      }
    });

    await page.waitForTimeout(200);

    // Add simple content
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent("<p>Test paragraph without UniqueId</p>");
      }
    });

    await page.waitForTimeout(500);

    // Verify content appears
    await expect(editor).toContainText("Test paragraph without UniqueId");
  });

  test("should handle JSON operations without UniqueId extension", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Clear content first
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
      }
    });

    await page.waitForTimeout(200);

    // Add content
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent("<p>JSON test content</p>");
      }
    });

    await page.waitForTimeout(300);

    // Test JSON operations work
    const jsonOperationsWork = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        try {
          const json = (window as any).__COURIER_CREATE_TEST__?.currentEditor.getJSON();
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setContent(json);
          const html = (window as any).__COURIER_CREATE_TEST__?.currentEditor.getHTML();
          return html.includes("JSON test content");
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(jsonOperationsWork).toBe(true);
    await expect(editor).toContainText("JSON test content");
  });

  test("should verify extensions list (for reference)", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Get list of loaded extensions for reference
    const loadedExtensions = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        return (window as any).__COURIER_CREATE_TEST__?.currentEditor.extensionManager.extensions.map((ext: any) => ext.name);
      }
      return [];
    });

    // Verify some core extensions are loaded but UniqueId is not
    expect(loadedExtensions).toContain("paragraph");
    expect(loadedExtensions).toContain("selection"); // Selection should be there
    expect(loadedExtensions).not.toContain("uniqueId"); // UniqueId should NOT be there
    expect(Array.isArray(loadedExtensions)).toBe(true);
    expect(loadedExtensions.length).toBeGreaterThan(5); // Should have multiple extensions
  });

  test("should maintain editor stability in normal operations", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Clear content first
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
      }
    });

    await page.waitForTimeout(200);

    // Add content
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent("<p>Stability test</p>");
      }
    });

    await page.waitForTimeout(300);

    // Verify content appears
    await expect(editor).toContainText("Stability test");

    // Test editor is still functional
    const paragraph = editor.locator("p").first();
    await paragraph.click({ force: true });
    await page.keyboard.press("End");
    await page.keyboard.type(" - extra text");

    await expect(editor).toContainText("Stability test - extra text");
  });

  test("should work with complex document structures", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Clear content first
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
      }
    });

    await page.waitForTimeout(200);

    // Add complex content using a more reliable approach
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        // Insert content step by step to ensure proper rendering
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent("<p>First paragraph</p>");
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent("<p>Main heading content</p>");
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent("<p>Second paragraph</p>");
      }
    });

    await page.waitForTimeout(500);

    // Verify all content appears
    await expect(editor).toContainText("First paragraph");
    await expect(editor).toContainText("Main heading content");
    await expect(editor).toContainText("Second paragraph");

    // Test editing by directly modifying content using TipTap commands
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        // Position at the end of the first paragraph and add text
        const doc = (window as any).__COURIER_CREATE_TEST__?.currentEditor.state.doc;
        const firstParagraph = doc.child(0);
        if (firstParagraph && firstParagraph.type.name === "paragraph") {
          const endPos = firstParagraph.nodeSize - 1; // Position at end of first paragraph
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.focus(endPos);
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent(" - edited");
        }
      }
    });

    await page.waitForTimeout(300);

    // Verify the edit was applied
    await expect(editor).toContainText("First paragraph - edited");
  });
});
