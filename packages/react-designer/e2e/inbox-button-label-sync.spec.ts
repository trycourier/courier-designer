import { test, expect, type Page, type Locator } from "@playwright/test";
import { mockTemplateResponse, mockTemplateDataSamples } from "./template-test-utils";

const INBOX_EDITOR_SELECTOR =
  '.courier-inbox-editor .tiptap.ProseMirror[contenteditable="true"]';

function getInboxEditor(page: Page): Locator {
  return page.locator(INBOX_EDITOR_SELECTOR);
}

/**
 * Set up inbox channel with action elements and switch to it.
 * Follows the exact pattern from setupChannelTest in sidebar-selection-focus-channels.spec.ts:
 * 1. Mock empty template
 * 2. Navigate and wait for editor
 * 3. Programmatically add inbox channel content via setTemplateEditorContent
 * 4. Switch to inbox via setChannel
 * 5. Wait for the inbox editor to appear
 */
async function setupInboxChannel(
  page: Page,
  inboxElements: any[]
) {
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

  // Add inbox channel to template content
  await page.evaluate((elements) => {
    const testObj = (window as any).__COURIER_CREATE_TEST__;
    const content = testObj?.getTemplateEditorContent?.();
    if (content && testObj?.setTemplateEditorContent) {
      testObj.setTemplateEditorContent({
        ...content,
        elements: [
          ...(content.elements || []),
          { type: "channel", channel: "inbox", elements },
        ],
      });
    }
  }, inboxElements);

  await page.waitForTimeout(500);

  // Switch to inbox channel
  await page.evaluate(() => {
    (window as any).__COURIER_CREATE_TEST__?.setChannel?.("inbox");
  });

  const editor = getInboxEditor(page);
  await expect(editor).toBeVisible({ timeout: 15000 });

  // Point currentEditor to the inbox editor
  await page.waitForFunction(
    () => {
      const testObj = (window as any).__COURIER_CREATE_TEST__;
      return testObj?.editors?.inbox !== null && testObj?.editors?.inbox !== undefined;
    },
    { timeout: 10000 }
  );

  await page.evaluate(() => {
    const testObj = (window as any).__COURIER_CREATE_TEST__;
    if (testObj?.editors?.inbox) {
      testObj.currentEditor = testObj.editors.inbox;
    }
  });

  await editor.click({ force: true });
  await page.waitForTimeout(500);
}

async function getSidebarLabelInput(page: Page, index = 0) {
  const form = page.locator("[data-sidebar-form]");
  await expect(form).toBeVisible({ timeout: 10000 });

  const labelInput = form.locator('input[placeholder="Enter text"]').nth(index);
  await expect(labelInput).toBeVisible({ timeout: 10000 });
  return labelInput;
}

// Inbox content fixtures
const oneButtonElements = [
  { type: "text", content: "Title", text_style: "h2" },
  { type: "text", content: "Body text" },
  {
    type: "action",
    content: "Click me",
    href: "https://example.com",
    align: "left",
  },
];

const defaultButtonElements = [
  { type: "text", content: "Title", text_style: "h2" },
  { type: "text", content: "Body text" },
  {
    type: "action",
    content: "Enter text",
    href: "",
    align: "left",
  },
];

const twoButtonElements = [
  { type: "text", content: "Title", text_style: "h2" },
  { type: "text", content: "Body text" },
  {
    type: "action",
    content: "Primary",
    href: "https://example.com/primary",
    align: "left",
  },
  {
    type: "action",
    content: "Secondary",
    href: "https://example.com/secondary",
    align: "left",
  },
];

