import { test, expect, getMainEditor } from "./test-utils";
import { mockTemplateResponse, mockTemplateDataSamples } from "./template-test-utils";

async function createVariable(
  page: import("@playwright/test").Page,
  variableName: string
) {
  const editor = getMainEditor(page);
  const paragraphBlock = editor.locator('p, [data-placeholder="Write body text..."]').first();
  await paragraphBlock.click({ force: true });
  await page.waitForTimeout(200);
  await page.keyboard.type("{{", { delay: 50 });
  await page.waitForTimeout(500);
  const editableSpan = editor.locator(
    '.courier-variable-node [role="textbox"][contenteditable="true"]'
  );
  await editableSpan.waitFor({ state: "attached", timeout: 10000 });
  await editableSpan.fill(variableName, { force: true });
  await page.waitForTimeout(150);
  // Blur triggers validation - click outside editor
  await page.locator('strong:has-text("Prefix Validation:")').click({ force: true });
  await page.waitForTimeout(500);
}

test.describe("Variable Prefix Validation E2E", () => {
  test.beforeEach(async ({ page }) => {
    await mockTemplateResponse(page, mockTemplateDataSamples.minimalTemplate, {
      delay: 100,
      requireAuth: false,
    });
    await page.goto("/prefix-validation");
    await page.waitForLoadState("networkidle");
    const editor = getMainEditor(page);
    await expect(editor).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test("non-prefixed variable is marked invalid", async ({ page }) => {
    await createVariable(page, "foo");
    const editor = getMainEditor(page);
    const chip = editor.locator('.courier-variable-node:has-text("foo")').first();
    await expect(chip).toBeVisible({ timeout: 5000 });
    await expect(chip).toHaveClass(/courier-variable-chip-invalid/, { timeout: 10000 });
  });

  test("incomplete variable (bare prefix) is marked invalid", async ({ page }) => {
    await createVariable(page, "data.");
    const editor = getMainEditor(page);
    const chip = editor.locator('.courier-variable-node:has-text("data.")').first();
    await expect(chip).toBeVisible({ timeout: 5000 });
    await expect(chip).toHaveClass(/courier-variable-chip-invalid/, { timeout: 10000 });
  });

  test("valid prefixed variable is accepted", async ({ page }) => {
    await createVariable(page, "data.name");
    const editor = getMainEditor(page);
    const validChip = editor.locator(
      '.courier-variable-node:has([role="textbox"]:text-is("data.name")):not(.courier-variable-chip-invalid)'
    );
    await expect(validChip.first()).toBeVisible({ timeout: 10000 });
    const invalidChip = editor.locator(
      '.courier-variable-chip-invalid:has([role="textbox"]:text-is("data.name"))'
    );
    await expect(invalidChip).toHaveCount(0, { timeout: 10000 });
  });

  test("profile-prefixed variable is accepted", async ({ page }) => {
    await createVariable(page, "profile.email");
    const editor = getMainEditor(page);
    const validChip = editor.locator(
      '.courier-variable-node:has([role="textbox"]:text-is("profile.email")):not(.courier-variable-chip-invalid)'
    );
    await expect(validChip.first()).toBeVisible({ timeout: 10000 });
    const invalidChip = editor.locator(
      '.courier-variable-chip-invalid:has([role="textbox"]:text-is("profile.email"))'
    );
    await expect(invalidChip).toHaveCount(0, { timeout: 10000 });
  });

  test("context-prefixed variable is accepted", async ({ page }) => {
    await createVariable(page, "context.tenant_id");
    const editor = getMainEditor(page);
    const validChip = editor.locator(
      '.courier-variable-node:has([role="textbox"]:text-is("context.tenant_id")):not(.courier-variable-chip-invalid)'
    );
    await expect(validChip.first()).toBeVisible({ timeout: 10000 });
    const invalidChip = editor.locator(
      '.courier-variable-chip-invalid:has([role="textbox"]:text-is("context.tenant_id"))'
    );
    await expect(invalidChip).toHaveCount(0, { timeout: 10000 });
  });

  test("incomplete profile prefix is marked invalid", async ({ page }) => {
    await createVariable(page, "profile.");
    const editor = getMainEditor(page);
    const chip = editor.locator('.courier-variable-node:has-text("profile.")').first();
    await expect(chip).toBeVisible({ timeout: 5000 });
    await expect(chip).toHaveClass(/courier-variable-chip-invalid/, { timeout: 10000 });
  });
});
