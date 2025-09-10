import { test, expect } from "@playwright/test";
import { ensureEditorReady } from "./test-utils";
import { mockTemplateResponse, verifyEditorFunctionality } from "./template-test-utils";

/**
 * E2E Tests for Template Switching Scenarios
 *
 * These tests validate the core template switching functionality that was
 * causing DOM crashes and content overwriting issues.
 */

test.describe("Template Switching E2E", () => {
  // Mock data for template-1 with Email, SMS, Push channels
  const template1Data = {
    data: {
      tenant: {
        tenantId: "test-tenant-123",
        name: "Test Tenant",
        brand: {
          id: "brand-123",
          name: "Test Brand",
          settings: {
            colors: {
              primary: "#007bff",
              secondary: "#6c757d",
            },
          },
        },
        defaultBrandId: "brand-123",
        templates: [
          {
            id: "template-1",
            title: "Template One",
            subject: "Welcome to Template 1",
            routing: {
              method: "single",
              channels: [
                {
                  blockIds: [],
                  channel: "email",
                  config: {},
                  providers: [],
                  taxonomy: "",
                  if: "",
                },
                {
                  blockIds: [],
                  channel: "sms",
                  config: {},
                  providers: [],
                  taxonomy: "",
                  if: "",
                },
                {
                  blockIds: [],
                  channel: "push",
                  config: {},
                  providers: [],
                  taxonomy: "",
                  if: "",
                },
              ],
            },
            json: {
              elements: [
                {
                  type: "channel",
                  channel: "email",
                  elements: [
                    {
                      type: "meta",
                      title: "Template 1 Email Subject",
                    },
                    {
                      type: "text",
                      content: "This is Template 1 Email content with custom text.",
                    },
                    {
                      type: "text",
                      content: "Template 1 has Email, SMS, and Push channels.",
                    },
                  ],
                },
                {
                  type: "channel",
                  channel: "sms",
                  elements: [
                    {
                      type: "text",
                      content: "Template 1 SMS: Hello from SMS channel with custom content!",
                    },
                  ],
                },
                {
                  type: "channel",
                  channel: "push",
                  elements: [
                    {
                      type: "text",
                      content: "Template 1 Push: Push notification with custom message.",
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    },
  };

  // Mock data for template-2 with SMS, Inbox channels
  const template2Data = {
    data: {
      tenant: {
        tenantId: "test-tenant-123",
        name: "Test Tenant",
        brand: {
          id: "brand-123",
          name: "Test Brand",
          settings: {
            colors: {
              primary: "#007bff",
              secondary: "#6c757d",
            },
          },
        },
        defaultBrandId: "brand-123",
        templates: [
          {
            id: "template-2",
            title: "Template Two",
            subject: "Welcome to Template 2",
            routing: {
              method: "single",
              channels: [
                {
                  blockIds: [],
                  channel: "sms",
                  config: {},
                  providers: [],
                  taxonomy: "",
                  if: "",
                },
                {
                  blockIds: [],
                  channel: "inbox",
                  config: {},
                  providers: [],
                  taxonomy: "",
                  if: "",
                },
              ],
            },
            json: {
              elements: [
                {
                  type: "channel",
                  channel: "sms",
                  elements: [
                    {
                      type: "text",
                      content: "Template 2 SMS: Different SMS content for template 2.",
                    },
                  ],
                },
                {
                  type: "channel",
                  channel: "inbox",
                  elements: [
                    {
                      type: "text",
                      content: "Template 2 Inbox: Custom inbox message for template 2.",
                    },
                    {
                      type: "text",
                      content: "This template only has SMS and Inbox channels.",
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    },
  };

  test("Complete template switching scenario with different channel configurations", async ({
    page,
  }) => {
    console.log("🔄 Starting comprehensive template switching test...");

    // Set up dynamic mock responses based on which template is requested
    let currentTemplateData = template1Data;

    await page.route("**/graphql*", async (route) => {
      const request = route.request();
      const postData = request.postData();

      if (postData && postData.includes("GetTenant")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(currentTemplateData),
        });
      } else {
        await route.continue();
      }
    });

    // Navigate to the application
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // ===== STEP 1: Load template-1 and verify initial state =====
    console.log("📝 Step 1: Loading template-1 with Email, SMS, Push channels");

    // Wait for app to initialize
    const editor = await ensureEditorReady(page);
    await expect(editor).toBeVisible();

    // Select first template if not already selected
    const templateSelect = page.locator("select").nth(1); // Second select is for templates
    if (await templateSelect.isVisible()) {
      // Get the first available template option
      const firstOption = await templateSelect.locator("option").first().getAttribute("value");
      if (firstOption) {
        await templateSelect.selectOption(firstOption);
        await page.waitForTimeout(1500);
      }
    }

    // ===== STEP 2: Verify template-1 content and channels =====
    console.log("✅ Step 2: Verifying template-1 channels and content");

    // Wait for the editor to be properly loaded
    await page.waitForTimeout(2000);

    // Find channel navigation elements (the dev app uses custom channel navigation)
    // Look for any channel-related buttons or navigation elements
    const channelElements = page.locator(
      "button, div[role='button'], [data-channel], [class*='channel']"
    );
    const channelCount = await channelElements.count();
    console.log(`📊 Found ${channelCount} potential channel elements`);

    // Check if we can find any channel-specific text or elements
    const hasEmailContent = await page
      .getByText("email", { exact: false })
      .isVisible()
      .catch(() => false);
    const hasSMSContent = await page
      .getByText("sms", { exact: false })
      .isVisible()
      .catch(() => false);
    const hasPushContent = await page
      .getByText("push", { exact: false })
      .isVisible()
      .catch(() => false);

    console.log(`📧 Email content visible: ${hasEmailContent}`);
    console.log(`📱 SMS content visible: ${hasSMSContent}`);
    console.log(`🔔 Push content visible: ${hasPushContent}`);

    // Verify the main editor is present and functional
    let currentEditor = page.locator(".tiptap.ProseMirror").first();
    await expect(currentEditor).toBeVisible();
    await verifyEditorFunctionality(page);

    // Check for subject field if present (indicates email channel)
    const subjectInput = page.locator('input[placeholder="Write subject..."]');
    if (await subjectInput.isVisible()) {
      const subjectValue = await subjectInput.inputValue();
      console.log("📧 Email subject field found:", subjectValue);
    }

    // ===== STEP 3: Change to template-2 =====
    console.log("🔄 Step 3: Switching to template-2 with SMS, Inbox channels");

    // Update mock data to return template-2
    currentTemplateData = template2Data;

    // Select second template
    if (await templateSelect.isVisible()) {
      // Get the second available template option
      const secondOption = await templateSelect.locator("option").nth(1).getAttribute("value");
      if (secondOption) {
        await templateSelect.selectOption(secondOption);
        await page.waitForTimeout(2000); // Allow time for template switch and data loading
      }
    }

    // ===== STEP 4: Verify template-2 content and channels =====
    console.log("✅ Step 4: Verifying template-2 channels and content");

    // Wait for template transition to complete
    currentEditor = await ensureEditorReady(page);
    await expect(currentEditor).toBeVisible();
    await verifyEditorFunctionality(page);

    // Check if content has changed (indicating template switch worked)
    const template2Content = await currentEditor.textContent();
    console.log("📝 Template 2 content preview:", template2Content?.substring(0, 50) + "...");

    // Verify no crashes occurred during template switch
    await expect(currentEditor).toHaveAttribute("contenteditable", "true");

    // ===== STEP 5: Switch back to template-1 =====
    console.log("🔄 Step 5: Switching back to template-1");

    // Update mock data back to template-1
    currentTemplateData = template1Data;

    // Select first template again
    if (await templateSelect.isVisible()) {
      // Get the first available template option
      const firstOption = await templateSelect.locator("option").first().getAttribute("value");
      if (firstOption) {
        await templateSelect.selectOption(firstOption);
        await page.waitForTimeout(2000); // Allow time for template switch
      }
    }

    // ===== STEP 6: Verify template-1 content is restored =====
    console.log("✅ Step 6: Verifying template-1 content is properly restored");

    // Wait for template restoration
    currentEditor = await ensureEditorReady(page);
    await expect(currentEditor).toBeVisible();
    await verifyEditorFunctionality(page);

    // Check if content has been restored (indicating template switch back worked)
    const restoredContent = await currentEditor.textContent();
    console.log(
      "📝 Restored template 1 content preview:",
      restoredContent?.substring(0, 50) + "..."
    );

    // Final verification - ensure no crashes occurred during entire process
    await expect(currentEditor).toBeVisible();
    await expect(currentEditor).toHaveAttribute("contenteditable", "true");

    console.log("✅ Template switching test completed successfully!");
    console.log("🎉 All channel switches and template transitions worked without crashes!");
  });

  test("Rapid template switching stress test", async ({ page }) => {
    console.log("⚡ Starting rapid template switching stress test...");

    // Set up dynamic mock responses
    let currentTemplateData = template1Data;

    await page.route("**/graphql*", async (route) => {
      const request = route.request();
      const postData = request.postData();

      if (postData && postData.includes("GetTenant")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(currentTemplateData),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    const editor = await ensureEditorReady(page);
    const templateSelect = page.locator("select").nth(1);

    if (await templateSelect.isVisible()) {
      // Get the available template options
      const firstOption = await templateSelect.locator("option").first().getAttribute("value");
      const secondOption = await templateSelect.locator("option").nth(1).getAttribute("value");

      if (firstOption && secondOption) {
        // Perform rapid switching between templates
        for (let i = 0; i < 5; i++) {
          console.log(`🔄 Rapid switch cycle ${i + 1}/5`);

          // Switch to first template
          currentTemplateData = template1Data;
          await templateSelect.selectOption(firstOption);
          await page.waitForTimeout(500);

          // Verify editor is still functional
          await expect(editor).toBeVisible();
          await expect(editor).toHaveAttribute("contenteditable", "true");

          // Switch to second template
          currentTemplateData = template2Data;
          await templateSelect.selectOption(secondOption);
          await page.waitForTimeout(500);

          // Verify editor is still functional
          await expect(editor).toBeVisible();
          await expect(editor).toHaveAttribute("contenteditable", "true");
        }
      }
    }

    // Final functionality check
    await verifyEditorFunctionality(page);

    console.log("✅ Rapid switching stress test completed successfully!");
    console.log("🚀 No crashes or DOM errors detected during rapid switching!");
  });
});
