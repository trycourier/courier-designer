import { test, expect, setupComponentTest, getMainEditor } from "./test-utils";

/**
 * E2E tests for sidebar form selection focus behavior
 *
 * These tests verify that:
 * 1. When typing in sidebar form inputs (button label, image alt text, etc.),
 *    the corresponding block remains selected and the sidebar form stays visible
 * 2. The focus doesn't jump away from the sidebar form inputs during typing
 * 3. Auto-save/content updates don't cause selection/focus issues
 *
 * This prevents regression of issues like:
 * - Image block losing focus when typing in alt text field (converted to text)
 * - Button losing selection when typing in label field
 */

// Helper to find button nodes in the editor
// Buttons are rendered using React NodeView with data-node-type="button"
const BUTTON_SELECTOR = '[data-node-type="button"]';

// Helper to find image block nodes in the editor
// Image blocks are rendered using React NodeView wrapped in react-renderer
const IMAGE_BLOCK_SELECTOR = ".react-renderer.node-imageBlock";

test.describe("Sidebar Selection Focus - Button", () => {
  test.beforeEach(async ({ page }) => {
    await setupComponentTest(page);
  });

  test("should keep button selected when typing in label field", async ({ page }) => {
    const editor = getMainEditor(page);
    await expect(editor).toBeVisible();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert a button using TipTap command
    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        editor.commands.setButton({ label: "Initial Label" });
      }
    });
    await page.waitForTimeout(500);

    // Click on the button to select it
    const buttonNode = page.locator(BUTTON_SELECTOR).first();
    await expect(buttonNode).toBeVisible({ timeout: 10000 });
    await buttonNode.click({ force: true });
    await page.waitForTimeout(300);

    // Wait for sidebar form to appear (this indicates the button is selected)
    const sidebarForm = page.locator("[data-sidebar-form]");
    await expect(sidebarForm).toBeVisible({ timeout: 5000 });

    // Find the label input
    const labelInput = sidebarForm.locator('input[placeholder="Enter button text"]');
    await expect(labelInput).toBeVisible();

    // Focus on the label input and type additional content
    await labelInput.click();
    await page.waitForTimeout(100);

    // Type additional content to the existing label
    await labelInput.type(" - Updated", { delay: 30 });
    await page.waitForTimeout(500); // Allow debounce and auto-save cycles

    // Verify the button label was updated in the editor (should include appended text)
    const buttonLabel = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        const json = editor.getJSON();
        const buttonNode = json.content?.find((n: any) => n.type === "button");
        return buttonNode?.attrs?.label;
      }
      return null;
    });
    expect(buttonLabel).toContain("Updated");

    // Verify the sidebar form is still open (button still selected)
    await expect(sidebarForm).toBeVisible();
  });

  test("should not convert button to text when typing rapidly in label field", async ({
    page,
  }) => {
    const editor = getMainEditor(page);
    await expect(editor).toBeVisible();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert a button
    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        editor.commands.setButton({ label: "Test Button" });
      }
    });
    await page.waitForTimeout(500);

    // Click on the button to select it
    const buttonNode = page.locator(BUTTON_SELECTOR).first();
    await expect(buttonNode).toBeVisible();
    await buttonNode.click({ force: true });
    await page.waitForTimeout(300);

    // Find and focus the label input
    const sidebarForm = page.locator("[data-sidebar-form]");
    await expect(sidebarForm).toBeVisible({ timeout: 5000 });
    const labelInput = sidebarForm.locator('input[placeholder="Enter button text"]');
    await labelInput.click();

    // Type rapidly (no delay to stress-test)
    await labelInput.fill("");
    await labelInput.type("Rapid Typing Test Content Here", { delay: 0 });
    await page.waitForTimeout(1000); // Allow processing time

    // Count button nodes - should still be exactly 1
    const buttonCount = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        const json = editor.getJSON();
        return json.content?.filter((n: any) => n.type === "button").length || 0;
      }
      return 0;
    });
    expect(buttonCount).toBe(1);

    // Verify the sidebar form is still visible
    await expect(sidebarForm).toBeVisible();
  });

  test("should maintain focus on label input during auto-save cycles", async ({ page }) => {
    const editor = getMainEditor(page);
    await expect(editor).toBeVisible();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert a button
    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        editor.commands.setButton({ label: "Auto Save Test" });
      }
    });
    await page.waitForTimeout(500);

    // Click on the button to select it
    const buttonNode = page.locator(BUTTON_SELECTOR).first();
    await buttonNode.click({ force: true });
    await page.waitForTimeout(300);

    // Find and focus the label input
    const sidebarForm = page.locator("[data-sidebar-form]");
    await expect(sidebarForm).toBeVisible({ timeout: 5000 });
    const labelInput = sidebarForm.locator('input[placeholder="Enter button text"]');
    await labelInput.click();

    // Type with pauses to trigger auto-save debounce (appending to existing label)
    await labelInput.type(" Part 1", { delay: 20 });
    await page.waitForTimeout(800); // Allow auto-save debounce to trigger
    await labelInput.type(" Part 2", { delay: 20 });
    await page.waitForTimeout(800); // Another cycle
    await labelInput.type(" Part 3", { delay: 20 });
    await page.waitForTimeout(500);

    // Verify all typed text was captured in the label
    const buttonLabel = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        const json = editor.getJSON();
        const buttonNode = json.content?.find((n: any) => n.type === "button");
        return buttonNode?.attrs?.label;
      }
      return null;
    });
    // Should contain all the parts we typed
    expect(buttonLabel).toContain("Part 1");
    expect(buttonLabel).toContain("Part 2");
    expect(buttonLabel).toContain("Part 3");

    // Verify sidebar is still visible
    await expect(sidebarForm).toBeVisible();
  });
});

