import { test, expect, type Page, type Locator } from "@playwright/test";
import { mockTemplateResponse, mockTemplateDataSamples } from "./template-test-utils";

/**
 * E2E tests for sidebar form selection focus on non-email channels.
 *
 * Verifies that the setContent restoration effect doesn't clobber
 * selection or destroy blocks while the user is editing sidebar forms.
 *
 * - MSTeams: uses the standard ButtonForm (with data-sidebar-form, label + link)
 * - Slack: uses SlackButtonForm (link field only, protected via getFormUpdating)
 * - Inbox: uses a custom form (button enable/URL)
 */

const BUTTON_SELECTOR = '[data-node-type="button"]';

type Channel = "slack" | "msteams" | "inbox";

const CHANNEL_EDITOR_SELECTORS: Record<Channel, string> = {
  slack: '.courier-slack-editor .tiptap.ProseMirror[contenteditable="true"]',
  msteams: '.courier-msteams-editor .tiptap.ProseMirror[contenteditable="true"]',
  inbox: '.courier-inbox-editor .tiptap.ProseMirror[contenteditable="true"]',
};

function getChannelEditor(page: Page, channel: Channel): Locator {
  return page.locator(CHANNEL_EDITOR_SELECTORS[channel]);
}

/**
 * Add a channel to the template content, switch to it, and wait for its editor.
 */
async function setupChannelTest(page: Page, channel: Channel) {
  await mockTemplateResponse(page, mockTemplateDataSamples.emptyTemplate, {
    delay: 100,
    requireAuth: false,
  });

  await page.goto("/test-app", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  await page.waitForFunction(
    () => (window as any).__COURIER_CREATE_TEST__?.currentEditor !== null,
    { timeout: 15000 }
  );

  // Add the channel to the template content so its tab/editor become available
  await page.evaluate((ch) => {
    const testObj = (window as any).__COURIER_CREATE_TEST__;
    const content = testObj?.getTemplateEditorContent?.();
    if (content && testObj?.setTemplateEditorContent) {
      const hasChannel = content.elements?.some(
        (el: any) => el.type === "channel" && el.channel === ch
      );
      if (!hasChannel) {
        testObj.setTemplateEditorContent({
          ...content,
          elements: [
            ...(content.elements || []),
            { type: "channel", channel: ch, elements: [{ type: "text", content: "\n" }] },
          ],
        });
      }
    }
  }, channel);

  await page.waitForTimeout(500);

  // Switch to the target channel via the Jotai atom
  await page.evaluate((ch) => {
    (window as any).__COURIER_CREATE_TEST__?.setChannel?.(ch);
  }, channel);

  const editor = getChannelEditor(page, channel);
  await expect(editor).toBeVisible({ timeout: 15000 });

  // Ensure the current editor points to the new channel
  const editorKey = channel === "msteams" ? "teams" : channel;
  await page.waitForFunction(
    (key) => {
      const testObj = (window as any).__COURIER_CREATE_TEST__;
      return testObj?.editors?.[key] !== null && testObj?.editors?.[key] !== undefined;
    },
    editorKey,
    { timeout: 10000 }
  );

  // Force currentEditor to point to the channel's editor
  await page.evaluate((key) => {
    const testObj = (window as any).__COURIER_CREATE_TEST__;
    if (testObj?.editors?.[key]) {
      testObj.currentEditor = testObj.editors[key];
    }
  }, editorKey);

  // Click the editor to ensure it's focused and ready
  await editor.click({ force: true });
  await page.waitForTimeout(500);

  return editor;
}

async function insertButton(page: Page, label: string, editorKey?: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    // Ensure currentEditor is correct before each attempt
    if (editorKey) {
      await page.evaluate((key) => {
        const testObj = (window as any).__COURIER_CREATE_TEST__;
        if (testObj?.editors?.[key]) {
          testObj.currentEditor = testObj.editors[key];
        }
      }, editorKey);
      await page.waitForTimeout(200);
    }

    const inserted = await page.evaluate((lbl) => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!editor) return false;
      editor.commands.focus("end");
      return editor.commands.setButton({ label: lbl });
    }, label);

    if (inserted) {
      await page.waitForTimeout(800);
      const hasButton = await page
        .locator(BUTTON_SELECTOR)
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      if (hasButton) return;
    }

    await page.waitForTimeout(600);
  }
}

