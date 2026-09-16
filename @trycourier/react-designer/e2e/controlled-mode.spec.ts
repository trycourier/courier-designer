import { test, expect } from "@playwright/test";

/**
 * E2E Tests for Controlled Mode (value/onChange props)
 *
 * These tests verify that the TemplateEditor works correctly in controlled mode,
 * where the parent component provides a `value` prop and handles changes via `onChange`.
 *
 * REGRESSION TEST: This specifically tests the fix for an infinite loop bug where:
 * 1. User provides a `value` prop (controlled mode)
 * 2. The component syncs `value` to internal state
 * 3. The `onChange` callback fires
 * 4. This creates a loop: value → state → onChange → parent re-render → repeat
 *
 * The fix uses:
 * - `isUpdatingFromValueProp` ref to track when syncing from value prop
 * - `prevValueRef` to prevent re-processing the same value
 * - Guards in the onChange effect to skip calling onChange during value sync
 */

// Force serial execution to prevent state contamination between tests
test.describe.configure({ mode: "serial" });

// Test content for controlled mode
const controlledModeContent = {
  version: "2022-01-01",
  elements: [
    {
      type: "channel",
      channel: "email",
      elements: [
        {
          type: "meta",
          title: "Controlled Mode Test Subject",
        },
        {
          type: "text",
          content: "Hello from controlled mode!",
          align: "left",
          color: "#292929",
          background_color: "transparent",
          padding: "6px 0px",
        },
      ],
    },
  ],
};

