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

/** The document Frame — the element that carries the email's vertical inset. */
const READONLY_FRAME_SELECTOR = '[data-testid="email-body-frame"]';

async function setupReadOnlyTest(page: typeof import("@playwright/test").Page.prototype) {
  await setupMockedTest(page, mockTemplateDataSamples.fullTemplate);
  await page.goto("/readonly-test", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  // Wait on the Frame for *visible* and the editor only for *attached*. This
  // page's blocks are all empty, and readonly hides empty placeholders, so the
  // editor has no intrinsic height — it was only ever "visible" to Playwright
  // because readonly mode padded it, and the email canvas is now exempt from
  // that padding so the author's Frame value is the whole inset.
  await page.waitForSelector(READONLY_FRAME_SELECTOR, { timeout: 15000 });
  await page.waitForSelector(READONLY_EDITOR_SELECTOR, {
    state: "attached",
    timeout: 15000,
  });
}

test.describe("readOnly mode", () => {
  test("editor should have contenteditable=false", async ({ page }) => {
    await setupReadOnlyTest(page);

    const editor = page.locator(READONLY_EDITOR_SELECTOR);
    await expect(editor).toHaveCount(1);
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
    await expect(editor).toHaveCount(1);

    // Capture initial content
    const initialContent = await editor.innerHTML();

    // Focus the editor element directly rather than clicking it. The editor is
    // zero-height on this page so there is no point to click, and clicking the
    // Frame instead cannot focus it at all — which made this test pass against an
    // editable editor too, i.e. it asserted nothing. A programmatic focus is
    // delivered to the same element an editable editor would accept typing on, so
    // the keystrokes below really would land if `readOnly` regressed.
    await editor.evaluate((el) => (el as HTMLElement).focus());
    await page.keyboard.type("This should not appear");
    await page.waitForTimeout(500);

    // Content should remain unchanged
    const afterContent = await editor.innerHTML();
    expect(afterContent).toBe(initialContent);
    expect(afterContent).not.toContain("This should not appear");
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
  test("email canvas is exempt from the readonly py-5; the Frame owns the inset", async ({
    page,
  }) => {
    await setupReadOnlyTest(page);

    // This used to assert py-5 (20px) on the email ProseMirror. The document
    // Frame is now the single source of the email's vertical inset — the author
    // sets it — so readonly adding 20px per side on top made the preview looser
    // than the sent email. The readonly rule still applies to editors without a
    // Frame; see the brand-editor case below and the comment in styles.css.
    const proseMirror = page.locator(READONLY_EDITOR_SELECTOR);
    await expect(proseMirror).toHaveCount(1);

    const { paddingTop, paddingBottom } = await proseMirror.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom };
    });
    expect(paddingTop).toBe("0px");
    expect(paddingBottom).toBe("0px");

    // ...and the inset is really there, on the Frame instead.
    const frame = page.locator(READONLY_FRAME_SELECTOR);
    await expect(frame).toBeVisible({ timeout: 10000 });
    const framePadding = await frame.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { top: cs.paddingTop, bottom: cs.paddingBottom };
    });
    expect(framePadding.top).toBe("20px");
    expect(framePadding.bottom).toBe("20px");
  });

  test("the py-5 exemption is scoped to the email canvas, not a removal", async ({ page }) => {
    await setupReadOnlyTest(page);

    // The test above asserts 0px on the email ProseMirror, and the brand-editor
    // test below asserts its own py-0 override — so nothing was left checking that
    // `.courier-editor-main .ProseMirror { py-5 }` still applies to the channels
    // that have no Frame (Slack, MSTeams). Probe the rule directly rather than
    // depending on which channels the demo app happens to expose.
    const padding = await page.evaluate(() => {
      const host = document.createElement("div");
      host.className = "courier-editor-preview-mode";
      host.innerHTML =
        '<div class="courier-editor-main"><div class="ProseMirror"></div></div>' +
        '<div class="courier-email-editor"><div class="courier-editor-main">' +
        '<div class="ProseMirror"></div></div></div>';
      document.body.appendChild(host);

      const [plain, email] = Array.from(host.querySelectorAll(".ProseMirror"));
      const read = (el: Element) => getComputedStyle(el).paddingTop;
      const result = { plain: read(plain), email: read(email) };

      host.remove();
      return result;
    });

    expect(padding.plain).toBe("20px");
    expect(padding.email).toBe("0px");
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
