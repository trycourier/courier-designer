import { test, expect, getMainEditor } from "./test-utils";

/**
 * E2E tests for custom variable validation.
 *
 * These tests verify the variableValidation prop on TemplateEditor works correctly:
 * - Custom validate function rejecting/accepting variables
 * - onInvalid: 'mark' behavior (marks with red styling)
 * - onInvalid: 'remove' behavior (deletes the chip)
 * - Toast notifications with invalidMessage
 * - overrideFormatValidation behavior
 *
 * Note: These tests use the editor-dev app's variable-validation page
 * which has controls for configuring the validation behavior.
 * Autocomplete is disabled to test the validation behavior with editable chips.
 */
test.describe("Variable Validation E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the variable validation demo page
    await page.goto("/variable-validation");
    await page.waitForLoadState("networkidle");
    
    // Wait for the settings panel and select to be visible
    const select = page.locator('select').first();
    await expect(select).toBeVisible({ timeout: 10000 });
    
    // Wait for the select to have options loaded
    await page.waitForSelector('select option[value="mark"]', { state: 'attached', timeout: 10000 });
    
    // Note: autocomplete is disabled by default on this page, which is what these tests need
    // for the editable chip flow (typing {{ creates an editable chip immediately)
    
    // Wait for editor to be ready
    const editor = getMainEditor(page);
    await expect(editor).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
  });

  /**
   * Helper to create a variable chip and fill in its name
   * Types {{ to trigger InputRule, then fills the editable span with the variable name
   */
  async function createVariable(page: import("@playwright/test").Page, variableName: string) {
    const editor = getMainEditor(page);
    
    // Click on a paragraph or heading block (not the image block) to focus the editor
    // First try to find the heading placeholder, then fall back to paragraph
    const headingBlock = editor.locator('h1, h2, h3, [data-placeholder="Write heading..."]').first();
    const paragraphBlock = editor.locator('p, [data-placeholder="Write body text..."]').first();
    
    // Try heading first, then paragraph
    if (await headingBlock.isVisible({ timeout: 1000 }).catch(() => false)) {
      await headingBlock.click({ force: true });
    } else if (await paragraphBlock.isVisible({ timeout: 1000 }).catch(() => false)) {
      await paragraphBlock.click({ force: true });
    } else {
      // Fall back to clicking anywhere on the editor
      await editor.click({ force: true });
    }
    await page.waitForTimeout(200);
    
    // Type {{ to trigger the InputRule which creates an empty variable chip
    await page.keyboard.type("{{", { delay: 50 });
    await page.waitForTimeout(500);
    
    // The variable chip's editable span should now be visible and focused
    // Use the one that is currently being edited (contenteditable="true")
    const editableSpan = editor.locator('.courier-variable-node [role="textbox"][contenteditable="true"]');
    await editableSpan.waitFor({ state: "attached", timeout: 5000 });
    
    // Type the variable name into the editable span
    await editableSpan.fill(variableName, { force: true });
    await page.waitForTimeout(100);
    
    // Blur to trigger validation by clicking elsewhere in the editor
    await editor.click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);
  }

  test.describe("Custom validate function", () => {
    test("should mark allowed variable as valid", async ({ page }) => {
      await createVariable(page, "company.address");

      const editor = getMainEditor(page);
      
      // Verify the variable chip we just created is NOT marked as invalid
      // Use company.address to avoid conflicts with variables from other tests
      const validChip = editor.locator('.courier-variable-node:has([role="textbox"]:text-is("company.address")):not(.courier-variable-chip-invalid)');
      await expect(validChip.first()).toBeVisible({ timeout: 5000 });
      
      // Also verify there's no invalid chip with that name
      const invalidChip = editor.locator('.courier-variable-chip-invalid:has([role="textbox"]:text-is("company.address"))');
      await expect(invalidChip).toHaveCount(0, { timeout: 5000 });
    });

    test("should mark disallowed variable as invalid with 'mark' behavior", async ({ page }) => {
      // Ensure 'mark' behavior is selected (default)
      const onInvalidSelect = page.locator('select:has(option[value="mark"])');
      await expect(onInvalidSelect).toBeVisible({ timeout: 5000 });
      await onInvalidSelect.selectOption("mark");
      await page.waitForTimeout(100);

      await createVariable(page, "notAllowed.variable");

      const editor = getMainEditor(page);
      
      // Verify the variable IS marked as invalid
      const invalidChip = editor.locator('.courier-variable-chip-invalid:has([role="textbox"]:text-is("notAllowed.variable"))');
      await expect(invalidChip).toBeVisible({ timeout: 5000 });
    });

    test("should remove disallowed variable with 'remove' behavior", async ({ page }) => {
      // Select 'remove' behavior
      const onInvalidSelect = page.locator('select:has(option[value="mark"])');
      await expect(onInvalidSelect).toBeVisible({ timeout: 5000 });
      await onInvalidSelect.selectOption("remove");
      await page.waitForTimeout(100);

      await createVariable(page, "notAllowed.toRemove");

      const editor = getMainEditor(page);
      
      // Verify the chip was REMOVED (since it's invalid and remove behavior is set)
      // Use a unique variable name to avoid conflicts with other tests
      const removedChip = editor.locator('.courier-variable-node:has([role="textbox"]:text-is("notAllowed.toRemove"))');
      await expect(removedChip).toHaveCount(0, { timeout: 5000 });
    });

    test("should keep allowed variable with 'remove' behavior", async ({ page }) => {
      // Select 'remove' behavior
      const onInvalidSelect = page.locator('select:has(option[value="mark"])');
      await expect(onInvalidSelect).toBeVisible({ timeout: 5000 });
      await onInvalidSelect.selectOption("remove");
      await page.waitForTimeout(100);

      await createVariable(page, "order.total");

      const editor = getMainEditor(page);
      
      // Verify the chip exists and is NOT invalid (allowed variable should be kept)
      // Use order.total to avoid conflicts with user.email used elsewhere
      const validChip = editor.locator('.courier-variable-node:has([role="textbox"]:text-is("order.total")):not(.courier-variable-chip-invalid)');
      await expect(validChip).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Toast notifications", () => {
    test("should show toast for invalid variable when checkbox is enabled", async ({ page }) => {
      // Ensure toast checkbox is checked (index 1, after autocomplete checkbox)
      const toastCheckbox = page.locator('input[type="checkbox"]').nth(1);
      if (!(await toastCheckbox.isChecked())) {
        await toastCheckbox.click();
      }
      await page.waitForTimeout(100);

      await createVariable(page, "notAllowed.var");

      // Look for toast notification - Sonner creates toasts in a specific container
      const toast = page.locator('[data-sonner-toaster] [data-sonner-toast]').first();
      await expect(toast).toBeVisible({ timeout: 5000 });
    });

    test("should NOT show toast when checkbox is disabled", async ({ page }) => {
      // Ensure toast checkbox is unchecked (index 1, after autocomplete checkbox)
      const toastCheckbox = page.locator('input[type="checkbox"]').nth(1);
      if (await toastCheckbox.isChecked()) {
        await toastCheckbox.click();
      }
      await page.waitForTimeout(100);

      await createVariable(page, "notAllowed.var");

      // Toast should NOT appear
      const toast = page.locator('[data-sonner-toaster] [data-sonner-toast]');
      await expect(toast).toHaveCount(0);
    });
  });

  test.describe("Override format validation", () => {
    test("should accept format-valid variable when override is enabled", async ({ page }) => {
      // Enable override format validation checkbox (index 2, after autocomplete and toast checkboxes)
      const overrideCheckbox = page.locator('input[type="checkbox"]').nth(2);
      if (!(await overrideCheckbox.isChecked())) {
        await overrideCheckbox.click();
      }
      await page.waitForTimeout(100);

      await createVariable(page, "order.total");

      const editor = getMainEditor(page);
      
      // Verify the variable is valid
      const invalidChip = editor.locator(".courier-variable-chip-invalid");
      await expect(invalidChip).toHaveCount(0, { timeout: 5000 });
    });

    test("should still run custom validation when override is enabled", async ({ page }) => {
      // Enable override format validation (index 2, after autocomplete and toast checkboxes)
      const overrideCheckbox = page.locator('input[type="checkbox"]').nth(2);
      if (!(await overrideCheckbox.isChecked())) {
        await overrideCheckbox.click();
      }
      await page.waitForTimeout(100);

      await createVariable(page, "notInList.variable");

      const editor = getMainEditor(page);
      
      // Custom validation should still mark it as invalid
      const invalidChip = editor.locator(".courier-variable-chip-invalid");
      await expect(invalidChip).toHaveCount(1, { timeout: 5000 });
    });
  });

  test.describe("Allowed variables list", () => {
    // The allowed list in VariableValidationPage.tsx includes:
    // "user.firstName", "user.lastName", "user.email",
    // "order.id", "order.total", "order.date",
    // "company.name", "company.address"

    const allowedVariables = [
      "order.id",
      "order.date",
      "company.name",
    ];

    for (const varName of allowedVariables) {
      test(`should accept allowed variable: ${varName}`, async ({ page }) => {
        await createVariable(page, varName);

        const editor = getMainEditor(page);
        
        // Verify the specific variable we created is NOT marked as invalid
        const validChip = editor.locator(`.courier-variable-node:has([role="textbox"]:text-is("${varName}")):not(.courier-variable-chip-invalid)`);
        await expect(validChip).toBeVisible({ timeout: 5000 });
        
        // Verify it's not marked invalid
        const invalidChip = editor.locator(`.courier-variable-chip-invalid:has([role="textbox"]:text-is("${varName}"))`);
        await expect(invalidChip).toHaveCount(0, { timeout: 5000 });
      });
    }
  });
});