test.describe("Sidebar Selection Focus - Image Block", () => {
  test.beforeEach(async ({ page }) => {
    await setupComponentTest(page);
  });

  test("should keep image selected when typing in alt text field", async ({ page }) => {
    const editor = getMainEditor(page);
    await expect(editor).toBeVisible();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert an image block using TipTap command
    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        editor.commands.setImageBlock({
          sourcePath: "https://placehold.co/400x200",
          alt: "Initial alt text",
        });
      }
    });
    await page.waitForTimeout(1000); // Wait for image to load

    // Click on the image to select it
    const imageNode = page.locator(IMAGE_BLOCK_SELECTOR).first();
    await expect(imageNode).toBeVisible({ timeout: 10000 });
    await imageNode.click({ force: true });
    await page.waitForTimeout(300);

    // Find the sidebar form
    const sidebarForm = page.locator("[data-sidebar-form]");
    await expect(sidebarForm).toBeVisible({ timeout: 5000 });

    // Find the alt text input - VariableTextarea uses contenteditable
    // Look for any contenteditable within the form that's not the main editor
    const altTextInput = sidebarForm.locator('.tiptap[contenteditable="true"]').last();

    if (await altTextInput.isVisible()) {
      await altTextInput.click();
      await page.waitForTimeout(100);

      // Type new alt text
      await page.keyboard.type("New descriptive alt text");
      await page.waitForTimeout(500);

      // Verify the sidebar form is still open (image still selected)
      await expect(sidebarForm).toBeVisible();
    }
  });

  test("should not convert image to text when typing in alt field", async ({ page }) => {
    const editor = getMainEditor(page);
    await expect(editor).toBeVisible();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert an image block
    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        editor.commands.setImageBlock({
          sourcePath: "https://placehold.co/400x200",
          alt: "",
        });
      }
    });
    await page.waitForTimeout(1000);

    // Click on the image to select it
    const imageNode = page.locator(IMAGE_BLOCK_SELECTOR).first();
    await expect(imageNode).toBeVisible({ timeout: 10000 });
    await imageNode.click({ force: true });
    await page.waitForTimeout(300);

    // Find the sidebar form
    const sidebarForm = page.locator("[data-sidebar-form]");
    await expect(sidebarForm).toBeVisible({ timeout: 5000 });

    // Find and type in alt text
    const altTextInput = sidebarForm.locator('.tiptap[contenteditable="true"]').last();
    if (await altTextInput.isVisible()) {
      await altTextInput.click();
      await page.keyboard.type("Typing alt text should not create text blocks", { delay: 0 });
      await page.waitForTimeout(1000);
    }

    // Count image nodes - should still be exactly 1
    const imageCount = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        const json = editor.getJSON();
        return json.content?.filter((n: any) => n.type === "imageBlock").length || 0;
      }
      return 0;
    });
    expect(imageCount).toBe(1);

    // Verify the sidebar form is still visible
    await expect(sidebarForm).toBeVisible();
  });
});

