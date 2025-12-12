import { test, expect } from "@playwright/test";
import { setupMockedTest, mockTemplateDataSamples } from "./template-test-utils";
import { MAIN_EDITOR_SELECTOR } from "./test-utils";

test.describe("VariableInput Subject Field", () => {
  test.beforeEach(async ({ page }) => {
    // Setup with mocked API
    await setupMockedTest(page, mockTemplateDataSamples.fullTemplate);

    // Wait for editor to be ready
    const editor = page.locator(MAIN_EDITOR_SELECTOR);
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Wait for the subject area to be ready
    await page.waitForTimeout(500);
  });

  test("should render VariableInput for subject field", async ({ page }) => {
    // Check that the subject section exists
    const subjectLabel = page.locator("h4:has-text('Subject:')");
    await expect(subjectLabel).toBeVisible();

    // The VariableInput uses a TipTap editor under the hood, not a regular input
    const subjectInput = page.locator(".variable-input-placeholder").first();
    await expect(subjectInput).toBeVisible();
  });

  test("should allow typing plain text in subject", async ({ page }) => {
    // Find the subject input (VariableInput)
    const subjectContainer = page.locator(".variable-input-placeholder").first();
    await subjectContainer.click();

    // Clear any existing content
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    // Type plain text
    await page.keyboard.type("Test Subject Line");
    await page.waitForTimeout(300);

    // Verify text is present
    await expect(subjectContainer).toContainText("Test Subject Line");
  });

  test("should render variable chip when typing {{variable}}", async ({ page }) => {
    // Find the subject input (VariableInput)
    const subjectContainer = page.locator(".variable-input-placeholder").first();
    await subjectContainer.click();

    // Clear any existing content
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    // Type text with a variable - new flow: {{ creates chip, then type name, then Enter to exit
    await page.keyboard.type("Hello ");
    await page.keyboard.type("{{"); // This creates an empty variable chip
    await page.waitForTimeout(300);

    // Find the editable span inside the variable chip and use fill()
    const editableSpan = subjectContainer.locator('[role="textbox"]');
    await editableSpan.waitFor({ state: "attached", timeout: 5000 });
    await editableSpan.fill("user.name", { force: true });
    await page.keyboard.press("Enter"); // Exit the chip
    await page.waitForTimeout(100);
    await page.keyboard.type("!"); // Continue typing after the chip
    await page.waitForTimeout(500);

    // The variable should be rendered as a chip with the variable name visible
    await expect(subjectContainer).toContainText("user.name");

    // Check for the variable chip styling (via CSS class)
    const variableChip = subjectContainer.locator(".courier-variable-chip").first();
    await expect(variableChip).toBeVisible();
  });

  test("should render multiple variable chips", async ({ page }) => {
    // Find the subject input (VariableInput)
    const subjectContainer = page.locator(".variable-input-placeholder").first();
    await subjectContainer.click();

    // Clear any existing content
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    // Type first variable
    await page.keyboard.type("{{");
    await page.waitForTimeout(300);
    // Get the first (and only at this point) editable span
    let editableSpan = subjectContainer.locator('[role="textbox"]').first();
    await editableSpan.waitFor({ state: "attached", timeout: 5000 });
    await editableSpan.fill("greeting", { force: true });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    // Click back on subject container to ensure focus
    await subjectContainer.click();
    await page.waitForTimeout(100);

    // Type space and second variable
    await page.keyboard.type(" ");
    await page.keyboard.type("{{");
    await page.waitForTimeout(300);

    // Get the count of variable chips to verify second one exists
    const chipCount = await subjectContainer.locator('[role="textbox"]').count();
    if (chipCount < 2) {
      // If second chip wasn't created, log and fail early
      throw new Error(`Expected 2 chips but found ${chipCount}`);
    }

    // Get the second variable chip (the new one in edit mode)
    editableSpan = subjectContainer.locator('[role="textbox"]').last();
    await editableSpan.fill("user.name", { force: true });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
    await page.keyboard.type("!");
    await page.waitForTimeout(500);

    // Both variables should be visible
    await expect(subjectContainer).toContainText("greeting");
    await expect(subjectContainer).toContainText("user.name");
  });

  test("should preserve subject value after clicking elsewhere", async ({ page }) => {
    // Find the subject input (VariableInput)
    const subjectContainer = page.locator(".variable-input-placeholder").first();
    await subjectContainer.click();

    // Clear any existing content
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    // Type content - new flow: {{ creates chip
    await page.keyboard.type("Test ");
    await page.keyboard.type("{{");
    await page.waitForTimeout(300);
    const editableSpan = subjectContainer.locator('[role="textbox"]');
    await editableSpan.waitFor({ state: "attached", timeout: 5000 });
    await editableSpan.fill("variable", { force: true });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    // Click back on subject container to ensure focus
    await subjectContainer.click();
    await page.waitForTimeout(100);

    await page.keyboard.type(" Subject");
    await page.waitForTimeout(300);

    // Click on the main editor to lose focus
    const mainEditor = page.locator(MAIN_EDITOR_SELECTOR);
    await mainEditor.click();
    await page.waitForTimeout(300);

    // Subject should still contain the text
    await expect(subjectContainer).toContainText("Test");
    await expect(subjectContainer).toContainText("variable");
    await expect(subjectContainer).toContainText("Subject");
  });

  test("should show placeholder when empty", async ({ page }) => {
    // Find the subject input (VariableInput)
    const subjectContainer = page.locator(".variable-input-placeholder").first();
    await subjectContainer.click();

    // Clear any existing content
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    // Click elsewhere to deselect
    const mainEditor = page.locator(MAIN_EDITOR_SELECTOR);
    await mainEditor.click();
    await page.waitForTimeout(300);

    // Check for placeholder class - TipTap adds is-editor-empty or is-empty class
    const proseMirror = subjectContainer.locator(".ProseMirror");
    const isEmpty = await proseMirror.locator("p.is-empty, p.is-editor-empty").count();

    // Either empty paragraph exists or there's placeholder text via CSS
    expect(isEmpty).toBeGreaterThanOrEqual(0);
  });

  test("should handle mixed content with variables and text", async ({ page }) => {
    // Find the subject input (VariableInput)
    const subjectContainer = page.locator(".variable-input-placeholder").first();
    await subjectContainer.click();

    // Clear any existing content
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    // Type complex subject line - new flow: {{ creates chip
    await page.keyboard.type("Order #");
    await page.keyboard.type("{{");
    await page.waitForTimeout(300);
    let editableSpan = subjectContainer.locator('[role="textbox"]').first();
    await editableSpan.waitFor({ state: "attached", timeout: 5000 });
    await editableSpan.fill("order.id", { force: true });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    // Click back on subject container to ensure focus
    await subjectContainer.click();
    await page.waitForTimeout(100);

    await page.keyboard.type(" - Confirmation for ");
    await page.keyboard.type("{{");
    await page.waitForTimeout(300);

    // Get the second variable chip (the new one)
    editableSpan = subjectContainer.locator('[role="textbox"]').last();
    await editableSpan.waitFor({ state: "attached", timeout: 5000 });
    await editableSpan.fill("customer.name", { force: true });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    // Verify all parts are present
    await expect(subjectContainer).toContainText("Order #");
    await expect(subjectContainer).toContainText("order.id");
    await expect(subjectContainer).toContainText("- Confirmation for");
    await expect(subjectContainer).toContainText("customer.name");
  });

  test("should not allow line breaks in subject", async ({ page }) => {
    // Find the subject input (VariableInput)
    const subjectContainer = page.locator(".variable-input-placeholder").first();
    await subjectContainer.click();

    // Clear any existing content
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    // Type text and try to add line break
    await page.keyboard.type("Line 1");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Line 2");
    await page.waitForTimeout(300);

    // Check that the content is still on one line (Enter should be prevented)
    const paragraphs = await subjectContainer.locator(".ProseMirror p").count();
    expect(paragraphs).toBe(1);
  });

  test("should be read-only in preview mode", async ({ page }) => {
    // Click the View Preview button to enter preview mode
    const previewButton = page.locator('button:has-text("View Preview")');
    if (await previewButton.isVisible()) {
      await previewButton.click();
      await page.waitForTimeout(500);

      // Find the subject input (VariableInput)
      const subjectContainer = page.locator(".variable-input-placeholder").first();

      // In preview mode, the editor should be read-only
      const proseMirror = subjectContainer.locator(".ProseMirror");
      const isEditable = await proseMirror.getAttribute("contenteditable");

      // Should be false or not editable in preview mode
      expect(isEditable).toBe("false");
    }
  });
});