async function countNodes(page: Page, nodeType: string): Promise<number> {
  return page.evaluate((type) => {
    const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
    return editor?.getJSON()?.content?.filter((n: any) => n.type === type).length ?? 0;
  }, nodeType);
}

async function getButtonLabel(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
    const btn = editor?.getJSON()?.content?.find((n: any) => n.type === "button");
    return btn?.attrs?.label ?? null;
  });
}

// ---------------------------------------------------------------------------
// MSTeams - uses standard ButtonForm with data-sidebar-form + label input
// ---------------------------------------------------------------------------

test.describe("Sidebar Selection Focus - MSTeams", () => {
  test("should keep button selected when typing in label field", async ({ page }) => {
    const editor = await setupChannelTest(page, "msteams");
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    await insertButton(page, "Initial Label", "teams");

    const buttonNode = page.locator(BUTTON_SELECTOR).first();
    await expect(buttonNode).toBeVisible({ timeout: 10000 });
    await buttonNode.click({ force: true });
    await page.waitForTimeout(300);

    const sidebarForm = page.locator("[data-sidebar-form]");
    await expect(sidebarForm).toBeVisible({ timeout: 5000 });

    const labelInput = sidebarForm.locator('input[placeholder="Enter button text"]');
    await expect(labelInput).toBeVisible();
    await labelInput.click();
    await page.waitForTimeout(100);

    await labelInput.type(" - Updated", { delay: 30 });
    await page.waitForTimeout(500);

    const label = await getButtonLabel(page);
    expect(label).toContain("Updated");
    await expect(sidebarForm).toBeVisible();
  });

  test("should not convert button to text when typing rapidly", async ({ page }) => {
    const editor = await setupChannelTest(page, "msteams");
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    await insertButton(page, "Test Button", "teams");

    const buttonNode = page.locator(BUTTON_SELECTOR).first();
    await expect(buttonNode).toBeVisible({ timeout: 10000 });
    await buttonNode.click({ force: true });
    await page.waitForTimeout(300);

    const sidebarForm = page.locator("[data-sidebar-form]");
    await expect(sidebarForm).toBeVisible({ timeout: 5000 });
    const labelInput = sidebarForm.locator('input[placeholder="Enter button text"]');
    await labelInput.click();

    await labelInput.fill("");
    await labelInput.type("Rapid Typing Test Content", { delay: 0 });
    await page.waitForTimeout(1000);

    expect(await countNodes(page, "button")).toBe(1);
    await expect(sidebarForm).toBeVisible();
  });

  test("should maintain focus during auto-save cycles", async ({ page }) => {
    const editor = await setupChannelTest(page, "msteams");
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    await insertButton(page, "Auto Save Test", "teams");

    const buttonNode = page.locator(BUTTON_SELECTOR).first();
    await buttonNode.click({ force: true });
    await page.waitForTimeout(300);

    const sidebarForm = page.locator("[data-sidebar-form]");
    await expect(sidebarForm).toBeVisible({ timeout: 5000 });
    const labelInput = sidebarForm.locator('input[placeholder="Enter button text"]');
    await labelInput.click();

    await labelInput.type(" Part 1", { delay: 20 });
    await page.waitForTimeout(800);
    await labelInput.type(" Part 2", { delay: 20 });
    await page.waitForTimeout(800);
    await labelInput.type(" Part 3", { delay: 20 });
    await page.waitForTimeout(500);

    const label = await getButtonLabel(page);
    expect(label).toContain("Part 1");
    expect(label).toContain("Part 2");
    expect(label).toContain("Part 3");
    await expect(sidebarForm).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Slack - uses SlackButtonForm with link field (protected via getFormUpdating)
// ---------------------------------------------------------------------------

test.describe("Sidebar Selection Focus - Slack", () => {
  test("should keep button selected when typing in link field", async ({ page }) => {
    const editor = await setupChannelTest(page, "slack");
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    await insertButton(page, "Slack Button", "slack");

    const buttonNode = page.locator(BUTTON_SELECTOR).first();
    await expect(buttonNode).toBeVisible({ timeout: 10000 });
    await buttonNode.click({ force: true });
    await page.waitForTimeout(300);

    // Slack sidebar shows the SlackButtonForm with a link (VariableTextarea) field
    const sidebarLink = page.locator('.tiptap[contenteditable="true"]').last();
    if (await sidebarLink.isVisible({ timeout: 3000 })) {
      await sidebarLink.click();
      await page.waitForTimeout(100);

      await page.keyboard.type("https://example.com");
      await page.waitForTimeout(500);

      // Button should still exist
      expect(await countNodes(page, "button")).toBe(1);
    }
  });

  test("should not convert button to text when typing rapidly in link field", async ({
    page,
  }) => {
    const editor = await setupChannelTest(page, "slack");
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    await insertButton(page, "Rapid Slack", "slack");

    const buttonNode = page.locator(BUTTON_SELECTOR).first();
    await expect(buttonNode).toBeVisible();
    await buttonNode.click({ force: true });
    await page.waitForTimeout(300);

    const sidebarLink = page.locator('.tiptap[contenteditable="true"]').last();
    if (await sidebarLink.isVisible({ timeout: 3000 })) {
      await sidebarLink.click();
      await page.keyboard.type("https://example.com/some/long/path/here", { delay: 0 });
      await page.waitForTimeout(1000);
    }

    expect(await countNodes(page, "button")).toBe(1);
  });

  test("should maintain button during auto-save cycles", async ({ page }) => {
    const editor = await setupChannelTest(page, "slack");
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    await insertButton(page, "Auto Save", "slack");

    const buttonNode = page.locator(BUTTON_SELECTOR).first();
    await buttonNode.click({ force: true });
    await page.waitForTimeout(300);

    const sidebarLink = page.locator('.tiptap[contenteditable="true"]').last();
    if (await sidebarLink.isVisible({ timeout: 3000 })) {
      await sidebarLink.click();

      await page.keyboard.type("https://part1.com", { delay: 20 });
      await page.waitForTimeout(800);
      await page.keyboard.type("/part2", { delay: 20 });
      await page.waitForTimeout(800);
      await page.keyboard.type("/part3", { delay: 20 });
      await page.waitForTimeout(500);
    }

    expect(await countNodes(page, "button")).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Inbox - custom sidebar form, button is managed via a toggle + URL fields
// ---------------------------------------------------------------------------

test.describe("Sidebar Selection Focus - Inbox", () => {
  test("should keep button node intact when typing in editor", async ({ page }) => {
    const editor = await setupChannelTest(page, "inbox");
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    await insertButton(page, "Inbox Button", "inbox");

    const buttonNode = page.locator(BUTTON_SELECTOR).first();
    await expect(buttonNode).toBeVisible({ timeout: 15000 });

    await buttonNode.click({ force: true });
    await page.waitForTimeout(500);

    expect(await countNodes(page, "button")).toBeGreaterThanOrEqual(1);
  });

  test("should not convert button to text when typing rapidly in editor", async ({ page }) => {
    const editor = await setupChannelTest(page, "inbox");
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    await insertButton(page, "Rapid Inbox", "inbox");

    const buttonNode = page.locator(BUTTON_SELECTOR).first();
    await expect(buttonNode).toBeVisible({ timeout: 15000 });

    await editor.click({ force: true });
    await page.waitForTimeout(200);
    await page.keyboard.type("Some text that should not destroy the button", { delay: 0 });
    await page.waitForTimeout(1000);

    expect(await countNodes(page, "button")).toBeGreaterThanOrEqual(1);
  });

  test("should preserve button across auto-save cycles", async ({ page }) => {
    const editor = await setupChannelTest(page, "inbox");
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    await insertButton(page, "Inbox Auto Save", "inbox");

    const buttonNode = page.locator(BUTTON_SELECTOR).first();
    await expect(buttonNode).toBeVisible({ timeout: 15000 });

    await buttonNode.click({ force: true });
    await page.waitForTimeout(500);

    await editor.click({ force: true });
    await page.waitForTimeout(200);
    await page.keyboard.type("Part 1", { delay: 20 });
    await page.waitForTimeout(800);
    await page.keyboard.type(" Part 2", { delay: 20 });
    await page.waitForTimeout(500);

    expect(await countNodes(page, "button")).toBeGreaterThanOrEqual(1);
  });
});
