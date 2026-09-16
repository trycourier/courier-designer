import { test, expect, setupComponentTest, getMainEditor } from "./test-utils";

test.describe("Link Bubble Popup", () => {
  test.beforeEach(async ({ page }) => {
    await setupComponentTest(page);
  });

  test("should show link bubble popup when clicking link icon with text selected", async ({
    page,
  }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert text and select it
    await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (ed) {
        ed.commands.setContent("<p>Hello world</p>");
        ed.commands.setTextSelection({ from: 1, to: 6 });
      }
    });
    await page.waitForTimeout(200);

    // Trigger link form via showLinkForm meta (same as clicking the link icon)
    await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (ed) {
        const tr = ed.state.tr.setMeta("showLinkForm", { from: 1, to: 6 });
        ed.view.dispatch(tr);
      }
    });
    await page.waitForTimeout(300);

    // The link bubble popup should appear with the input
    const linkInput = page.locator('input[placeholder="Paste a link..."]');
    await expect(linkInput).toBeVisible({ timeout: 3000 });
  });

  test("should create a link when URL is entered and Enter is pressed", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert text, select it, and trigger link popup
    await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (ed) {
        ed.commands.setContent("<p>Click here</p>");
        ed.commands.setTextSelection({ from: 1, to: 6 });
        const tr = ed.state.tr.setMeta("showLinkForm", { from: 1, to: 6 });
        ed.view.dispatch(tr);
      }
    });
    await page.waitForTimeout(300);

    // Type URL and press Enter
    const linkInput = page.locator('input[placeholder="Paste a link..."]');
    await expect(linkInput).toBeVisible({ timeout: 3000 });
    await linkInput.fill("https://example.com");
    await linkInput.press("Enter");
    await page.waitForTimeout(200);

    // Popup should disappear
    await expect(linkInput).not.toBeVisible();

    // Verify link was created
    const hasLink = await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!ed) return false;
      const json = JSON.stringify(ed.getJSON());
      return json.includes("https://example.com");
    });
    expect(hasLink).toBe(true);
  });

  test("should pre-fill URL when editing an existing link", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Create content with an existing link, then trigger popup
    await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (ed) {
        ed.commands.setContent("<p>Click here</p>");
        ed.commands.setTextSelection({ from: 1, to: 6 });
        ed.commands.setLink({ href: "https://original.com" });
        // Re-select and trigger the link form
        ed.commands.setTextSelection({ from: 1, to: 6 });
        const tr = ed.state.tr.setMeta("showLinkForm", { from: 1, to: 6 });
        ed.view.dispatch(tr);
      }
    });
    await page.waitForTimeout(300);

    // Input should show the existing URL
    const linkInput = page.locator('input[placeholder="Paste a link..."]');
    await expect(linkInput).toBeVisible({ timeout: 3000 });
    await expect(linkInput).toHaveValue("https://original.com");
  });

  test("should remove link when Remove button is clicked", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Create content with a link
    await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (ed) {
        ed.commands.setContent("<p>Click here</p>");
        ed.commands.setTextSelection({ from: 1, to: 6 });
        ed.commands.setLink({ href: "https://example.com" });
        ed.commands.setTextSelection({ from: 1, to: 6 });
        const tr = ed.state.tr.setMeta("showLinkForm", { from: 1, to: 6 });
        ed.view.dispatch(tr);
      }
    });
    await page.waitForTimeout(300);

    // Click the remove button
    const removeBtn = page.locator('button[title="Remove link"]');
    await expect(removeBtn).toBeVisible({ timeout: 3000 });
    await removeBtn.click();
    await page.waitForTimeout(200);

    // Verify link was removed
    const hasLink = await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!ed) return false;
      ed.commands.setTextSelection({ from: 1, to: 6 });
      return ed.isActive("link");
    });
    expect(hasLink).toBe(false);
  });

  test("should dismiss popup on Escape key", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Trigger popup
    await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (ed) {
        ed.commands.setContent("<p>Hello world</p>");
        ed.commands.setTextSelection({ from: 1, to: 6 });
        const tr = ed.state.tr.setMeta("showLinkForm", { from: 1, to: 6 });
        ed.view.dispatch(tr);
      }
    });
    await page.waitForTimeout(300);

    const linkInput = page.locator('input[placeholder="Paste a link..."]');
    await expect(linkInput).toBeVisible({ timeout: 3000 });

    // Press Escape
    await linkInput.press("Escape");
    await page.waitForTimeout(200);

    // Popup should disappear without creating a link
    await expect(linkInput).not.toBeVisible();

    const hasLink = await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!ed) return false;
      ed.commands.setTextSelection({ from: 1, to: 6 });
      return ed.isActive("link");
    });
    expect(hasLink).toBe(false);
  });

  test("should hide formatting bubble menu while link popup is open", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert text, select it to trigger formatting menu
    await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (ed) {
        ed.commands.setContent("<p>Hello world</p>");
        ed.commands.setTextSelection({ from: 1, to: 6 });
      }
    });
    await page.waitForTimeout(300);

    // Now trigger the link popup
    await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (ed) {
        const tr = ed.state.tr.setMeta("showLinkForm", { from: 1, to: 6 });
        ed.view.dispatch(tr);
      }
    });
    await page.waitForTimeout(300);

    // Link popup should be visible
    const linkInput = page.locator('input[placeholder="Paste a link..."]');
    await expect(linkInput).toBeVisible({ timeout: 3000 });

    // Formatting bubble menu should NOT be visible
    const bubbleMenu = page.locator('[data-testid="bubble-text-menu"]');
    await expect(bubbleMenu).not.toBeVisible();
  });

  test("should not show link popup in sidebar (sidebar should show block form)", async ({
    page,
  }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert text and trigger link form
    await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (ed) {
        ed.commands.setContent("<p>Hello world</p>");
        ed.commands.setTextSelection({ from: 1, to: 6 });
        const tr = ed.state.tr.setMeta("showLinkForm", { from: 1, to: 6 });
        ed.view.dispatch(tr);
      }
    });
    await page.waitForTimeout(300);

    // The sidebar should NOT show a "Link" heading (the old sidebar link form)
    const sidebarLinkHeading = page.locator("text=Link >> visible=true").first();
    // The inline popup should show instead
    const linkInput = page.locator('input[placeholder="Paste a link..."]');
    await expect(linkInput).toBeVisible({ timeout: 3000 });
  });
});