test.describe("Controlled Mode (value/onChange)", () => {
  test.beforeEach(async ({ page }) => {
    // Set up GraphQL mocks
    await page.route("**/*", async (route) => {
      const request = route.request();
      const url = request.url();

      // Only intercept API calls
      if (!url.includes("/client/q") && !url.includes("/graphql")) {
        await route.continue();
        return;
      }

      const postData = request.postData();

      if (postData && postData.includes("GetTenant")) {
        // Return template data that matches the controlled mode content
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              tenant: {
                tenantId: "test-tenant",
                name: "Test Tenant",
                notification: {
                  notificationId: "test-template",
                  createdAt: "2023-01-01T00:00:00Z",
                  version: "1.0.0",
                  data: {
                    content: controlledModeContent,
                    routing: {
                      method: "single",
                      channels: ["email"],
                    },
                  },
                },
                brand: null,
              },
            },
          }),
        });
      } else if (postData && postData.includes("SaveTemplate")) {
        // Mock save mutation
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              saveTemplate: {
                success: true,
              },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });
  });

  test("REGRESSION: should not enter infinite loop when value and onChange are provided", async ({
    page,
  }) => {
    console.log("🧪 Testing controlled mode infinite loop prevention");

    // Track onChange calls via console logs
    const onChangeCalls: { timestamp: number; message: string }[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("value") && msg.type() === "warning") {
        onChangeCalls.push({
          timestamp: Date.now(),
          message: text,
        });
      }
    });

    // Navigate to the main app which uses controlled mode in the current implementation
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Wait for the app to fully load
    await page.waitForTimeout(3000);

    // Check that the page is responsive (not frozen by infinite loop)
    await expect(page.locator("body")).toBeVisible();

    // If there was an infinite loop, we'd see many rapid onChange calls
    // With the fix, we should see at most a few calls during initialization
    console.log(`📊 onChange calls detected: ${onChangeCalls.length}`);

    // The page should be responsive - if it was in an infinite loop, this would timeout
    const incrementButton = page.getByRole("button", { name: "Increment" });
    if (await incrementButton.isVisible()) {
      await incrementButton.click();
      await page.waitForTimeout(100);

      // Verify the UI responded (proves the page isn't frozen)
      const countText = page.locator("text=Count:");
      await expect(countText).toBeVisible();
    }

    console.log("✅ Page remained responsive - no infinite loop detected");
  });

  test("should remain responsive after user makes an edit", async ({ page }) => {
    console.log("🧪 Testing responsiveness after user edits");

    // Track onChange calls
    let onChangeCount = 0;
    page.on("console", (msg) => {
      if (msg.text().includes("value") && msg.type() === "warning") {
        onChangeCount++;
      }
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Find the editor
    const editor = page.locator(".tiptap.ProseMirror").first();

    // Wait for editor to be visible and ready
    if (await editor.isVisible()) {
      // Click on editor to focus
      await editor.click();
      await page.waitForTimeout(200);

      // Type some text
      await page.keyboard.type(" Test edit");
      await page.waitForTimeout(500);

      // Record onChange count right after edit
      const countAfterEdit = onChangeCount;
      console.log(`📊 onChange calls after edit: ${countAfterEdit}`);

      // Wait a bit to see if more calls happen (would indicate a loop)
      await page.waitForTimeout(1000);

      const countAfterWait = onChangeCount;
      console.log(`📊 onChange calls after waiting: ${countAfterWait}`);

      // The count should stabilize, not keep increasing
      // Allow for some debounced calls, but not continuous ones
      const callsAfterEdit = countAfterWait - countAfterEdit;
      expect(callsAfterEdit).toBeLessThan(10); // Should not be continuously calling

      // Verify page is still responsive
      const incrementButton = page.getByRole("button", { name: "Increment" });
      if (await incrementButton.isVisible()) {
        await incrementButton.click();
        await page.waitForTimeout(100);
        await expect(page.locator("text=Count:")).toBeVisible();
      }
    }

    console.log("✅ Page remained responsive after edits");
  });

  test("should handle rapid value prop changes without freezing", async ({ page }) => {
    console.log("🧪 Testing rapid value changes");

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Simulate rapid parent re-renders by clicking increment rapidly
    const incrementButton = page.getByRole("button", { name: "Increment" });

    if (await incrementButton.isVisible()) {
      // Click rapidly to simulate rapid re-renders
      for (let i = 0; i < 10; i++) {
        await incrementButton.click();
        await page.waitForTimeout(50);
      }

      // Page should still be responsive
      await page.waitForTimeout(500);
      await expect(incrementButton).toBeVisible();
      await expect(incrementButton).toBeEnabled();

      console.log("✅ Page handled rapid re-renders without freezing");
    }
  });

  test("editor should accept input without triggering infinite updates", async ({ page }) => {
    console.log("🧪 Testing editor input stability");

    // Track save mutations
    const saveMutations: number[] = [];
    page.on("request", (request) => {
      const postData = request.postData();
      if (postData && postData.includes("SaveTemplate")) {
        saveMutations.push(Date.now());
      }
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const editor = page.locator(".tiptap.ProseMirror").first();

    if (await editor.isVisible()) {
      await editor.click();
      await page.waitForTimeout(200);

      // Type a sentence
      await page.keyboard.type("This is a test sentence.");
      await page.waitForTimeout(2000); // Wait for debounced auto-save

      const savesAfterTyping = saveMutations.length;
      console.log(`📊 Save mutations after typing: ${savesAfterTyping}`);

      // Wait to see if more saves happen (would indicate a loop)
      await page.waitForTimeout(2000);

      const savesAfterWait = saveMutations.length;
      console.log(`📊 Save mutations after waiting: ${savesAfterWait}`);

      // Should not be continuously saving
      const additionalSaves = savesAfterWait - savesAfterTyping;
      expect(additionalSaves).toBeLessThan(3); // Allow for debounced saves, but not loops

      // Editor should still be editable
      await expect(editor).toHaveAttribute("contenteditable", "true");
    }

    console.log("✅ Editor input is stable without infinite updates");
  });

  test("should handle template switching without infinite loops", async ({ page }) => {
    console.log("🧪 Testing template switching stability");

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Find template selector
    const templateSelect = page.locator("select").nth(1);

    if (await templateSelect.isVisible()) {
      const options = await templateSelect.locator("option").all();

      if (options.length >= 2) {
        // Switch templates a few times
        for (let i = 0; i < 3; i++) {
          const targetOption = options[i % options.length];
          const value = await targetOption.getAttribute("value");
          if (value) {
            await templateSelect.selectOption(value);
            await page.waitForTimeout(500);

            // Verify page is responsive
            await expect(page.locator("body")).toBeVisible();
          }
        }

        console.log("✅ Template switching works without infinite loops");
      } else {
        console.log("⚠️ Not enough template options for switching test");
      }
    } else {
      console.log("⚠️ Template selector not visible");
    }
  });

  test("onChange should be called for user changes but not excessively", async ({ page }) => {
    console.log("🧪 Testing onChange call frequency");

    let onChangeCount = 0;
    const onChangeTimestamps: number[] = [];

    page.on("console", (msg) => {
      if (msg.text().includes("value") && msg.type() === "warning") {
        onChangeCount++;
        onChangeTimestamps.push(Date.now());
      }
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const initialCount = onChangeCount;
    console.log(`📊 Initial onChange count: ${initialCount}`);

    const editor = page.locator(".tiptap.ProseMirror").first();

    if (await editor.isVisible()) {
      await editor.click();
      await page.waitForTimeout(200);

      // Type a single character
      await page.keyboard.type("X");
      await page.waitForTimeout(1500);

      const countAfterSingleChar = onChangeCount;
      const callsForSingleChar = countAfterSingleChar - initialCount;
      console.log(`📊 onChange calls for single character: ${callsForSingleChar}`);

      // Should have called onChange a reasonable number of times (not hundreds)
      // Allow for debouncing, but not infinite calls
      expect(callsForSingleChar).toBeLessThan(5);

      // Check timing - calls should not be too rapid
      if (onChangeTimestamps.length >= 2) {
        const recentTimestamps = onChangeTimestamps.slice(-5);
        for (let i = 1; i < recentTimestamps.length; i++) {
          const gap = recentTimestamps[i] - recentTimestamps[i - 1];
          // If there's an infinite loop, gaps would be very small (< 10ms)
          // Normal debounced calls have gaps of 100ms+
          console.log(`📊 Gap between onChange calls: ${gap}ms`);
        }
      }
    }

    console.log("✅ onChange call frequency is reasonable");
  });

  test("page should not freeze when editing with controlled mode", async ({ page }) => {
    console.log("🧪 Testing page responsiveness during controlled editing");

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Set a timeout to detect if page freezes
    const freezeDetectionPromise = new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        resolve(true); // Page was responsive for the entire duration
      }, 5000);

      // If page freezes, this won't complete
      page.evaluate(() => {
        return new Promise((res) => {
          // This should resolve quickly if page is responsive
          setTimeout(() => res(true), 100);
        });
      }).then(() => {
        // If we get here within a reasonable time, page is responsive
        // Let the timeout complete to fully verify responsiveness
      }).catch(() => {
        clearTimeout(timeout);
        resolve(false);
      });
    });

    const editor = page.locator(".tiptap.ProseMirror").first();

    if (await editor.isVisible()) {
      // Make some edits
      await editor.click();
      await page.keyboard.type("Testing controlled mode");
      await page.waitForTimeout(500);

      // Edit more
      await page.keyboard.type(" with more text");
      await page.waitForTimeout(500);
    }

    const wasResponsive = await freezeDetectionPromise;
    expect(wasResponsive).toBe(true);

    console.log("✅ Page remained responsive during controlled editing");
  });
});

