import { test, expect } from "@playwright/test";
import { ensureEditorReady } from "./test-utils";
import { mockTemplateResponse, mockTemplateDataSamples } from "./template-test-utils";

/**
 * E2E Tests for Channels Routing Priority and Backward Compatibility
 *
 * These tests verify that:
 * 1. routing.channels takes priority over channels prop
 * 2. Backward compatibility is maintained when only channels prop is used
 * 3. UI correctly reflects the available channels based on priority logic
 * 4. Channel switching works correctly with the new resolution logic
 */

test.describe("Channels Routing Priority E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Mock empty template to ensure predictable starting state
    await mockTemplateResponse(page, mockTemplateDataSamples.emptyTemplate, { delay: 300 });
  });

  test.describe("routing.channels priority over channels prop", () => {
    test("should only show channels from routing.channels when both props are provided", async ({
      page,
    }) => {
      console.log("🎯 Testing routing.channels priority over channels prop");

      // Inject custom TemplateEditor with both routing.channels and channels props
      await page.goto("/", { waitUntil: "domcontentloaded" });

      // Override the default TemplateEditor props to test priority
      await page.evaluate(() => {
        const mockOverride = {
          routing: {
            method: "single",
            channels: ["email", "sms"], // Should take priority
          },
          channels: ["email", "sms", "push", "inbox"], // Should be ignored
        };

        // Store the override for the dev app to use
        (window as any).__templateEditorPropsOverride = mockOverride;
      });

      await page.reload({ waitUntil: "domcontentloaded" });
      await ensureEditorReady(page);

      // Check that only email and sms tabs are available (from routing.channels)
      const channelTabs = page.locator('[role="tablist"] [role="tab"]');

      await expect(channelTabs).toHaveCount(2);

      // Verify the tabs are email and sms (not push or inbox)
      const tabTexts = await channelTabs.allTextContents();
      expect(tabTexts.map((t) => t.toLowerCase())).toEqual(
        expect.arrayContaining(["email", "sms"])
      );
      expect(tabTexts.map((t) => t.toLowerCase())).not.toContain("push");
      expect(tabTexts.map((t) => t.toLowerCase())).not.toContain("inbox");

      // Verify we can add the disabled channels
      const addChannelButton = page.locator('text="+ Add channel"');
      if (await addChannelButton.isVisible()) {
        await addChannelButton.click();

        // Should not see push or inbox in the dropdown since they weren't in routing.channels
        const dropdownItems = page.locator('[role="menuitem"]');
        const dropdownTexts = await dropdownItems.allTextContents();
        expect(dropdownTexts).toHaveLength(0); // No additional channels should be available
      }
    });

    test("should fallback to channels prop when routing.channels is empty", async ({ page }) => {
      console.log("🎯 Testing fallback to channels prop when routing.channels is empty");

      await page.goto("/", { waitUntil: "domcontentloaded" });

      // Override with empty routing.channels
      await page.evaluate(() => {
        const mockOverride = {
          routing: {
            method: "single",
            channels: [], // Empty array
          },
          channels: ["push", "inbox"], // Should be used as fallback
        };

        (window as any).__templateEditorPropsOverride = mockOverride;
      });

      await page.reload({ waitUntil: "domcontentloaded" });
      await ensureEditorReady(page);

      // Should show push and inbox tabs (from channels prop fallback)
      const channelTabs = page.locator('[role="tablist"] [role="tab"]');

      await expect(channelTabs).toHaveCount(2);

      const tabTexts = await channelTabs.allTextContents();
      expect(tabTexts.map((t) => t.toLowerCase())).toEqual(
        expect.arrayContaining(["push", "inbox"])
      );
    });

    test("should use default channels when neither routing.channels nor channels prop is provided", async ({
      page,
    }) => {
      console.log("🎯 Testing default channels when no props provided");

      await page.goto("/", { waitUntil: "domcontentloaded" });

      // Override with undefined values
      await page.evaluate(() => {
        const mockOverride = {
          routing: undefined,
          channels: undefined,
        };

        (window as any).__templateEditorPropsOverride = mockOverride;
      });

      await page.reload({ waitUntil: "domcontentloaded" });
      await ensureEditorReady(page);

      // Should show default channels: email, sms, push, inbox
      const channelTabs = page.locator('[role="tablist"] [role="tab"]');

      await expect(channelTabs).toHaveCount(4);

      const tabTexts = await channelTabs.allTextContents();
      expect(tabTexts.map((t) => t.toLowerCase())).toEqual(
        expect.arrayContaining(["email", "sms", "push", "inbox"])
      );
    });
  });

  test.describe("backward compatibility with channels prop only", () => {
    test("should work correctly with legacy channels prop only", async ({ page }) => {
      console.log("🎯 Testing backward compatibility with channels prop only");

      await page.goto("/", { waitUntil: "domcontentloaded" });

      // Override to use only channels prop (legacy behavior)
      await page.evaluate(() => {
        const mockOverride = {
          routing: undefined, // No routing prop
          channels: ["sms", "push"], // Legacy channels prop
        };

        (window as any).__templateEditorPropsOverride = mockOverride;
      });

      await page.reload({ waitUntil: "domcontentloaded" });
      await ensureEditorReady(page);

      // Should show sms and push tabs (from channels prop)
      const channelTabs = page.locator('[role="tablist"] [role="tab"]');

      await expect(channelTabs).toHaveCount(2);

      const tabTexts = await channelTabs.allTextContents();
      expect(tabTexts.map((t) => t.toLowerCase())).toEqual(expect.arrayContaining(["sms", "push"]));
      expect(tabTexts.map((t) => t.toLowerCase())).not.toContain("email");
      expect(tabTexts.map((t) => t.toLowerCase())).not.toContain("inbox");
    });

    test("should maintain existing channel switching behavior with channels prop", async ({
      page,
    }) => {
      console.log("🎯 Testing channel switching with legacy channels prop");

      await page.goto("/", { waitUntil: "domcontentloaded" });

      // Use legacy channels prop
      await page.evaluate(() => {
        const mockOverride = {
          routing: undefined,
          channels: ["email", "sms", "push"],
        };

        (window as any).__templateEditorPropsOverride = mockOverride;
      });

      await page.reload({ waitUntil: "domcontentloaded" });
      await ensureEditorReady(page);

      // Verify we can switch between channels
      const emailTab = page.locator('[role="tab"]', { hasText: /email/i });
      const smsTab = page.locator('[role="tab"]', { hasText: /sms/i });
      const pushTab = page.locator('[role="tab"]', { hasText: /push/i });

      await expect(emailTab).toBeVisible();
      await expect(smsTab).toBeVisible();
      await expect(pushTab).toBeVisible();

      // Start with email (usually the default)
      await emailTab.click();
      await expect(emailTab).toHaveAttribute("data-state", "active");

      // Switch to SMS
      await smsTab.click();
      await expect(smsTab).toHaveAttribute("data-state", "active");
      await expect(emailTab).not.toHaveAttribute("data-state", "active");

      // Switch to Push
      await pushTab.click();
      await expect(pushTab).toHaveAttribute("data-state", "active");
      await expect(smsTab).not.toHaveAttribute("data-state", "active");
    });
  });

  test.describe("edge cases and error handling", () => {
    test("should handle invalid routing.channels gracefully", async ({ page }) => {
      console.log("🎯 Testing invalid routing.channels handling");

      await page.goto("/", { waitUntil: "domcontentloaded" });

      // Override with invalid routing.channels (mixed valid and invalid values)
      await page.evaluate(() => {
        const mockOverride = {
          routing: {
            method: "single",
            channels: ["email", { invalid: "object" }, "sms", null, 123], // Mixed types
          },
          channels: ["fallback", "channel"], // Should be used if no valid routing.channels
        };

        (window as any).__templateEditorPropsOverride = mockOverride;
      });

      await page.reload({ waitUntil: "domcontentloaded" });
      await ensureEditorReady(page);

      // Should filter out invalid values and use only "email" and "sms"
      const channelTabs = page.locator('[role="tablist"] [role="tab"]');

      await expect(channelTabs).toHaveCount(2);

      const tabTexts = await channelTabs.allTextContents();
      expect(tabTexts.map((t) => t.toLowerCase())).toEqual(
        expect.arrayContaining(["email", "sms"])
      );
    });

    test("should fallback to channels prop when routing.channels has only invalid values", async ({
      page,
    }) => {
      console.log("🎯 Testing fallback when routing.channels has only invalid values");

      await page.goto("/", { waitUntil: "domcontentloaded" });

      // Override with completely invalid routing.channels
      await page.evaluate(() => {
        const mockOverride = {
          routing: {
            method: "single",
            channels: [{ invalid: "object" }, null, 123, []], // All invalid
          },
          channels: ["inbox", "push"], // Should be used as fallback
        };

        (window as any).__templateEditorPropsOverride = mockOverride;
      });

      await page.reload({ waitUntil: "domcontentloaded" });
      await ensureEditorReady(page);

      // Should fallback to channels prop
      const channelTabs = page.locator('[role="tablist"] [role="tab"]');

      await expect(channelTabs).toHaveCount(2);

      const tabTexts = await channelTabs.allTextContents();
      expect(tabTexts.map((t) => t.toLowerCase())).toEqual(
        expect.arrayContaining(["inbox", "push"])
      );
    });
  });

  test.describe("UI integration and channel management", () => {
    test("should correctly manage add/remove channel functionality with routing.channels", async ({
      page,
    }) => {
      console.log("🎯 Testing add/remove channel functionality with routing.channels");

      await page.goto("/", { waitUntil: "domcontentloaded" });

      // Set up scenario with partial routing.channels
      await page.evaluate(() => {
        const mockOverride = {
          routing: {
            method: "single",
            channels: ["email", "sms", "push"], // 3 allowed channels
          },
          channels: ["email", "sms", "push", "inbox"], // Should be ignored
        };

        (window as any).__templateEditorPropsOverride = mockOverride;
      });

      await page.reload({ waitUntil: "domcontentloaded" });
      await ensureEditorReady(page);

      // Initially should show only one active channel (first in routing.channels)
      const initialTabs = page.locator('[role="tablist"] [role="tab"]');
      await expect(initialTabs).toHaveCount(1);

      const initialTabText = await initialTabs.first().textContent();
      expect(initialTabText?.toLowerCase()).toBe("email");

      // Should be able to add SMS and Push (from routing.channels)
      const addChannelButton = page.locator('text="+ Add channel"');
      if (await addChannelButton.isVisible()) {
        await addChannelButton.click();

        // Should see SMS and Push in dropdown (but not Inbox since it's not in routing.channels)
        const dropdownItems = page.locator('[role="menuitem"]');
        await expect(dropdownItems).toHaveCount(2);

        const dropdownTexts = await dropdownItems.allTextContents();
        expect(dropdownTexts.map((t) => t.toLowerCase())).toEqual(
          expect.arrayContaining(["sms", "push"])
        );
        expect(dropdownTexts.map((t) => t.toLowerCase())).not.toContain("inbox");

        // Add SMS channel
        const smsOption = dropdownItems.locator('text="SMS"').first();
        await smsOption.click();

        // Should now have Email and SMS tabs
        await expect(initialTabs).toHaveCount(2);
      }
    });

    test("should preserve channel content when switching with routing.channels priority", async ({
      page,
    }) => {
      console.log("🎯 Testing channel content preservation with routing.channels");

      // Mock a template with existing content in multiple channels
      const templateWithContent = {
        ...mockTemplateDataSamples.emptyTemplate,
        data: {
          ...mockTemplateDataSamples.emptyTemplate.data,
          tenant: {
            ...mockTemplateDataSamples.emptyTemplate.data.tenant,
            notification: {
              ...mockTemplateDataSamples.emptyTemplate.data.tenant.notification,
              data: {
                content: {
                  version: "2022-01-01",
                  elements: [
                    {
                      type: "channel",
                      channel: "email",
                      elements: [
                        {
                          type: "heading",
                          level: 1,
                          children: [{ text: "Email Content" }],
                        },
                      ],
                    },
                    {
                      type: "channel",
                      channel: "push",
                      elements: [
                        {
                          type: "paragraph",
                          children: [{ text: "Push Content" }],
                        },
                      ],
                    },
                    {
                      type: "channel",
                      channel: "inbox",
                      elements: [
                        {
                          type: "paragraph",
                          children: [{ text: "Inbox Content" }],
                        },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      };

      await mockTemplateResponse(page, templateWithContent, { delay: 300 });
      await page.goto("/", { waitUntil: "domcontentloaded" });

      // Set routing.channels to only allow email and push (excluding inbox)
      await page.evaluate(() => {
        const mockOverride = {
          routing: {
            method: "single",
            channels: ["email", "push"], // Should filter out inbox content
          },
          channels: ["email", "sms", "push", "inbox"], // Should be ignored
        };

        (window as any).__templateEditorPropsOverride = mockOverride;
      });

      await page.reload({ waitUntil: "domcontentloaded" });
      await ensureEditorReady(page);

      // Should show Email and Push tabs (existing content filtered by routing.channels)
      const channelTabs = page.locator('[role="tablist"] [role="tab"]');
      await expect(channelTabs).toHaveCount(2);

      const tabTexts = await channelTabs.allTextContents();
      expect(tabTexts.map((t) => t.toLowerCase())).toEqual(
        expect.arrayContaining(["email", "push"])
      );
      expect(tabTexts.map((t) => t.toLowerCase())).not.toContain("inbox");

      // Verify content is preserved when switching
      const emailTab = page.locator('[role="tab"]', { hasText: /email/i });
      const pushTab = page.locator('[role="tab"]', { hasText: /push/i });

      // Check email content
      await emailTab.click();
      const emailEditor = page.locator(".tiptap.ProseMirror").first();
      await expect(emailEditor).toContainText("Email Content");

      // Check push content
      await pushTab.click();
      const pushEditor = page.locator(".tiptap.ProseMirror").first();
      await expect(pushEditor).toContainText("Push Content");
    });
  });
});
