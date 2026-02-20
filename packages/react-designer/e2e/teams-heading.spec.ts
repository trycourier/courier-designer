import { test, expect, type Page } from "@playwright/test";
import { setupMockedTest, mockTemplateDataSamples } from "./template-test-utils";

async function addChannel(page: Page, channelLabel: string) {
  const addBtn = page.locator("button").filter({ hasText: "+ Add channel" });
  await expect(addBtn).toBeVisible({ timeout: 5000 });
  await addBtn.click();
  await page.waitForTimeout(500);

  const menuItem = page.locator('[role="menuitem"]').filter({ hasText: channelLabel });
  await expect(menuItem).toBeVisible({ timeout: 3000 });
  await menuItem.click();
  await page.waitForTimeout(2000);
}

async function waitForTestEditor(page: Page, editorKey: string, maxWait = 10000) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWait) {
    const hasEditor = await page.evaluate(
      (key) => !!(window as any).__COURIER_CREATE_TEST__?.editors?.[key],
      editorKey
    );
    if (hasEditor) return true;
    await page.waitForTimeout(500);
  }
  return false;
}

async function typeAndSelect(page: Page, text: string) {
  const editor = page.locator(".tiptap.ProseMirror").first();
  await editor.click({ force: true });
  await page.waitForTimeout(300);
  await page.keyboard.type(text);
  await page.keyboard.press("Home");
  await page.keyboard.press("Shift+End");
  await page.waitForTimeout(500);
}

test.describe("Teams - Content type picker", () => {
  test.beforeEach(async ({ page }) => {
    await setupMockedTest(page, mockTemplateDataSamples.allChannelsTemplate);
    await page.waitForTimeout(2000);
  });

  test("content type picker is hidden (no heading support)", async ({ page }) => {
    await addChannel(page, "Teams");
    const editorReady = await waitForTestEditor(page, "teams");
    expect(editorReady).toBe(true);

    await typeAndSelect(page, "Test text");

    const contentTypePicker = page.locator("button").filter({ hasText: /Normal text|Heading/i });
    await page.waitForTimeout(1000);
    const count = await contentTypePicker.count();
    expect(count).toBe(0);
  });

  test("paragraph text does not break words mid-character", async ({ page }) => {
    await addChannel(page, "Teams");
    const editorReady = await waitForTestEditor(page, "teams");
    expect(editorReady).toBe(true);

    const wordBreakValue = await page.evaluate(() => {
      const editor = document.querySelector(".courier-msteams-editor .ProseMirror");
      if (!editor) return null;
      const p = editor.querySelector("p");
      if (!p) return null;
      return window.getComputedStyle(p).wordBreak;
    });

    expect(wordBreakValue).toBe("normal");
  });
});
