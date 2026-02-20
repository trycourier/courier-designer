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

  test("pasting headings from email converts them to paragraphs", async ({ page }) => {
    await addChannel(page, "Teams");
    const editorReady = await waitForTestEditor(page, "teams");
    expect(editorReady).toBe(true);

    const pasteHtml = [
      '<div data-type="heading"><h1 data-text-align="center">H1 heading</h1></div>',
      '<div data-type="heading"><h2 data-text-align="right" data-background-color="red">H2 heading</h2></div>',
      '<div data-type="paragraph"><p style="text-align: justify" data-text-align="justify">Justified text</p></div>',
    ].join("");

    await page.evaluate((html) => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.editors?.teams;
      if (!ed) return;
      ed.commands.focus();
      const clipboardData = new DataTransfer();
      clipboardData.setData("text/html", html);
      ed.view.dom.dispatchEvent(
        new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData })
      );
    }, pasteHtml);

    await page.waitForTimeout(500);

    const result = await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.editors?.teams;
      if (!ed) return null;
      const headings: any[] = [];
      const paragraphs: any[] = [];
      ed.state.doc.descendants((node: any) => {
        if (node.type.name === "heading") headings.push(node.attrs);
        if (node.type.name === "paragraph" && node.textContent) {
          paragraphs.push({ textAlign: node.attrs.textAlign, backgroundColor: node.attrs.backgroundColor });
        }
      });
      return { headingCount: headings.length, paragraphs };
    });

    expect(result).not.toBeNull();
    // No headings should remain — all converted to paragraphs
    expect(result!.headingCount).toBe(0);
    // All paragraphs should have alignment/bg reset to defaults
    for (const p of result!.paragraphs) {
      expect(p.textAlign).toBe("left");
      expect(p.backgroundColor).toBe("transparent");
    }
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
