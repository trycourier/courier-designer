import { test, expect, getMainEditor } from "./test-utils";
import { setupMockedTest, mockTemplateDataSamples } from "./template-test-utils";

const AUTOCOMPLETE_BUTTON = 'button:has-text("user.firstName")';

async function focusEditorAndTypeTrigger(page: import("@playwright/test").Page) {
  const editor = getMainEditor(page);
  const textBlock = editor.locator('p, [data-placeholder]').first();

  if (await textBlock.isVisible({ timeout: 2000 }).catch(() => false)) {
    await textBlock.click({ force: true });
  } else {
    await editor.click({ force: true });
  }
  await page.waitForTimeout(300);
  await page.keyboard.type("{{", { delay: 80 });
  await page.waitForTimeout(1000);
}

test.describe("Variable Autocomplete E2E", () => {
  test.beforeEach(async ({ page }) => {
    await setupMockedTest(page, mockTemplateDataSamples.minimalTemplate, {
      delay: 100,
      skipNavigation: true,
    });
    await page.goto("/test-app-autocomplete", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const editor = getMainEditor(page);
    await expect(editor).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(500);
  });

  test("autocomplete dropdown appears with configured variables", async ({ page }) => {
    await focusEditorAndTypeTrigger(page);

    const editor = getMainEditor(page);
    await expect(editor.locator(".courier-variable-node")).toBeVisible({ timeout: 10000 });
    await expect(page.locator(AUTOCOMPLETE_BUTTON)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("order.id")')).toBeVisible({ timeout: 5000 });
  });

  test("selecting a variable from autocomplete inserts a chip", async ({ page }) => {
    await focusEditorAndTypeTrigger(page);

    const btn = page.locator(AUTOCOMPLETE_BUTTON);
    await expect(btn).toBeVisible({ timeout: 10000 });
    await btn.click();
    await page.waitForTimeout(500);

    const editor = getMainEditor(page);
    const chip = editor.locator('.courier-variable-node:has-text("user.firstName")');
    await expect(chip).toBeVisible({ timeout: 5000 });
    await expect(
      editor.locator(".courier-variable-node.courier-variable-chip-invalid")
    ).toHaveCount(0, { timeout: 3000 });
  });

  test("typing filters autocomplete suggestions", async ({ page }) => {
    const editor = getMainEditor(page);
    const textBlock = editor.locator('p, [data-placeholder]').first();

    if (await textBlock.isVisible({ timeout: 2000 }).catch(() => false)) {
      await textBlock.click({ force: true });
    } else {
      await editor.click({ force: true });
    }
    await page.waitForTimeout(300);
    await page.keyboard.type("{{", { delay: 80 });
    await page.waitForTimeout(500);

    // The chip enters edit mode - type filter text into the editable span
    const editableSpan = editor.locator(
      '.courier-variable-node [role="textbox"][contenteditable="true"]'
    );
    await editableSpan.waitFor({ state: "attached", timeout: 5000 });
    await editableSpan.fill("order", { force: true });
    await page.waitForTimeout(500);

    await expect(page.locator('button:has-text("order.id")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("order.total")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator(AUTOCOMPLETE_BUTTON)).toHaveCount(0, { timeout: 3000 });
  });

  test("previously used variable appears in autocomplete", async ({ page }) => {
    // Insert a variable chip programmatically
    await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (ed) {
        ed.commands.clearContent();
        ed.commands.insertContent([
          { type: "variable", attrs: { id: "user.email", isInvalid: false } },
          { type: "text", text: " " },
        ]);
      }
    });
    await page.waitForTimeout(500);

    // Place cursor after the existing chip and type {{
    await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (ed) {
        const { state } = ed;
        const docSize = state.doc.content.size;
        ed.commands.setTextSelection(docSize);
      }
    });
    await page.waitForTimeout(200);

    await page.keyboard.type("{{", { delay: 80 });
    await page.waitForTimeout(1000);

    await expect(page.locator('button:has-text("user.email")')).toBeVisible({ timeout: 10000 });
  });
});
