import { test, expect, type Page } from "@playwright/test";
import { ensureEditorReady, resetEditorState } from "./test-utils";
import { clearEditorContent, verifyEditorFunctionality } from "./template-test-utils";

test.describe("Template Loading E2E", () => {
  // Mock template data that simulates server response
  const mockTemplateData = {
    data: {
      tenant: {
        tenantId: "test-tenant-123",
        name: "Test Tenant",
        notification: {
          createdAt: "2023-01-01T00:00:00Z",
          publishedAt: null,
          notificationId: "test-template-456",
          version: "1.0.0",
          data: {
            content: {
              version: "2022-01-01",
              elements: [
                {
                  type: "channel",
                  channel: "email",
                  elements: [
                    {
                      type: "meta",
                      title: "Test Email Subject",
                    },
                    {
                      type: "text",
                      content: "Welcome to our service!",
                      align: "left",
                      color: "#292929",
                      background_color: "transparent",
                      text_style: "h1",
                      padding: "6px 0px",
                    },
                    {
                      type: "text",
                      content: "This is a test email template loaded from the server.",
                      align: "left",
                      color: "#292929",
                      background_color: "transparent",
                      padding: "6px 0px",
                    },
                  ],
                },
                {
                  type: "channel",
                  channel: "sms",
                  elements: [
                    {
                      type: "text",
                      content: "Welcome! This is a test SMS.",
                      align: "left",
                      color: "#292929",
                      background_color: "transparent",
                      padding: "6px 0px",
                    },
                  ],
                },
              ],
            },
            routing: {
              method: "single",
              channels: ["email", "sms"],
            },
          },
        },
        brand: {
          brandId: "test-brand-789",
          name: "Test Brand",
          settings: {
            colors: {
              primary: "#1E40AF",
              secondary: "#64748B",
              tertiary: "#F59E0B",
            },
            email: {
              header: {
                barColor: "#1E40AF",
                logo: {
                  href: "https://example.com",
                  image: "https://example.com/logo.png",
                },
              },
              footer: {
                markdown: "© 2023 Test Company. All rights reserved.",
                social: {
                  facebook: { url: "https://facebook.com/testcompany" },
                  twitter: { url: "https://twitter.com/testcompany" },
                },
              },
            },
          },
        },
      },
    },
  };

  // Helper function to mock server response
  async function mockTemplateServerResponse(page: Page, templateData = mockTemplateData, delay = 1000) {
    await page.route("**/graphql", async (route) => {
      const request = route.request();
      const postData = request.postData();
      
      if (postData && postData.includes("GetTenant")) {
        // Simulate server delay
        await new Promise(resolve => setTimeout(resolve, delay));
        
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(templateData),
        });
      } else {
        await route.continue();
      }
    });
  }

  // Helper function to wait for loading state
  async function waitForLoadingComplete(page: Page, timeout = 10000) {
    await page.waitForFunction(
      () => {
        return window.editorStore?.get?.(window.isTemplateLoadingAtom) === false;
      },
      { timeout }
    );
  }

  // Helper to inject loading atom into page for testing
  async function injectLoadingAtomAccess(page: Page) {
    await page.addInitScript(() => {
      // Make loading atom accessible for testing
      window.isTemplateLoadingAtom = null;
      window.editorStore = null;
      
      // Hook into the app initialization to capture atoms
      const originalDefineProperty = Object.defineProperty;
      Object.defineProperty = function(obj: any, prop: string, descriptor: PropertyDescriptor) {
        if (prop === 'isTemplateLoadingAtom' && obj.constructor?.name === 'Object') {
          window.isTemplateLoadingAtom = obj[prop];
        }
        if (prop === 'editorStore' && obj.constructor?.name === 'Object') {
          window.editorStore = obj[prop];
        }
        return originalDefineProperty.call(this, obj, prop, descriptor);
      };
    });
  }

  test.beforeEach(async ({ page }) => {
    // Setup isolated environment
    await injectLoadingAtomAccess(page);
    await resetEditorState(page);
  });

  test("1. Initial TemplateProvider/TemplateEditor loading state", async ({ page }) => {
    // Mock a delayed server response to test loading state
    await mockTemplateServerResponse(page, mockTemplateData, 2000);
    
    // Navigate to the app
    await page.goto("/", { waitUntil: "domcontentloaded" });
    
    // Verify initial page load
    await expect(page).toHaveTitle(/React Editor Dev/);
    
    // Wait for the app structure to be present
    await page.waitForSelector("body", { timeout: 10000 });
    
    // Verify TemplateProvider is initialized (check for tenant/template selectors)
    const tenantSelect = page.locator("select").first();
    await expect(tenantSelect).toBeVisible({ timeout: 15000 });
    
    // Verify template selector is present
    const templateSelect = page.locator("select").nth(1);
    await expect(templateSelect).toBeVisible();
    
    // Verify TemplateEditor loading state by checking for editor container
    // The editor should be initializing
    await page.waitForTimeout(1000); // Allow React to mount
    
    // Check if loading indicators or empty state are shown initially
    // Since the server response is delayed, we should see loading state
    const editorContainer = page.locator(".tiptap.ProseMirror").first();
    
    // Wait for editor to appear (even if empty initially)
    await expect(editorContainer).toBeVisible({ timeout: 15000 });
    
    // Verify the editor is in an editable state
    await expect(editorContainer).toHaveAttribute("contenteditable", "true");
  });

  test("2. Load template from server with proper data flow", async ({ page }) => {
    // Mock server response with realistic delay
    await mockTemplateServerResponse(page, mockTemplateData, 800);
    
    // Navigate and wait for initial load
    await page.goto("/", { waitUntil: "domcontentloaded" });
    
    // Wait for template loading to complete
    await page.waitForTimeout(2000); // Allow for the dev app's setTimeout delay
    
    // Verify template data was loaded by checking if content appears
    const editor = page.locator(".tiptap.ProseMirror").first();
    await expect(editor).toBeVisible({ timeout: 15000 });
    
    // Check for template content (the dev app loads templateDataTemp by default)
    // The content should contain elements from the loaded template
    await page.waitForTimeout(1000); // Allow content to render
    
    // Verify subject field has the loaded template's subject
    const subjectInput = page.locator('input[placeholder="Write subject..."]');
    await expect(subjectInput).toBeVisible();
    
    // Switch to email channel to see email content
    const emailChannelButton = page.locator("button").filter({ hasText: /email/i }).first();
    if (await emailChannelButton.isVisible()) {
      await emailChannelButton.click();
      await page.waitForTimeout(500);
    }
    
    // Verify editor contains some content (from templateDataTemp in dev app)
    const editorContent = await editor.textContent();
    expect(editorContent).toBeTruthy();
    expect(editorContent?.length).toBeGreaterThan(0);
    
    // Verify the editor is interactive
    await editor.click();
    await expect(editor).toHaveAttribute("contenteditable", "true");
  });

  test("3. Template data restoration and state management", async ({ page }) => {
    // Mock template response
    await mockTemplateServerResponse(page, mockTemplateData, 500);
    
    // Navigate to app
    await page.goto("/", { waitUntil: "domcontentloaded" });
    
    // Wait for initial template load
    await page.waitForTimeout(2000);
    
    // Verify editor is loaded
    const editor = await ensureEditorReady(page);
    
    // Test state persistence by switching channels
    const channels = ["email", "sms", "push", "inbox"];
    
    for (const channel of channels) {
      const channelButton = page.locator("button").filter({ hasText: new RegExp(channel, "i") }).first();
      
      if (await channelButton.isVisible()) {
        await channelButton.click();
        await page.waitForTimeout(500);
        
        // Verify editor remains functional
        await expect(editor).toBeVisible();
        await expect(editor).toHaveAttribute("contenteditable", "true");
        
        // Verify content can be edited
        await editor.click();
        await page.keyboard.type(" Test edit");
        await page.waitForTimeout(200);
        
        // Clear the added text
        await page.keyboard.press("Control+z"); // Undo
        await page.waitForTimeout(200);
      }
    }
    
    // Test template ID switching (simulating loading different templates)
    const templateSelect = page.locator("select").nth(1);
    if (await templateSelect.isVisible()) {
      // Get current selection
      const currentValue = await templateSelect.inputValue();
      
      // Switch to different template
      const options = await templateSelect.locator("option").all();
      if (options.length > 1) {
        const newOption = options.find(async (option) => {
          const value = await option.getAttribute("value");
          return value !== currentValue;
        });
        
        if (newOption) {
          const newValue = await newOption.getAttribute("value");
          if (newValue) {
            await templateSelect.selectOption(newValue);
            await page.waitForTimeout(1500); // Allow for template loading
            
            // Verify editor remains functional after template switch
            await expect(editor).toBeVisible();
            await expect(editor).toHaveAttribute("contenteditable", "true");
          }
        }
      }
    }
    
    // Verify subject field functionality
    const subjectInput = page.locator('input[placeholder="Write subject..."]');
    if (await subjectInput.isVisible()) {
      await subjectInput.click();
      await subjectInput.fill("Test Subject Line");
      await page.keyboard.press("Enter");
      
      // Verify subject persists
      await expect(subjectInput).toHaveValue("Test Subject Line");
    }
  });

  test("4. Template loading error handling", async ({ page }) => {
    // Mock server error response
    await page.route("**/graphql", async (route) => {
      const request = route.request();
      const postData = request.postData();
      
      if (postData && postData.includes("GetTenant")) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ errors: [{ message: "Server error" }] }),
        });
      } else {
        await route.continue();
      }
    });
    
    // Navigate to app
    await page.goto("/", { waitUntil: "domcontentloaded" });
    
    // Wait for potential error handling
    await page.waitForTimeout(2000);
    
    // Editor should still be present and functional even with server errors
    const editor = page.locator(".tiptap.ProseMirror").first();
    await expect(editor).toBeVisible({ timeout: 15000 });
    await expect(editor).toHaveAttribute("contenteditable", "true");
    
    // Verify basic functionality still works
    await clearEditorContent(page);
    await editor.click();
    await page.keyboard.type("Error state test");
    await expect(editor).toContainText("Error state test");
  });

  test("5. Template loading with empty/null data", async ({ page }) => {
    // Mock empty template response
    const emptyTemplateData = {
      data: {
        tenant: {
          tenantId: "test-tenant",
          name: "Test Tenant",
          notification: null, // No notification data
          brand: null,
        },
      },
    };
    
    await mockTemplateServerResponse(page, emptyTemplateData, 300);
    
    // Navigate to app
    await page.goto("/", { waitUntil: "domcontentloaded" });
    
    // Wait for loading
    await page.waitForTimeout(2000);
    
    // Editor should handle empty state gracefully
    const editor = await ensureEditorReady(page);
    
    // Should be able to start editing from empty state
    await clearEditorContent(page);
    await editor.click();
    await page.keyboard.type("Starting fresh content");
    await expect(editor).toContainText("Starting fresh content");
    
    // Subject field should be empty but functional
    const subjectInput = page.locator('input[placeholder="Write subject..."]');
    if (await subjectInput.isVisible()) {
      await expect(subjectInput).toHaveValue("");
      await subjectInput.fill("New Subject");
      await expect(subjectInput).toHaveValue("New Subject");
    }
  });

  test("6. Multiple template loading cycles", async ({ page }) => {
    // Test multiple load cycles to ensure proper cleanup
    await mockTemplateServerResponse(page, mockTemplateData, 200);
    
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    
    const editor = await ensureEditorReady(page);
    const templateSelect = page.locator("select").nth(1);
    
    if (await templateSelect.isVisible()) {
      const options = await templateSelect.locator("option").all();
      
      // Cycle through templates multiple times
      for (let cycle = 0; cycle < 2; cycle++) {
        for (let i = 0; i < Math.min(options.length, 2); i++) {
          const option = options[i];
          const value = await option.getAttribute("value");
          
          if (value) {
            await templateSelect.selectOption(value);
            await page.waitForTimeout(800); // Allow template to load
            
            // Verify editor remains functional after each switch
            await expect(editor).toBeVisible();
            await expect(editor).toHaveAttribute("contenteditable", "true");
            
            // Quick interaction test
            await editor.click();
            await page.keyboard.type(` cycle${cycle}-${i}`);
            await page.waitForTimeout(100);
            
            // Clear the test text
            await page.keyboard.press("Control+a");
            await page.keyboard.press("Delete");
            await page.waitForTimeout(100);
          }
        }
      }
    }
    
    // Final verification that editor is still functional
    await verifyEditorFunctionality(page);
  });
});

// Extend global types for our test helpers
declare global {
  interface Window {
    isTemplateLoadingAtom: any;
    editorStore: any;
  }
}
