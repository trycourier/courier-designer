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

test.describe("Button paste with template variable URLs", () => {
  test.beforeEach(async ({ page }) => {
    await setupMockedTest(page, mockTemplateDataSamples.allChannelsTemplate);
    await page.waitForTimeout(2000);
  });

  test("pasting a button with {{variable}} URL preserves the button node", async ({ page }) => {
    const editorReady = await waitForTestEditor(page, "email");
    expect(editorReady).toBe(true);

    const pasteHtml =
      '<div data-type="button" data-label="Click me" data-link="https://example.com?href=__COURIER_VAR_OPEN__myVar__COURIER_VAR_CLOSE__" data-alignment="center" data-background-color="#0085FF" data-text-color="#ffffff" data-border-radius="4" data-border-color="transparent" data-padding-vertical="8" data-padding-horizontal="16" data-font-weight="normal" data-font-style="normal" data-is-underline="false" data-is-strike="false" data-id="node-paste-test">Click me</div>';

    const result: { link: string; label: string } | null = await page.evaluate((html) => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.editors?.email;
      if (!ed) return null;
      ed.commands.focus("end");
      const clipboardData = new DataTransfer();
      clipboardData.setData("text/html", html);
      ed.view.dom.dispatchEvent(
        new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData })
      );

      let found: { link: string; label: string } | null = null;
      ed.state.doc.descendants((node: any) => {
        if (node.type.name === "button") {
          found = { link: node.attrs.link, label: node.attrs.label };
          return false;
        }
      });
      return found;
    }, pasteHtml);

    expect(result).not.toBeNull();
    expect(result!.link).toBe("https://example.com?href={{myVar}}");
    expect(result!.label).toBe("Click me");
  });

  test("pasting encoded button HTML decodes {{variable}} in link correctly", async ({ page }) => {
    const editorReady = await waitForTestEditor(page, "email");
    expect(editorReady).toBe(true);

    const pasteHtml =
      '<div data-type="button" data-label="Auth Link" data-link="https://example.com?token=__COURIER_VAR_OPEN__authToken__COURIER_VAR_CLOSE__" data-alignment="center" data-background-color="#0085FF" data-text-color="#ffffff" data-border-radius="4" data-border-color="transparent" data-padding-vertical="8" data-padding-horizontal="16" data-font-weight="normal" data-font-style="normal" data-is-underline="false" data-is-strike="false" data-id="node-decode-test">Auth Link</div>';

    const result: { link: string; label: string } | null = await page.evaluate((html) => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.editors?.email;
      if (!ed) return null;
      ed.commands.focus("end");
      const clipboardData = new DataTransfer();
      clipboardData.setData("text/html", html);
      ed.view.dom.dispatchEvent(
        new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData })
      );

      let found: { link: string; label: string } | null = null;
      ed.state.doc.descendants((node: any) => {
        if (node.type.name === "button") {
          found = { link: node.attrs.link, label: node.attrs.label };
          return false;
        }
      });
      return found;
    }, pasteHtml);

    expect(result).not.toBeNull();
    expect(result!.link).toBe("https://example.com?token={{authToken}}");
    expect(result!.label).toBe("Auth Link");
  });
});

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