test.describe("Inbox Button Label Sync", () => {
  test.describe("Default text", () => {
    test("should show 'Enter text' as default button label", async ({ page }) => {
      await setupInboxChannel(page, defaultButtonElements);

      const labelInput = await getSidebarLabelInput(page);
      const value = await labelInput.inputValue();
      expect(value).toBe("Enter text");
    });
  });

  test.describe("Sidebar to editor sync (single button)", () => {
    test("should sync sidebar label to editor button text", async ({ page }) => {
      await setupInboxChannel(page, oneButtonElements);

      const labelInput = await getSidebarLabelInput(page);

      await labelInput.clear();
      await labelInput.fill("New Label");
      await page.waitForTimeout(300);

      const editor = getInboxEditor(page);
      await expect(editor).toContainText("New Label");
    });

    test("should reflect each keystroke immediately", async ({ page }) => {
      await setupInboxChannel(page, oneButtonElements);

      const labelInput = await getSidebarLabelInput(page);

      await labelInput.clear();
      await labelInput.type("ABC", { delay: 50 });
      await page.waitForTimeout(200);

      const editor = getInboxEditor(page);
      await expect(editor).toContainText("ABC");
    });
  });

  test.describe("Editor to sidebar sync (single button)", () => {
    test("should sync editor button text to sidebar label", async ({ page }) => {
      await setupInboxChannel(page, oneButtonElements);

      // Verify label input exists and has initial value before modifying
      const labelInput = await getSidebarLabelInput(page);
      await expect(labelInput).toHaveValue("Click me");

      // Update the button label via TipTap chain command (same approach as useInboxButtonSync)
      await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return;

        let buttonPos = -1;
        editor.state.doc.descendants(
          (node: { type: { name: string } }, pos: number) => {
            if (node.type.name === "button" && buttonPos === -1) {
              buttonPos = pos;
              return false;
            }
          }
        );

        if (buttonPos >= 0) {
          editor.chain().command(({ tr }: { tr: any; dispatch: boolean }) => {
            const node = tr.doc.nodeAt(buttonPos);
            if (!node) return false;

            tr.setNodeMarkup(buttonPos, node.type, {
              ...node.attrs,
              label: "From Editor",
            });
            const from = buttonPos + 1;
            const to = buttonPos + 1 + node.content.size;
            if (to > from) {
              tr.replaceWith(from, to, editor.state.schema.text("From Editor"));
            }
            return true;
          }).run();
        }
      });

      // Use Playwright's auto-retry assertion
      await expect(labelInput).toHaveValue("From Editor", { timeout: 5000 });
    });
  });

  test.describe("Sidebar to editor sync (two buttons / buttonRow)", () => {
    test("should sync primary label to editor in buttonRow mode", async ({ page }) => {
      await setupInboxChannel(page, twoButtonElements);

      const firstLabel = await getSidebarLabelInput(page, 0);

      await firstLabel.clear();
      await firstLabel.fill("Updated Primary");
      await page.waitForTimeout(300);

      const editor = getInboxEditor(page);
      await expect(editor).toContainText("Updated Primary");
    });

    test("should sync secondary label to editor in buttonRow mode", async ({ page }) => {
      await setupInboxChannel(page, twoButtonElements);

      const secondLabel = await getSidebarLabelInput(page, 1);

      await secondLabel.clear();
      await secondLabel.fill("Updated Secondary");
      await page.waitForTimeout(300);

      const editor = getInboxEditor(page);
      await expect(editor).toContainText("Updated Secondary");
    });
  });

  test.describe("Editor to sidebar sync (two buttons / buttonRow)", () => {
    test("should sync editor buttonRow label to sidebar", async ({ page }) => {
      await setupInboxChannel(page, twoButtonElements);

      // Verify label input exists and has initial value before modifying
      const labelInput = await getSidebarLabelInput(page, 0);
      await expect(labelInput).toHaveValue("Primary");

      await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return;

        let buttonRowPos = -1;
        editor.state.doc.descendants(
          (node: { type: { name: string } }, pos: number) => {
            if (node.type.name === "buttonRow" && buttonRowPos === -1) {
              buttonRowPos = pos;
              return false;
            }
          }
        );

        if (buttonRowPos >= 0) {
          editor.chain().command(({ tr }: { tr: any }) => {
            const node = tr.doc.nodeAt(buttonRowPos);
            if (!node) return false;
            tr.setNodeMarkup(buttonRowPos, undefined, {
              ...node.attrs,
              button1Label: "EditorPrimary",
            });
            return true;
          }).run();
        }
      });

      // Use Playwright's auto-retry assertion
      await expect(labelInput).toHaveValue("EditorPrimary", { timeout: 5000 });
    });
  });
});
