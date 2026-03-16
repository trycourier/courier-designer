import { test, expect } from "@playwright/test";
import { setupMockedTest, mockTemplateDataSamples } from "./template-test-utils";
import { getMainEditor, ensureEditorReady } from "./test-utils";

/**
 * E2E tests for the editor unmount flush fix.
 *
 * Bug: When the email editor unmounts (e.g. "Test and Preview" or channel switch),
 * the 200ms debounced content update was canceled instead of flushed, silently
 * dropping the user's most recent edits.
 *
 * Fix: The onDestroyHandler now flushes any pending debounced update synchronously
 * before the component is destroyed, ensuring templateEditorContent is up to date.
 *
 * These tests verify that content typed immediately before a channel switch
 * (within the 200ms debounce window) is preserved after the round-trip.
 */

test.describe("Editor Unmount Flush - Content Preservation", () => {
  test.beforeEach(async ({ page }) => {
    await setupMockedTest(page, mockTemplateDataSamples.allChannelsTemplate);
    await ensureEditorReady(page, { skipNavigation: true });
  });

  test("should preserve keyboard-typed content when switching channels within debounce window", async ({
    page,
  }) => {
    const editor = getMainEditor(page);
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Clear content and re-focus using TipTap commands
    await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (ed) {
        ed.commands.clearContent();
        ed.commands.focus();
      }
    });
    await page.waitForTimeout(300);

    // Click the editor to ensure Playwright's keyboard target is set
    await editor.click();
    await page.waitForTimeout(100);

    // Type content — each keystroke triggers onUpdate with a 200ms debounce.
    // After the last keystroke the debounce timer starts; we must switch
    // channels before it fires (within 200ms) to exercise the fix.
    await page.keyboard.type("UNMOUNT_FLUSH_KEYBOARD_TEST");

    // Switch to SMS immediately (no waitForTimeout) to trigger editor unmount
    // within the debounce window
    const smsButton = page
      .locator('button, [role="tab"]')
      .filter({ hasText: /sms/i })
      .first();
    if (await smsButton.isVisible()) {
      await smsButton.click();
    }

    await page.waitForTimeout(1500);

    // Switch back to email — editor remounts and loads from templateEditorContent
    const emailButton = page
      .locator('button, [role="tab"]')
      .filter({ hasText: /email/i })
      .first();
    if (await emailButton.isVisible()) {
      await emailButton.click();
    }

    await page.waitForTimeout(1500);

    // Re-locate the editor after remount and verify content
    const emailEditor = getMainEditor(page);
    await expect(emailEditor).toBeVisible({ timeout: 10000 });
    const content = await emailEditor.textContent();
    expect(content).toContain("UNMOUNT_FLUSH_KEYBOARD_TEST");
  });

  test("should preserve programmatic content insertion when switching channels within debounce window", async ({
    page,
  }) => {
    const editor = getMainEditor(page);
    await expect(editor).toBeVisible({ timeout: 10000 });

    await editor.click();
    await page.waitForTimeout(200);

    // Insert content programmatically (triggers onUpdate synchronously) then
    // switch channels immediately — tighter race window than keyboard typing
    await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (ed) {
        ed.commands.clearContent();
        ed.commands.insertContent("UNMOUNT_FLUSH_PROGRAMMATIC_TEST");
      }
    });

    // Switch immediately — no wait
    const smsButton = page
      .locator('button, [role="tab"]')
      .filter({ hasText: /sms/i })
      .first();
    if (await smsButton.isVisible()) {
      await smsButton.click();
    }

    await page.waitForTimeout(1000);

    const emailButton = page
      .locator('button, [role="tab"]')
      .filter({ hasText: /email/i })
      .first();
    if (await emailButton.isVisible()) {
      await emailButton.click();
    }

    await page.waitForTimeout(1000);

    const content = await editor.textContent();
    expect(content).toContain("UNMOUNT_FLUSH_PROGRAMMATIC_TEST");
  });

  test("should preserve content across multiple rapid channel switches", async ({ page }) => {
    const editor = getMainEditor(page);
    await expect(editor).toBeVisible({ timeout: 10000 });

    await editor.click();
    await page.waitForTimeout(200);

    // Insert content programmatically
    await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (ed) {
        ed.commands.clearContent();
        ed.commands.insertContent("RAPID_SWITCH_CONTENT_789");
      }
    });

    // Rapid double switch: email → SMS → email, all within the debounce window
    const smsButton = page
      .locator('button, [role="tab"]')
      .filter({ hasText: /sms/i })
      .first();
    if (await smsButton.isVisible()) {
      await smsButton.click();
    }
    await page.waitForTimeout(300);

    const emailButton = page
      .locator('button, [role="tab"]')
      .filter({ hasText: /email/i })
      .first();
    if (await emailButton.isVisible()) {
      await emailButton.click();
    }
    await page.waitForTimeout(1500);

    // Verify content survived the rapid round-trip
    const emailEditor = getMainEditor(page);
    await expect(emailEditor).toBeVisible({ timeout: 10000 });
    const content = await emailEditor.textContent();
    expect(content).toContain("RAPID_SWITCH_CONTENT_789");
  });
});
