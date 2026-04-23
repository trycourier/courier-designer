import { test, expect } from "@playwright/test";
import { setupMockedTest, mockTemplateDataSamples } from "./template-test-utils";

/**
 * E2E tests for the readOnly prop on TemplateEditor.
 *
 * These tests verify that when readOnly={true}:
 * - The editor is not editable (contenteditable="false")
 * - "Publish changes" button is hidden
 * - "+ Add channel" button is hidden
 * - Delete channel icon is hidden
 * - Drag handles are hidden
 * - Sidebar (blocks library) is hidden
 * - Typing has no effect
 */

const READONLY_EDITOR_SELECTOR =
  '[data-testid="email-editor"] .tiptap.ProseMirror';

async function setupReadOnlyTest(page: typeof import("@playwright/test").Page.prototype) {
  await setupMockedTest(page, mockTemplateDataSamples.fullTemplate);
  await page.goto("/readonly-test", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.waitForSelector(READONLY_EDITOR_SELECTOR, { timeout: 15000 });
}

test.describe("readOnly mode", () => {
  test("editor should have contenteditable=false", async ({ page }) => {
    await setupReadOnlyTest(page);

    const editor = page.locator(READONLY_EDITOR_SELECTOR);
    await expect(editor).toBeVisible({ timeout: 10000 });
    await expect(editor).toHaveAttribute("contenteditable", "false");
  });

  test("Publish changes button should be hidden", async ({ page }) => {
    await setupReadOnlyTest(page);

    const publishButton = page.getByRole("button", { name: /Publish changes/i });
    await expect(publishButton).toHaveCount(0);
  });

  test("Add channel button should be hidden", async ({ page }) => {
    await setupReadOnlyTest(page);

    const addChannelButton = page.getByRole("button", { name: /Add channel/i });
    await expect(addChannelButton).toHaveCount(0);
  });

  test("delete channel icon should be hidden", async ({ page }) => {
    await setupReadOnlyTest(page);

    // The delete channel icon is inside the active tab
    const deleteIcons = page.locator(".courier-main-header [data-testid='bin-icon']");
    await expect(deleteIcons).toHaveCount(0);
  });

  test("sidebar (blocks library) should be hidden", async ({ page }) => {
    await setupReadOnlyTest(page);

    const sidebar = page.locator(".courier-editor-sidebar-container");
    await expect(sidebar).toHaveCount(0);
  });

  test("drag handles should not be visible", async ({ page }) => {
    await setupReadOnlyTest(page);

    const handles = page.locator('[data-cypress="draggable-handle"]');
    const handleCount = await handles.count();

    // Handles may exist in the DOM (inside node views) but should be hidden via CSS
    for (let i = 0; i < handleCount; i++) {
      await expect(handles.nth(i)).toBeHidden();
    }
  });

  test("typing should not modify editor content", async ({ page }) => {
    await setupReadOnlyTest(page);

    const editor = page.locator(READONLY_EDITOR_SELECTOR);
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Capture initial content
    const initialContent = await editor.innerHTML();

    // Try to type (click + keyboard)
    await editor.click({ force: true });
    await page.keyboard.type("This should not appear");
    await page.waitForTimeout(500);

    // Content should remain unchanged
    const afterContent = await editor.innerHTML();
    expect(afterContent).toBe(initialContent);
  });

  test("action panels (duplicate/delete buttons) should be hidden", async ({ page }) => {
    await setupReadOnlyTest(page);

    const actionPanels = page.locator(".courier-actions-panel");
    const count = await actionPanels.count();

    for (let i = 0; i < count; i++) {
      await expect(actionPanels.nth(i)).toBeHidden();
    }
  });

  test("save status indicator should be hidden", async ({ page }) => {
    await setupReadOnlyTest(page);

    // The status component shows "Saved", "Saving...", etc.
    const status = page.locator(".courier-main-header").getByText(/Saved|Saving/i);
    await expect(status).toHaveCount(0);
  });

  test("subject input should be read-only", async ({ page }) => {
    await setupReadOnlyTest(page);

    // Subject area exists but should not allow editing
    const subjectArea = page.locator('[data-testid="email-subject-input"]');

    if ((await subjectArea.count()) > 0) {
      // The subject VariableInput should have pointer-events disabled or be read-only
      const subjectEditor = subjectArea.locator(".ProseMirror");
      if ((await subjectEditor.count()) > 0) {
        await expect(subjectEditor).toHaveAttribute("contenteditable", "false");
      }
    }
  });

  // These three tests pin the CSS rules added under the
  // `.courier-editor-preview-mode, .courier-editor-readonly` selector in
  // `src/styles.css`. They guard against accidental removal or regression
  // of the readonly/preview padding + empty-placeholder hiding behavior.
  test("readonly wrapper applies py-5 to the main ProseMirror", async ({ page }) => {
    await setupReadOnlyTest(page);

    const proseMirror = page
      .locator(".courier-editor-readonly .courier-editor-main .ProseMirror")
      .first();
    await expect(proseMirror).toBeVisible({ timeout: 10000 });

    const { paddingTop, paddingBottom } = await proseMirror.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom };
    });

    // Tailwind's `py-5` = 1.25rem = 20px at default base font size.
    expect(paddingTop).toBe("20px");
    expect(paddingBottom).toBe("20px");
  });

  test("brand editor ProseMirror inside readonly keeps py-0 override", async ({ page }) => {
    await setupReadOnlyTest(page);

    // The brand editor is scoped with `.courier-brand-editor` /
    // `.courier-brand-editor-readonly`. If present, it must NOT inherit the
    // outer py-5 from the readonly wrapper.
    const brandEditorProseMirror = page.locator(
      ".courier-editor-readonly .courier-editor-main :is(.courier-brand-editor, .courier-brand-editor-readonly) .ProseMirror"
    );

    const count = await brandEditorProseMirror.count();
    if (count === 0) {
      test.info().annotations.push({
        type: "skip-reason",
        description: "No brand editor ProseMirror rendered on this test page",
      });
      return;
    }

    for (let i = 0; i < count; i++) {
      const el = brandEditorProseMirror.nth(i);
      const { paddingTop, paddingBottom } = await el.evaluate((node) => {
        const cs = getComputedStyle(node);
        return { paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom };
      });
      expect(paddingTop).toBe("0px");
      expect(paddingBottom).toBe("0px");
    }
  });

  test("empty react-renderer placeholders are hidden in readonly", async ({ page }) => {
    await setupReadOnlyTest(page);

    const emptyPlaceholders = page.locator(
      ".courier-editor-readonly .ProseMirror > .react-renderer .is-empty"
    );

    const count = await emptyPlaceholders.count();
    for (let i = 0; i < count; i++) {
      await expect(emptyPlaceholders.nth(i)).toBeHidden();
    }
  });
});
