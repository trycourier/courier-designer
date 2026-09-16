import { test, expect, getMainEditor } from "./test-utils";
import { setupMockedTest, mockTemplateDataSamples } from "./template-test-utils";

test.describe("Variable autocomplete inside a loop block", () => {
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

  async function insertListWithLoopAndType(page: import("@playwright/test").Page) {
    await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (ed) {
        ed.commands.clearContent();
        ed.commands.setContent({
          type: "doc",
          content: [
            {
              type: "list",
              attrs: {
                listType: "unordered",
                loop: "data.items",
                paddingHorizontal: 0,
                paddingVertical: 0,
              },
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Item: " }],
                    },
                  ],
                },
              ],
            },
          ],
        });
        // Place cursor at the end of the list item text
        const { state } = ed;
        let targetPos = -1;
        state.doc.descendants((node: any, pos: number) => {
          if (node.type.name === "paragraph" && node.textContent === "Item: ") {
            targetPos = pos + node.nodeSize - 1;
            return false;
          }
        });
        if (targetPos >= 0) {
          ed.commands.setTextSelection(targetPos);
        }
      }
    });
    await page.waitForTimeout(500);
  }

  test("$.item and $.index appear in autocomplete inside a loop block", async ({ page }) => {
    await insertListWithLoopAndType(page);

    const editor = getMainEditor(page);

    // Focus and type {{ to trigger variable chip creation
    await editor.click({ force: true });
    await page.waitForTimeout(300);
    await page.keyboard.type("{{", { delay: 80 });
    await page.waitForTimeout(1000);

    // Verify the variable chip is created and in edit mode
    await expect(editor.locator(".courier-variable-node")).toBeVisible({ timeout: 10000 });

    // $.item and $.index should appear in the autocomplete dropdown
    await expect(page.locator('button:has-text("$.item")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("$.index")')).toBeVisible({ timeout: 5000 });
  });

  test("selecting $.item appends a dot and keeps chip in edit mode", async ({ page }) => {
    await insertListWithLoopAndType(page);

    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(300);
    await page.keyboard.type("{{", { delay: 80 });
    await page.waitForTimeout(1000);

    // Wait for the autocomplete dropdown
    const itemButton = page.locator('button:has-text("$.item")');
    await expect(itemButton).toBeVisible({ timeout: 10000 });

    // Click $.item
    await itemButton.click();
    await page.waitForTimeout(500);

    // The editable span should contain "$.item." (with trailing dot)
    const editableSpan = editor.locator(
      '.courier-variable-node [role="textbox"][contenteditable="true"]'
    );
    await expect(editableSpan).toBeVisible({ timeout: 5000 });
    await expect(editableSpan).toHaveText("$.item.", { timeout: 5000 });
  });

  test("selecting $.index commits the chip normally", async ({ page }) => {
    await insertListWithLoopAndType(page);

    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(300);
    await page.keyboard.type("{{", { delay: 80 });
    await page.waitForTimeout(1000);

    const indexButton = page.locator('button:has-text("$.index")');
    await expect(indexButton).toBeVisible({ timeout: 10000 });

    await indexButton.click();
    await page.waitForTimeout(500);

    // Chip should be committed (no longer in edit mode)
    const editableSpanEditing = editor.locator(
      '.courier-variable-node [role="textbox"][contenteditable="true"]'
    );
    await expect(editableSpanEditing).toHaveCount(0, { timeout: 3000 });

    // The chip should show $.index
    const chip = editor.locator('.courier-variable-node:has-text("$.index")');
    await expect(chip).toBeVisible({ timeout: 5000 });
  });

  test("after selecting $.item, user can continue typing to complete the path", async ({
    page,
  }) => {
    await insertListWithLoopAndType(page);

    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(300);
    await page.keyboard.type("{{", { delay: 80 });
    await page.waitForTimeout(1000);

    const itemButton = page.locator('button:has-text("$.item")');
    await expect(itemButton).toBeVisible({ timeout: 10000 });

    await itemButton.click();
    await page.waitForTimeout(500);

    // Chip should still be in edit mode
    const editableSpan = editor.locator(
      '.courier-variable-node [role="textbox"][contenteditable="true"]'
    );
    await expect(editableSpan).toBeVisible({ timeout: 5000 });

    // Type the property name
    await page.keyboard.type("name", { delay: 50 });
    await page.waitForTimeout(300);

    await expect(editableSpan).toHaveText("$.item.name", { timeout: 5000 });

    // Blur to commit
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    // Chip should now show $.item.name and be committed
    const chip = editor.locator('.courier-variable-node:has-text("$.item.name")');
    await expect(chip).toBeVisible({ timeout: 5000 });
  });
});
