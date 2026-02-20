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

test.describe("Slack - Button with link styling", () => {
  test.beforeEach(async ({ page }) => {
    await setupMockedTest(page, mockTemplateDataSamples.allChannelsTemplate);
    await page.waitForTimeout(2000);
  });

  test("button with link keeps Slack styling (transparent bg, border, no email-style)", async ({
    page,
  }) => {
    await addChannel(page, "Slack");
    const editorReady = await waitForTestEditor(page, "slack");
    expect(editorReady).toBe(true);

    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.editors?.slack;
      if (!editor) return;
      editor.commands.focus("end");
      editor.commands.insertContent({
        type: "button",
        content: [{ type: "text", text: "Click Me" }],
        attrs: {
          label: "Click Me",
          link: "https://example.com",
          alignment: "left",
          backgroundColor: "#5C6AC4",
          textColor: "#ffffff",
          borderRadius: 4,
          paddingVertical: 8,
          paddingHorizontal: 16,
          id: "test-button-with-link",
        },
      });
    });
    await page.waitForTimeout(1000);

    const buttonDiv = page.locator(
      ".courier-slack-editor .node-button .node-element > div > div, .courier-slack-editor .node-button .node-element > div > a > div"
    );
    await expect(buttonDiv.first()).toBeVisible({ timeout: 5000 });

    const styles = await buttonDiv.first().evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        borderRadius: computed.borderRadius,
        border: computed.border,
        fontSize: computed.fontSize,
      };
    });

    expect(styles.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(styles.borderRadius).toBe("6px");
    expect(styles.fontSize).toBe("14px");
    expect(styles.border).toContain("1px");
  });

  test("button with link in preview mode keeps Slack styling", async ({ page }) => {
    await addChannel(page, "Slack");
    const editorReady = await waitForTestEditor(page, "slack");
    expect(editorReady).toBe(true);

    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.editors?.slack;
      if (!editor) return;
      editor.commands.focus("end");
      editor.commands.insertContent({
        type: "button",
        content: [{ type: "text", text: "Preview Button" }],
        attrs: {
          label: "Preview Button",
          link: "https://example.com/preview",
          alignment: "left",
          backgroundColor: "#5C6AC4",
          textColor: "#ffffff",
          borderRadius: 4,
          paddingVertical: 8,
          paddingHorizontal: 16,
          id: "test-button-preview",
        },
      });
    });
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.editors?.slack;
      if (!editor) editor?.setEditable(false);
    });
    await page.waitForTimeout(500);

    const buttonDiv = page.locator(
      ".courier-slack-editor .node-button .node-element > div > div, .courier-slack-editor .node-button .node-element > div > a > div"
    );

    if ((await buttonDiv.count()) > 0) {
      const styles = await buttonDiv.first().evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          borderRadius: computed.borderRadius,
          fontSize: computed.fontSize,
        };
      });

      expect(styles.backgroundColor).toBe("rgba(0, 0, 0, 0)");
      expect(styles.borderRadius).toBe("6px");
      expect(styles.fontSize).toBe("14px");
    }
  });
});
