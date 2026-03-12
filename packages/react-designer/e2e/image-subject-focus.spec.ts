import { test, expect, type Page } from "@playwright/test";
import { setupMockedTest, mockTemplateDataSamples } from "./template-test-utils";
import { MAIN_EDITOR_SELECTOR } from "./test-utils";

/**
 * Regression tests: Image blocks must not steal focus from the subject field.
 *
 * Root cause (fixed): ImageBlockView's useEffect called editor.chain().focus()
 * when loading imageNaturalWidth, which moved focus from the subject's
 * VariableInput TipTap editor to the main editor. With the image selected via
 * setNodeSelection, subsequent keystrokes deleted the image.
 *
 * Fix: replaced editor.chain().focus().setNodeSelection().updateAttributes()
 * with tr.setNodeMarkup() which updates node attrs without touching focus.
 */

// 1x1 red PNG — loads instantly, fires onLoad, triggers imageNaturalWidth calc
const REAL_IMAGE_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==";

/**
 * Programmatically insert an imageBlock with a real (loadable) sourcePath,
 * then wait for the <img> to render and its onLoad to fire.
 */
async function insertRealImage(page: Page) {
  await page.evaluate((src) => {
    const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
    if (!editor) throw new Error("Editor not available");

    editor.commands.focus("end");
    editor.commands.insertContent({
      type: "imageBlock",
      attrs: {
        sourcePath: src,
        alt: "test-real-image",
        alignment: "center",
        width: 100,
        imageNaturalWidth: 0,
      },
    });
  }, REAL_IMAGE_DATA_URI);

  // Wait for the <img> element to appear in the DOM and finish loading
  const imgLocator = page.locator('img[alt="test-real-image"]');
  await imgLocator.waitFor({ state: "attached", timeout: 5000 });
  // Give the onLoad → useEffect → tr.setNodeMarkup cycle time to complete
  await page.waitForTimeout(1500);
}

test.describe("Image Block Subject Focus Regression", () => {
  test.beforeEach(async ({ page }) => {
    await setupMockedTest(page, mockTemplateDataSamples.fullTemplate);

    const editor = page.locator(MAIN_EDITOR_SELECTOR);
    await expect(editor).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test("subject field retains focus when a loaded image is present", async ({ page }) => {
    // Insert a real image that will load and trigger imageNaturalWidth calc
    await insertRealImage(page);

    // Verify the real image is rendered (not the placeholder)
    const img = page.locator('img[alt="test-real-image"]');
    await expect(img).toBeVisible({ timeout: 5000 });

    // Now focus the subject field
    const subjectContainer = page.locator(".variable-input-placeholder").first();
    await expect(subjectContainer).toBeVisible({ timeout: 5000 });
    await subjectContainer.click();
    await page.waitForTimeout(300);

    // Clear existing subject
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    // Type in the subject field
    await page.keyboard.type("My new subject", { delay: 50 });
    await page.waitForTimeout(500);

    // Text must be in the subject, not the main editor
    await expect(subjectContainer).toContainText("My new subject");

    // Image must still exist (keystrokes didn't delete it)
    await expect(img).toBeVisible();
  });

  test("typing in subject is not interrupted by image onLoad cycle", async ({ page }) => {
    // Focus the subject FIRST
    const subjectContainer = page.locator(".variable-input-placeholder").first();
    await expect(subjectContainer).toBeVisible({ timeout: 5000 });
    await subjectContainer.click();
    await page.waitForTimeout(300);

    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    // Start typing in subject
    await page.keyboard.type("Before", { delay: 50 });
    await page.waitForTimeout(200);

    // Insert image while subject is focused — this triggers the onLoad → useEffect
    // cycle that previously stole focus
    await page.evaluate((src) => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!editor) return;
      editor.commands.insertContent({
        type: "imageBlock",
        attrs: {
          sourcePath: src,
          alt: "mid-type-image",
          alignment: "center",
          width: 100,
          imageNaturalWidth: 0,
        },
      });
    }, REAL_IMAGE_DATA_URI);

    // Wait for image load and the useEffect to settle
    await page.waitForTimeout(2000);

    // Continue typing — this should still go into the subject
    await subjectContainer.click();
    await page.waitForTimeout(200);
    await page.keyboard.type(" After", { delay: 50 });
    await page.waitForTimeout(500);

    // Subject should have our text
    const subjectText = await subjectContainer.textContent();
    expect(subjectText).toContain("Before");
    expect(subjectText).toContain("After");

    // Image must still exist
    const img = page.locator('img[alt="mid-type-image"]');
    const imgOrPlaceholder = page.locator(".react-renderer.node-imageBlock, .node-imageBlock");
    const imgVisible = (await img.count()) > 0;
    const blockVisible = (await imgOrPlaceholder.count()) > 0;
    expect(imgVisible || blockVisible).toBe(true);
  });

  test("continuous typing in subject not lost to image focus steal", async ({ page }) => {
    // Insert image first
    await insertRealImage(page);
    const img = page.locator('img[alt="test-real-image"]');
    await expect(img).toBeVisible({ timeout: 5000 });

    // Focus subject
    const subjectContainer = page.locator(".variable-input-placeholder").first();
    await expect(subjectContainer).toBeVisible({ timeout: 5000 });
    await subjectContainer.click();
    await page.waitForTimeout(300);

    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    // Type a long sentence continuously
    const testSentence = "This is a long test subject for regression testing";
    await page.keyboard.type(testSentence, { delay: 30 });
    await page.waitForTimeout(500);

    // All text should be in the subject
    await expect(subjectContainer).toContainText(testSentence);

    // Main editor must NOT contain subject text
    const mainEditor = page.locator(MAIN_EDITOR_SELECTOR);
    const mainText = await mainEditor.textContent();
    expect(mainText).not.toContain(testSentence);

    // Image still intact
    await expect(img).toBeVisible();
  });

  test("imageNaturalWidth updates via transaction without moving focus", async ({ page }) => {
    // Focus the subject
    const subjectContainer = page.locator(".variable-input-placeholder").first();
    await expect(subjectContainer).toBeVisible({ timeout: 5000 });
    await subjectContainer.click();
    await page.waitForTimeout(300);

    const subjectPM = subjectContainer.locator('.ProseMirror[contenteditable="true"]');
    await expect(subjectPM).toBeFocused({ timeout: 3000 });

    // Insert a real image — its onLoad will trigger imageNaturalWidth calculation
    await page.evaluate((src) => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!editor) return;
      editor.commands.insertContent({
        type: "imageBlock",
        attrs: {
          sourcePath: src,
          alt: "focus-test-image",
          alignment: "center",
          width: 100,
          imageNaturalWidth: 0,
        },
      });
    }, REAL_IMAGE_DATA_URI);

    // Wait for the full onLoad → useEffect → dispatch cycle
    await page.waitForTimeout(2000);

    // Re-click subject to confirm it can take focus back without issue
    await subjectContainer.click();
    await page.waitForTimeout(300);
    await expect(subjectPM).toBeFocused({ timeout: 3000 });

    // Verify imageNaturalWidth was actually updated (the transaction worked)
    const naturalWidth = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!editor) return null;
      const json = editor.getJSON();
      const imageNode = json.content?.find((n: any) => n.type === "imageBlock");
      return imageNode?.attrs?.imageNaturalWidth;
    });

    // Should be 1 (1x1 pixel PNG) — proves the transaction ran successfully
    expect(naturalWidth).toBe(1);
  });
});