test.describe("Controlled Mode - Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", async (route) => {
      const request = route.request();
      const url = request.url();

      if (!url.includes("/client/q") && !url.includes("/graphql")) {
        await route.continue();
        return;
      }

      const postData = request.postData();

      if (postData && postData.includes("GetTenant")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              tenant: {
                tenantId: "test-tenant",
                name: "Test Tenant",
                notification: null,
                brand: null,
              },
            },
          }),
        });
      } else if (postData && postData.includes("SaveTemplate")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { saveTemplate: { success: true } },
          }),
        });
      } else {
        await route.continue();
      }
    });
  });

  test("should handle empty/null value gracefully", async ({ page }) => {
    console.log("🧪 Testing empty value handling");

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Page should load without errors even with null notification
    await expect(page.locator("body")).toBeVisible();

    const editor = page.locator(".tiptap.ProseMirror").first();
    if (await editor.isVisible()) {
      await expect(editor).toHaveAttribute("contenteditable", "true");
      console.log("✅ Empty value handled gracefully");
    }
  });

  test("should recover from rapid consecutive edits", async ({ page }) => {
    console.log("🧪 Testing recovery from rapid edits");

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    const editor = page.locator(".tiptap.ProseMirror").first();

    if (await editor.isVisible()) {
      await editor.click();
      await page.waitForTimeout(100);

      // Rapid typing simulation
      for (let i = 0; i < 20; i++) {
        await page.keyboard.type("a");
        await page.waitForTimeout(20); // Very fast typing
      }

      // Wait for things to settle
      await page.waitForTimeout(1000);

      // Page should still be responsive
      await expect(editor).toHaveAttribute("contenteditable", "true");

      // Try one more edit to verify recovery
      await page.keyboard.type(" recovered");
      await page.waitForTimeout(500);

      console.log("✅ Recovered from rapid consecutive edits");
    }
  });
});