test.describe("Sidebar Selection Focus - General", () => {
  test.beforeEach(async ({ page }) => {
    await setupComponentTest(page);
  });

  test("should keep sidebar form input focused during content updates", async ({ page }) => {
    const editor = getMainEditor(page);
    await expect(editor).toBeVisible();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert a button
    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        editor.commands.setButton({ label: "Focus Test" });
      }
    });
    await page.waitForTimeout(500);

    // Click on the button to select it
    const buttonNode = page.locator(BUTTON_SELECTOR).first();
    await buttonNode.click({ force: true });
    await page.waitForTimeout(300);

    // Focus on the label input
    const sidebarForm = page.locator("[data-sidebar-form]");
    await expect(sidebarForm).toBeVisible({ timeout: 5000 });
    const labelInput = sidebarForm.locator('input[placeholder="Enter button text"]');
    await labelInput.click();

    // Verify that the sidebar form input is focused
    const isSidebarInputFocused = await page.evaluate(() => {
      const activeElement = document.activeElement;
      const sidebarForm = document.querySelector("[data-sidebar-form]");
      return (
        sidebarForm?.contains(activeElement) &&
        (activeElement?.tagName === "INPUT" ||
          activeElement?.getAttribute("contenteditable") === "true")
      );
    });
    expect(isSidebarInputFocused).toBe(true);

    // Type something to trigger content update
    await labelInput.type("Updated", { delay: 20 });
    await page.waitForTimeout(300);

    // Verify the sidebar input is still focused
    const isStillFocused = await page.evaluate(() => {
      const activeElement = document.activeElement;
      const sidebarForm = document.querySelector("[data-sidebar-form]");
      return (
        sidebarForm?.contains(activeElement) &&
        (activeElement?.tagName === "INPUT" ||
          activeElement?.getAttribute("contenteditable") === "true")
      );
    });
    expect(isStillFocused).toBe(true);

    // Verify sidebar is still visible
    await expect(sidebarForm).toBeVisible();
  });

  test("should handle switching between blocks correctly", async ({ page }) => {
    const editor = getMainEditor(page);
    await expect(editor).toBeVisible();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert a button and an image
    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        editor.commands.setButton({ label: "Button 1" });
        editor.commands.setImageBlock({
          sourcePath: "https://placehold.co/400x200",
          alt: "Image 1",
        });
      }
    });
    await page.waitForTimeout(1000);

    // Click on the button
    const buttonNode = page.locator(BUTTON_SELECTOR).first();
    await expect(buttonNode).toBeVisible();
    await buttonNode.click({ force: true });
    await page.waitForTimeout(300);

    // Verify button form is shown
    let sidebarForm = page.locator("[data-sidebar-form]");
    await expect(sidebarForm).toBeVisible();
    const labelInput = sidebarForm.locator('input[placeholder="Enter button text"]');
    await expect(labelInput).toBeVisible();

    // Type in the button label
    await labelInput.click();
    await labelInput.fill("Modified Button");
    await page.waitForTimeout(300);

    // Now click on the image
    const imageNode = page.locator(IMAGE_BLOCK_SELECTOR).first();
    await expect(imageNode).toBeVisible();
    await imageNode.click({ force: true });
    await page.waitForTimeout(300);

    // Verify sidebar is still visible (now showing image form)
    sidebarForm = page.locator("[data-sidebar-form]");
    await expect(sidebarForm).toBeVisible();

    // Verify the button's label was updated correctly
    const buttonLabel = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        const json = editor.getJSON();
        const buttonNode = json.content?.find((n: any) => n.type === "button");
        return buttonNode?.attrs?.label;
      }
      return null;
    });
    expect(buttonLabel).toBe("Modified Button");
  });

  test("should handle editor focus after sidebar interaction", async ({ page }) => {
    const editor = getMainEditor(page);
    await expect(editor).toBeVisible();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert a button
    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        editor.commands.setButton({ label: "Test" });
      }
    });
    await page.waitForTimeout(500);

    // Click on the button
    const buttonNode = page.locator(BUTTON_SELECTOR).first();
    await buttonNode.click({ force: true });
    await page.waitForTimeout(300);

    // Type in the label input
    const sidebarForm = page.locator("[data-sidebar-form]");
    await expect(sidebarForm).toBeVisible({ timeout: 5000 });
    const labelInput = sidebarForm.locator('input[placeholder="Enter button text"]');
    await labelInput.click();
    await labelInput.fill("Updated Label");
    await page.waitForTimeout(300);

    // Click back on the editor
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Verify the editor is now focused
    const isEditorFocused = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      return editor?.isFocused || false;
    });
    expect(isEditorFocused).toBe(true);

    // Verify the button label was saved
    const buttonLabel = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        const json = editor.getJSON();
        const buttonNode = json.content?.find((n: any) => n.type === "button");
        return buttonNode?.attrs?.label;
      }
      return null;
    });
    expect(buttonLabel).toBe("Updated Label");
  });
});
