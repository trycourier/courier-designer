import { test, expect, setupComponentTest, getMainEditor } from "./test-utils";

/**
 * E2E tests for sidebar form Tab navigation behavior
 *
 * These tests verify that:
 * 1. Tab key navigates between form fields in the sidebar (normal form behavior)
 * 2. Tab key does NOT trigger block navigation when focus is in a sidebar form
 * 3. Shift+Tab navigates backwards in the form
 *
 * This prevents regression of the issue where Tab in a sidebar form field
 * would select the next editor block instead of moving to the next form field.
 */

// Helper to find button nodes in the editor
const BUTTON_SELECTOR = '[data-node-type="button"]';

test.describe("Sidebar Form Tab Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setupComponentTest(page);
  });

  test("should navigate between form fields with Tab key in button sidebar", async ({ page }) => {
    const editor = getMainEditor(page);
    await expect(editor).toBeVisible();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert a button using TipTap command
    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        editor.commands.setButton({ label: "Test Button" });
      }
    });
    await page.waitForTimeout(500);

    // Click on the button to select it
    const buttonNode = page.locator(BUTTON_SELECTOR).first();
    await expect(buttonNode).toBeVisible({ timeout: 10000 });
    await buttonNode.click({ force: true });
    await page.waitForTimeout(300);

    // Wait for sidebar form to appear
    const sidebarForm = page.locator("[data-sidebar-form]");
    await expect(sidebarForm).toBeVisible({ timeout: 5000 });

    // Find the label input and focus it
    const labelInput = sidebarForm.locator('input[placeholder="Enter button text"]');
    await expect(labelInput).toBeVisible();
    await labelInput.click();
    await page.waitForTimeout(100);

    // Verify label input is focused
    const isLabelFocused = await page.evaluate(() => {
      const activeElement = document.activeElement;
      return (
        activeElement instanceof HTMLInputElement &&
        activeElement.placeholder === "Enter button text"
      );
    });
    expect(isLabelFocused).toBe(true);

    // Press Tab to move to the next form field
    await page.keyboard.press("Tab");
    await page.waitForTimeout(100);

    // Verify focus moved within the sidebar form (not to a different block)
    const focusStillInSidebar = await page.evaluate(() => {
      const activeElement = document.activeElement;
      const sidebarForm = document.querySelector("[data-sidebar-form]");
      // Check if focus is still in sidebar or moved to a form-related element
      return (
        sidebarForm?.contains(activeElement) ||
        activeElement?.closest("[data-sidebar-form]") !== null ||
        // Also accept if focus moved to any tiptap editor for VariableTextarea
        activeElement?.classList.contains("tiptap") ||
        activeElement?.closest(".tiptap") !== null
      );
    });
    expect(focusStillInSidebar).toBe(true);

    // Verify the button is still selected (sidebar form should still be visible)
    await expect(sidebarForm).toBeVisible();
  });

  test("should not select next editor block when Tab is pressed in form field", async ({
    page,
  }) => {
    const editor = getMainEditor(page);
    await expect(editor).toBeVisible();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert two buttons so we can verify Tab doesn't switch between them
    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        editor.commands.setButton({ label: "First Button" });
        editor.commands.setButton({ label: "Second Button" });
      }
    });
    await page.waitForTimeout(500);

    // Verify we have two buttons
    const buttonCount = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        const json = editor.getJSON();
        return json.content?.filter((n: any) => n.type === "button").length || 0;
      }
      return 0;
    });
    expect(buttonCount).toBe(2);

    // Click on the first button to select it
    const buttonNodes = page.locator(BUTTON_SELECTOR);
    await expect(buttonNodes.first()).toBeVisible({ timeout: 10000 });
    await buttonNodes.first().click({ force: true });
    await page.waitForTimeout(500);

    // Wait for sidebar form to appear
    const sidebarForm = page.locator("[data-sidebar-form]");
    await expect(sidebarForm).toBeVisible({ timeout: 10000 });

    // Get the current button label shown in the form
    const labelInput = sidebarForm.locator('input[placeholder="Enter button text"]');
    await expect(labelInput).toBeVisible({ timeout: 5000 });

    // Record the initial label (whichever button is selected)
    const initialLabel = await labelInput.inputValue();

    // Focus on the label input
    await labelInput.click();
    await page.waitForTimeout(100);

    // Press Tab multiple times - should stay in form, not switch blocks
    await page.keyboard.press("Tab");
    await page.waitForTimeout(100);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(100);

    // Verify the sidebar form is still visible
    await expect(sidebarForm).toBeVisible();

    // Verify the label input still shows the same button label
    // This confirms we didn't switch to another button block
    const currentLabel = await labelInput.inputValue();
    expect(currentLabel).toBe(initialLabel);
  });

  test("should allow Shift+Tab to navigate backwards in form", async ({ page }) => {
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

    // Wait for sidebar form
    const sidebarForm = page.locator("[data-sidebar-form]");
    await expect(sidebarForm).toBeVisible({ timeout: 5000 });

    // Focus on the label input and Tab forward first
    const labelInput = sidebarForm.locator('input[placeholder="Enter button text"]');
    await labelInput.click();
    await page.keyboard.press("Tab");
    await page.waitForTimeout(100);

    // Now press Shift+Tab to go back
    await page.keyboard.press("Shift+Tab");
    await page.waitForTimeout(100);

    // Verify focus is back in the sidebar form area
    const focusInSidebar = await page.evaluate(() => {
      const activeElement = document.activeElement;
      const sidebarForm = document.querySelector("[data-sidebar-form]");
      return (
        sidebarForm?.contains(activeElement) ||
        activeElement?.closest("[data-sidebar-form]") !== null ||
        activeElement?.classList.contains("tiptap") ||
        activeElement?.closest(".tiptap") !== null
      );
    });
    expect(focusInSidebar).toBe(true);

    // Sidebar should still be visible
    await expect(sidebarForm).toBeVisible();
  });

  test("should still allow block Tab navigation when not in form field", async ({ page }) => {
    const editor = getMainEditor(page);
    await expect(editor).toBeVisible();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert two buttons
    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        editor.commands.setButton({ label: "Button 1" });
        editor.commands.setButton({ label: "Button 2" });
      }
    });
    await page.waitForTimeout(500);

    // Click on the first button to select it
    const buttonNodes = page.locator(BUTTON_SELECTOR);
    await expect(buttonNodes.first()).toBeVisible();
    await buttonNodes.first().click({ force: true });
    await page.waitForTimeout(300);

    // Click somewhere outside the form to blur form inputs but keep button selected
    // Click on the editor container (not a form field)
    await editor.click({ position: { x: 10, y: 10 }, force: true });
    await page.waitForTimeout(100);

    // Now Tab should navigate between blocks (since we're not in a form field)
    await page.keyboard.press("Tab");
    await page.waitForTimeout(300);

    // Verify that we navigated to a different block
    // The sidebar might show a different block's form now or no form
    // This verifies the Tab navigation works when NOT in a form field
    const afterTabState = await page.evaluate(() => {
      const activeElement = document.activeElement;
      const isInFormField =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement;
      return { isInFormField };
    });

    // We should NOT be in a form field after the block navigation Tab
    expect(afterTabState.isInFormField).toBe(false);
  });

  test("should handle Tab in color input field", async ({ page }) => {
    const editor = getMainEditor(page);
    await expect(editor).toBeVisible();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert a button
    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        editor.commands.setButton({ label: "Colored Button" });
      }
    });
    await page.waitForTimeout(500);

    // Click on the button to select it
    const buttonNode = page.locator(BUTTON_SELECTOR).first();
    await expect(buttonNode).toBeVisible();
    await buttonNode.click({ force: true });
    await page.waitForTimeout(300);

    // Wait for sidebar form
    const sidebarForm = page.locator("[data-sidebar-form]");
    await expect(sidebarForm).toBeVisible({ timeout: 5000 });

    // Find and click the color input (it has an input for hex color)
    const colorInputs = sidebarForm.locator('input[type="text"]');
    const colorInputCount = await colorInputs.count();

    if (colorInputCount > 1) {
      // Click on a color input (likely the second input after label)
      await colorInputs.nth(1).click();
      await page.waitForTimeout(100);

      // Press Tab
      await page.keyboard.press("Tab");
      await page.waitForTimeout(100);

      // Sidebar should still be visible
      await expect(sidebarForm).toBeVisible();
    }
  });

  test("should handle Tab in number input field (padding/border)", async ({ page }) => {
    const editor = getMainEditor(page);
    await expect(editor).toBeVisible();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert a button
    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        editor.commands.setButton({ label: "Button with padding" });
      }
    });
    await page.waitForTimeout(500);

    // Click on the button to select it
    const buttonNode = page.locator(BUTTON_SELECTOR).first();
    await expect(buttonNode).toBeVisible();
    await buttonNode.click({ force: true });
    await page.waitForTimeout(300);

    // Wait for sidebar form
    const sidebarForm = page.locator("[data-sidebar-form]");
    await expect(sidebarForm).toBeVisible({ timeout: 5000 });

    // Find and click a number input (padding or border radius)
    const numberInput = sidebarForm.locator('input[type="number"]').first();

    if (await numberInput.isVisible()) {
      await numberInput.click();
      await page.waitForTimeout(100);

      // Type a new value
      await numberInput.fill("12");
      await page.waitForTimeout(100);

      // Press Tab
      await page.keyboard.press("Tab");
      await page.waitForTimeout(100);

      // Sidebar should still be visible
      await expect(sidebarForm).toBeVisible();

      // Focus should still be in the form area
      const focusInForm = await page.evaluate(() => {
        const activeElement = document.activeElement;
        const sidebarForm = document.querySelector("[data-sidebar-form]");
        return sidebarForm?.contains(activeElement);
      });
      expect(focusInForm).toBe(true);
    }
  });
});
