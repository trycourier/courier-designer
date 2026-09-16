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

async function getContentTypeMenuLabels(page: Page) {
  const contentTypePicker = page.locator("button").filter({ hasText: /Normal text|Heading/i });
  await expect(contentTypePicker.first()).toBeVisible({ timeout: 5000 });
  await contentTypePicker.first().click();
  await page.waitForTimeout(300);

  const menuItems = page.locator('[role="menuitem"]');
  const count = await menuItems.count();
  const labels: string[] = [];
  for (let i = 0; i < count; i++) {
    const text = await menuItems.nth(i).textContent();
    if (text) labels.push(text.trim());
  }
  return { menuItems, labels };
}

test.describe("Slack - Content type picker", () => {
  test.beforeEach(async ({ page }) => {
    await setupMockedTest(page, mockTemplateDataSamples.allChannelsTemplate);
    await page.waitForTimeout(2000);
  });

  test("content type picker only shows Normal text and Heading", async ({ page }) => {
    await addChannel(page, "Slack");
    const editorReady = await waitForTestEditor(page, "slack");
    expect(editorReady).toBe(true);

    await typeAndSelect(page, "Test heading");
    const { labels } = await getContentTypeMenuLabels(page);

    expect(labels).toContain("Normal text");
    expect(labels).toContain("Heading");
    expect(labels).not.toContain("Heading 1");
    expect(labels).not.toContain("Heading 2");
    expect(labels).not.toContain("Heading 3");
  });

  test("clicking Heading sets H1 and Elemental output has text_style h1", async ({ page }) => {
    await addChannel(page, "Slack");
    const editorReady = await waitForTestEditor(page, "slack");
    expect(editorReady).toBe(true);

    await typeAndSelect(page, "Test heading");
    const { menuItems } = await getContentTypeMenuLabels(page);

    const headingItem = menuItems.filter({ hasText: /^Heading$/ });
    await expect(headingItem).toBeVisible();
    await headingItem.first().click();
    await page.waitForTimeout(500);

    const result = await page.evaluate(() => {
      const ctx = (window as any).__COURIER_CREATE_TEST__;
      const editor = ctx?.editors?.slack;
      if (!editor) return null;
      const json = editor.getJSON();
      const headingNode = json.content?.find((n: any) => n.type === "heading");
      return { hasHeading: !!headingNode, level: headingNode?.attrs?.level };
    });

    expect(result?.hasHeading).toBe(true);
    expect(result?.level).toBe(1);

    const elemental = await page.evaluate(() => {
      const ctx = (window as any).__COURIER_CREATE_TEST__;
      const content = ctx?.getTemplateEditorContent?.() || ctx?.templateEditorContent;
      if (!content?.elements) return null;
      const slackChannel = content.elements.find(
        (el: any) => el.type === "channel" && el.channel === "slack"
      );
      return slackChannel?.elements || null;
    });

    expect(elemental).toBeTruthy();
    const headingElement = elemental.find(
      (el: any) => el.type === "text" && el.text_style === "h1"
    );
    expect(headingElement).toBeTruthy();
    expect(headingElement.text_style).toBe("h1");
  });

  test("paragraph text does not break words mid-character", async ({ page }) => {
    await addChannel(page, "Slack");
    const editorReady = await waitForTestEditor(page, "slack");
    expect(editorReady).toBe(true);

    const wordBreakValue = await page.evaluate(() => {
      const editor = document.querySelector(".courier-slack-editor .ProseMirror");
      if (!editor) return null;
      const p = editor.querySelector("p");
      if (!p) return null;
      return window.getComputedStyle(p).wordBreak;
    });

    expect(wordBreakValue).toBe("normal");
  });

  test("underline is disabled (button hidden and shortcut inactive)", async ({ page }) => {
    await addChannel(page, "Slack");
    const editorReady = await waitForTestEditor(page, "slack");
    expect(editorReady).toBe(true);

    await typeAndSelect(page, "Test underline");

    // The underline button should not be visible in the bubble menu
    const underlineBtn = page.locator('[data-testid="underline"]');
    await expect(underlineBtn).toHaveCount(0);

    // Cmd/Ctrl+U shortcut should have no effect
    const hadUnderlineBefore = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.editors?.slack;
      return editor?.isActive("underline") ?? null;
    });
    expect(hadUnderlineBefore).toBe(false);

    await page.keyboard.press("ControlOrMeta+u");
    await page.waitForTimeout(300);

    const hasUnderlineAfter = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.editors?.slack;
      return editor?.isActive("underline") ?? null;
    });
    expect(hasUnderlineAfter).toBe(false);
  });

  test("pasting H2/H3 from email normalizes to H1", async ({ page }) => {
    await addChannel(page, "Slack");
    const editorReady = await waitForTestEditor(page, "slack");
    expect(editorReady).toBe(true);

    // Paste HTML with H2 and H3 headings (simulating copy from Email)
    const pasteHtml = [
      '<div data-type="heading"><h2 style="text-align: center" data-text-align="center" data-background-color="red" data-border-width="2" data-border-color="blue">Centered H2</h2></div>',
      '<div data-type="heading"><h3 data-text-align="right">Right H3</h3></div>',
      '<div data-type="paragraph"><p style="text-align: justify" data-text-align="justify" data-background-color="yellow">Justified paragraph</p></div>',
    ].join("");

    await page.evaluate((html) => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.editors?.slack;
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
      const ed = (window as any).__COURIER_CREATE_TEST__?.editors?.slack;
      if (!ed) return null;
      const headings: any[] = [];
      const paragraphs: any[] = [];
      ed.state.doc.descendants((node: any) => {
        if (node.type.name === "heading") {
          headings.push({ level: node.attrs.level, textAlign: node.attrs.textAlign, backgroundColor: node.attrs.backgroundColor, borderWidth: node.attrs.borderWidth });
        }
        if (node.type.name === "paragraph" && node.textContent) {
          paragraphs.push({ textAlign: node.attrs.textAlign, backgroundColor: node.attrs.backgroundColor });
        }
      });
      return { headings, paragraphs };
    });

    expect(result).not.toBeNull();
    // All headings should be normalized to level 1
    for (const h of result!.headings) {
      expect(h.level).toBe(1);
      expect(h.textAlign).toBe("left");
      expect(h.backgroundColor).toBe("transparent");
      expect(h.borderWidth).toBe(0);
    }
    // Paragraphs should have alignment reset
    const justifiedP = result!.paragraphs.find((p: any) => p.backgroundColor !== "transparent" || p.textAlign !== "left");
    expect(justifiedP).toBeUndefined();
  });

  test("Email: supports all heading levels (1, 2, 3) via editor API", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await expect(editor).toBeVisible({ timeout: 10000 });

    for (const level of [1, 2, 3]) {
      const result = await page.evaluate((lvl) => {
        const ctx = (window as any).__COURIER_CREATE_TEST__;
        const ed = ctx?.editors?.email;
        if (!ed) return null;
        ed.commands.clearContent();
        ed.commands.focus();
        ed.commands.insertContent("Heading test");
        ed.chain().selectAll().setNode("heading", { level: lvl }).run();
        const json = ed.getJSON();
        const headingNode = json.content?.find((n: any) => n.type === "heading");
        return { level: headingNode?.attrs?.level };
      }, level);

      expect(result?.level).toBe(level);
    }
  });
});
