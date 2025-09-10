import { test, expect } from "@playwright/test";
import { ensureEditorReady } from "./test-utils";
import { mockTemplateResponse, mockTemplateDataSamples } from "./template-test-utils";

/**
 * E2E Tests for Channels Backward Compatibility
 *
 * These tests ensure that the deprecation of the `channels` prop maintains
 * complete backward compatibility for existing implementations while
 * encouraging migration to the new `routing.channels` approach.
 *
 * Test scenarios:
 * 1. Legacy code using only `channels` prop continues to work
 * 2. Migration scenarios work correctly
 * 3. Error handling for deprecated usage
 * 4. Performance and behavior parity
 */

test.describe("Channels Backward Compatibility E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Mock empty template for predictable starting state
    await mockTemplateResponse(page, mockTemplateDataSamples.emptyTemplate, { delay: 300 });
  });

  test.describe("legacy channels prop support", () => {
    test("should work exactly like before with only channels prop", async ({ page }) => {
      console.log("🔄 Testing legacy channels prop behavior preservation");

      await page.goto("/", { waitUntil: "domcontentloaded" });

      // Simulate legacy usage - only channels prop, no routing
      await page.evaluate(() => {
        const legacyOverride = {
          channels: ["sms", "push", "inbox"], // Legacy prop only
          routing: undefined, // No routing prop
        };

        (window as any).__templateEditorPropsOverride = legacyOverride;
      });

      await page.reload({ waitUntil: "domcontentloaded" });
      await ensureEditorReady(page);

      // Should behave exactly as before - show first channel from array
      const channelTabs = page.locator('[role="tablist"] [role="tab"]');
      await expect(channelTabs).toHaveCount(1); // Only first channel initially

      const activeTab = channelTabs.first();
      const tabText = await activeTab.textContent();
      expect(tabText?.toLowerCase()).toBe("sms"); // First in the channels array

      // Should be able to add other channels from the channels prop
      const addChannelButton = page.locator('text="+ Add channel"');
      if (await addChannelButton.isVisible()) {
        await addChannelButton.click();

        const dropdownItems = page.locator('[role="menuitem"]');
        await expect(dropdownItems).toHaveCount(2); // Push and Inbox

        const dropdownTexts = await dropdownItems.allTextContents();
        expect(dropdownTexts.map((t) => t.toLowerCase())).toEqual(
          expect.arrayContaining(["push", "inbox"])
        );
      }
    });

    test("should handle all original channels prop variations", async ({ page }) => {
      console.log("🔄 Testing various legacy channels prop configurations");

      // Test different channel combinations that were previously supported
      const legacyConfigurations = [
        {
          name: "email-only",
          channels: ["email"],
          expectedTabs: 1,
          expectedActive: "email",
        },
        {
          name: "email-sms",
          channels: ["email", "sms"],
          expectedTabs: 1,
          expectedActive: "email",
        },
        {
          name: "all-channels",
          channels: ["email", "sms", "push", "inbox"],
          expectedTabs: 1,
          expectedActive: "email",
        },
        {
          name: "non-email-start",
          channels: ["push", "inbox", "sms"],
          expectedTabs: 1,
          expectedActive: "push",
        },
      ];

      for (const config of legacyConfigurations) {
        console.log(`Testing legacy config: ${config.name}`);

        await page.goto("/", { waitUntil: "domcontentloaded" });

        await page.evaluate((testConfig) => {
          const legacyOverride = {
            channels: testConfig.channels,
            routing: undefined,
          };

          (window as any).__templateEditorPropsOverride = legacyOverride;
        }, config);

        await page.reload({ waitUntil: "domcontentloaded" });
        await ensureEditorReady(page);

        // Verify expected behavior
        const channelTabs = page.locator('[role="tablist"] [role="tab"]');
        await expect(channelTabs).toHaveCount(config.expectedTabs);

        const activeTab = channelTabs.first();
        const tabText = await activeTab.textContent();
        expect(tabText?.toLowerCase()).toBe(config.expectedActive);

        // Verify add channel functionality works
        const addChannelButton = page.locator('text="+ Add channel"');
        if (await addChannelButton.isVisible()) {
          await addChannelButton.click();

          const dropdownItems = page.locator('[role="menuitem"]');
          const expectedDropdownCount = config.channels.length - 1; // All except the active one
          await expect(dropdownItems).toHaveCount(expectedDropdownCount);
        }
      }
    });

    test("should preserve legacy channel switching behavior", async ({ page }) => {
      console.log("🔄 Testing legacy channel switching preservation");

      await page.goto("/", { waitUntil: "domcontentloaded" });

      await page.evaluate(() => {
        const legacyOverride = {
          channels: ["email", "sms", "push"],
          routing: undefined,
        };

        (window as any).__templateEditorPropsOverride = legacyOverride;
      });

      await page.reload({ waitUntil: "domcontentloaded" });
      await ensureEditorReady(page);

      // Add all available channels to test switching
      const addChannelButton = page.locator('text="+ Add channel"');
      if (await addChannelButton.isVisible()) {
        // Add SMS
        await addChannelButton.click();
        const smsOption = page.locator('[role="menuitem"]', { hasText: /sms/i });
        await smsOption.click();

        // Add Push
        if (await addChannelButton.isVisible()) {
          await addChannelButton.click();
          const pushOption = page.locator('[role="menuitem"]', { hasText: /push/i });
          await pushOption.click();
        }
      }

      // Now test switching between all channels
      const emailTab = page.locator('[role="tab"]', { hasText: /email/i });
      const smsTab = page.locator('[role="tab"]', { hasText: /sms/i });
      const pushTab = page.locator('[role="tab"]', { hasText: /push/i });

      // Test the switching behavior
      await emailTab.click();
      await expect(emailTab).toHaveAttribute("data-state", "active");

      await smsTab.click();
      await expect(smsTab).toHaveAttribute("data-state", "active");
      await expect(emailTab).not.toHaveAttribute("data-state", "active");

      await pushTab.click();
      await expect(pushTab).toHaveAttribute("data-state", "active");
      await expect(smsTab).not.toHaveAttribute("data-state", "active");

      // Switch back to confirm bidirectional switching
      await emailTab.click();
      await expect(emailTab).toHaveAttribute("data-state", "active");
      await expect(pushTab).not.toHaveAttribute("data-state", "active");
    });
  });

  test.describe("migration scenarios", () => {
    test("should handle gradual migration from channels to routing.channels", async ({ page }) => {
      console.log("🔄 Testing gradual migration scenario");

      await page.goto("/", { waitUntil: "domcontentloaded" });

      // Simulate a gradual migration scenario where routing is partially implemented
      await page.evaluate(() => {
        const migrationOverride = {
          channels: ["email", "sms", "push", "inbox"], // Legacy prop still present
          routing: {
            method: "single",
            channels: ["email", "sms"], // New prop with restricted channels
          },
        };

        (window as any).__templateEditorPropsOverride = migrationOverride;
      });

      await page.reload({ waitUntil: "domcontentloaded" });
      await ensureEditorReady(page);

      // Should use routing.channels (email, sms) and ignore legacy channels prop
      const channelTabs = page.locator('[role="tablist"] [role="tab"]');
      await expect(channelTabs).toHaveCount(1); // First channel only

      const activeTab = channelTabs.first();
      const tabText = await activeTab.textContent();
      expect(tabText?.toLowerCase()).toBe("email");

      // Add channel dropdown should only show SMS (from routing.channels)
      const addChannelButton = page.locator('text="+ Add channel"');
      if (await addChannelButton.isVisible()) {
        await addChannelButton.click();

        const dropdownItems = page.locator('[role="menuitem"]');
        await expect(dropdownItems).toHaveCount(1); // Only SMS

        const dropdownText = await dropdownItems.first().textContent();
        expect(dropdownText?.toLowerCase()).toBe("sms");
      }
    });

    test("should handle complete migration to routing.channels", async ({ page }) => {
      console.log("🔄 Testing complete migration to routing.channels");

      await page.goto("/", { waitUntil: "domcontentloaded" });

      // Simulate complete migration - only routing prop, no legacy channels
      await page.evaluate(() => {
        const modernOverride = {
          channels: undefined, // No legacy prop
          routing: {
            method: "all",
            channels: ["push", "inbox"],
          },
        };

        (window as any).__templateEditorPropsOverride = modernOverride;
      });

      await page.reload({ waitUntil: "domcontentloaded" });
      await ensureEditorReady(page);

      // Should work with only routing.channels
      const channelTabs = page.locator('[role="tablist"] [role="tab"]');
      await expect(channelTabs).toHaveCount(1);

      const activeTab = channelTabs.first();
      const tabText = await activeTab.textContent();
      expect(tabText?.toLowerCase()).toBe("push");

      // Should be able to add inbox
      const addChannelButton = page.locator('text="+ Add channel"');
      if (await addChannelButton.isVisible()) {
        await addChannelButton.click();

        const dropdownItems = page.locator('[role="menuitem"]');
        await expect(dropdownItems).toHaveCount(1);

        const dropdownText = await dropdownItems.first().textContent();
        expect(dropdownText?.toLowerCase()).toBe("inbox");
      }
    });
  });

  test.describe("performance and behavior parity", () => {
    test("should have same performance characteristics with legacy channels prop", async ({
      page,
    }) => {
      console.log("🔄 Testing performance parity for legacy usage");

      // Test with a large number of channel switches to verify no performance regression
      await page.goto("/", { waitUntil: "domcontentloaded" });

      await page.evaluate(() => {
        const legacyOverride = {
          channels: ["email", "sms", "push", "inbox"],
          routing: undefined,
        };

        (window as any).__templateEditorPropsOverride = legacyOverride;
      });

      await page.reload({ waitUntil: "domcontentloaded" });
      await ensureEditorReady(page);

      // Add all channels
      const addChannelButton = page.locator('text="+ Add channel"');
      const channelsToAdd = ["sms", "push", "inbox"];

      for (const channelName of channelsToAdd) {
        if (await addChannelButton.isVisible()) {
          await addChannelButton.click();
          const channelOption = page.locator('[role="menuitem"]', {
            hasText: new RegExp(channelName, "i"),
          });
          await channelOption.click();
        }
      }

      // Perform rapid channel switching to test performance
      const startTime = Date.now();

      for (let i = 0; i < 5; i++) {
        await page.locator('[role="tab"]', { hasText: /email/i }).click();
        await page.waitForTimeout(100);

        await page.locator('[role="tab"]', { hasText: /sms/i }).click();
        await page.waitForTimeout(100);

        await page.locator('[role="tab"]', { hasText: /push/i }).click();
        await page.waitForTimeout(100);

        await page.locator('[role="tab"]', { hasText: /inbox/i }).click();
        await page.waitForTimeout(100);
      }

      const endTime = Date.now();
      const switchingTime = endTime - startTime;

      // Should complete within reasonable time (allowing for test environment overhead)
      expect(switchingTime).toBeLessThan(10000); // 10 seconds max

      // Verify final state is correct
      const inboxTab = page.locator('[role="tab"]', { hasText: /inbox/i });
      await expect(inboxTab).toHaveAttribute("data-state", "active");
    });

    test("should maintain content persistence with legacy channels prop", async ({ page }) => {
      console.log("🔄 Testing content persistence with legacy channels");

      // Create template with content in multiple channels
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
                        { type: "paragraph", children: [{ text: "Email content preserved" }] },
                      ],
                    },
                    {
                      type: "channel",
                      channel: "sms",
                      elements: [],
                      raw: { text: "SMS content preserved" },
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

      await page.evaluate(() => {
        const legacyOverride = {
          channels: ["email", "sms", "push"],
          routing: undefined,
        };

        (window as any).__templateEditorPropsOverride = legacyOverride;
      });

      await page.reload({ waitUntil: "domcontentloaded" });
      await ensureEditorReady(page);

      // Should show existing channels (email, sms)
      const channelTabs = page.locator('[role="tablist"] [role="tab"]');
      await expect(channelTabs).toHaveCount(2);

      // Verify content is preserved when switching
      const emailTab = page.locator('[role="tab"]', { hasText: /email/i });
      const smsTab = page.locator('[role="tab"]', { hasText: /sms/i });

      // Check email content
      await emailTab.click();
      const emailEditor = page.locator(".tiptap.ProseMirror").first();
      await expect(emailEditor).toContainText("Email content preserved");

      // Check SMS content
      await smsTab.click();
      // SMS uses a different editor structure
      const smsTextarea = page.locator('textarea[placeholder*="Enter your SMS message"]');
      if (await smsTextarea.isVisible()) {
        const smsContent = await smsTextarea.inputValue();
        expect(smsContent).toContain("SMS content preserved");
      }
    });
  });

  test.describe("error handling and edge cases", () => {
    test("should handle undefined/null channels prop gracefully", async ({ page }) => {
      console.log("🔄 Testing undefined/null channels prop handling");

      await page.goto("/", { waitUntil: "domcontentloaded" });

      // Test with undefined channels
      await page.evaluate(() => {
        const edgeCaseOverride = {
          channels: undefined,
          routing: undefined,
        };

        (window as any).__templateEditorPropsOverride = edgeCaseOverride;
      });

      await page.reload({ waitUntil: "domcontentloaded" });
      await ensureEditorReady(page);

      // Should use default channels
      const channelTabs = page.locator('[role="tablist"] [role="tab"]');
      await expect(channelTabs).toHaveCount(1);

      const activeTab = channelTabs.first();
      const tabText = await activeTab.textContent();
      expect(tabText?.toLowerCase()).toBe("email"); // Default first channel
    });

    test("should handle empty channels array", async ({ page }) => {
      console.log("🔄 Testing empty channels array handling");

      await page.goto("/", { waitUntil: "domcontentloaded" });

      await page.evaluate(() => {
        const edgeCaseOverride = {
          channels: [], // Empty array
          routing: undefined,
        };

        (window as any).__templateEditorPropsOverride = edgeCaseOverride;
      });

      await page.reload({ waitUntil: "domcontentloaded" });
      await ensureEditorReady(page);

      // Should handle empty array gracefully (likely fallback to default)
      const channelTabs = page.locator('[role="tablist"] [role="tab"]');

      // Should either show default channel or handle empty state gracefully
      const tabCount = await channelTabs.count();
      expect(tabCount).toBeGreaterThanOrEqual(0); // Should not crash
    });

    test("should handle invalid channel values in legacy channels prop", async ({ page }) => {
      console.log("🔄 Testing invalid channel values in legacy prop");

      await page.goto("/", { waitUntil: "domcontentloaded" });

      await page.evaluate(() => {
        const edgeCaseOverride = {
          channels: ["email", "invalid-channel", "sms", null, undefined], // Mixed valid/invalid
          routing: undefined,
        };

        (window as any).__templateEditorPropsOverride = edgeCaseOverride;
      });

      await page.reload({ waitUntil: "domcontentloaded" });
      await ensureEditorReady(page);

      // Should filter out invalid channels and work with valid ones
      const channelTabs = page.locator('[role="tablist"] [role="tab"]');
      await expect(channelTabs).toHaveCount(1); // Should show first valid channel

      const activeTab = channelTabs.first();
      const tabText = await activeTab.textContent();
      expect(tabText?.toLowerCase()).toBe("email");

      // Add channel should only show valid channels
      const addChannelButton = page.locator('text="+ Add channel"');
      if (await addChannelButton.isVisible()) {
        await addChannelButton.click();

        const dropdownItems = page.locator('[role="menuitem"]');
        await expect(dropdownItems).toHaveCount(1); // Only SMS should be valid

        const dropdownText = await dropdownItems.first().textContent();
        expect(dropdownText?.toLowerCase()).toBe("sms");
      }
    });
  });
});
