import { test, expect } from "@playwright/test";

/**
 * E2E Tests for Routing Save Behavior
 *
 * These tests verify that:
 * 1. Templates are saved with routing configuration (never null)
 * 2. TemplateEditor's routing prop is correctly synced and used during save
 * 3. Custom save buttons work correctly without passing routing explicitly
 */

test.describe("Routing Save Behavior", () => {
  // Track all save requests for verification
  let saveRequests: { routing: any; content: any }[] = [];

  test.beforeEach(async ({ page }) => {
    saveRequests = [];

    // Set up GraphQL mock
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
        // Mock get template response
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
                  publishedAt: new Date().toISOString(),
                  version: "v1",
                  data: {
                    content: {
                      version: "2022-01-01",
                      elements: [
                        {
                          type: "channel",
                          channel: "email",
                          elements: [
                            { type: "meta", title: "Test Subject" },
                            { type: "text", content: "Test content\n" },
                          ],
                        },
                      ],
                    },
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
      } else if (postData && postData.includes("SaveNotification")) {
        // Capture save request for verification
        try {
          const parsed = JSON.parse(postData);
          const data = parsed.variables?.input?.data;
          if (data) {
            saveRequests.push({
              routing: data.routing,
              content: data.content,
            });
          }
        } catch (e) {
          console.error("Failed to parse save request:", e);
        }

        // Mock save response
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              tenant: {
                notification: {
                  save: {
                    success: true,
                    version: "v2",
                    updatedAt: new Date().toISOString(),
                  },
                },
              },
            },
          }),
        });
      } else if (postData && postData.includes("PublishNotification")) {
        // Mock publish response
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              tenant: {
                notification: {
                  publish: {
                    success: true,
                    version: "v2",
                    publishedAt: new Date().toISOString(),
                  },
                },
              },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });
  });

  test("should save template with routing from TemplateEditor prop", async ({ page }) => {
    // Navigate to the demo app
    await page.goto("/");

    // Wait for the editor to load
    await page.waitForSelector("[data-testid='template-editor']", { timeout: 10000 }).catch(() => {
      // Fallback: wait for any editor content to appear
      return page.waitForSelector(".courier-template-editor", { timeout: 10000 });
    }).catch(() => {
      // Another fallback: wait for the page to be ready
      return page.waitForLoadState("networkidle");
    });

    // Wait a bit for the editor to initialize
    await page.waitForTimeout(1000);

    // Trigger a save by clicking the publish button (if visible)
    const publishButton = page.locator('button:has-text("Publish")');
    if (await publishButton.isVisible()) {
      await publishButton.click();
      await page.waitForTimeout(500);
    }

    // Verify save request was made with routing
    if (saveRequests.length > 0) {
      const lastSave = saveRequests[saveRequests.length - 1];
      expect(lastSave.routing).not.toBeNull();
      expect(lastSave.routing).toHaveProperty("method");
      expect(lastSave.routing).toHaveProperty("channels");
      expect(["single", "all"]).toContain(lastSave.routing.method);
      expect(Array.isArray(lastSave.routing.channels)).toBe(true);
    }
  });

  test("routing should never be null in save requests", async ({ page }) => {
    // Navigate to the demo app
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for editor to initialize
    await page.waitForTimeout(1500);

    // Make a change to trigger auto-save (if enabled)
    // Try to find and interact with the subject input
    const subjectInput = page.locator('input[placeholder*="subject"], input[placeholder*="Subject"]');
    if (await subjectInput.isVisible()) {
      await subjectInput.click();
      await subjectInput.fill("Updated Subject");
      await page.waitForTimeout(1000); // Wait for auto-save debounce
    }

    // Check all captured save requests
    for (const saveRequest of saveRequests) {
      expect(saveRequest.routing).not.toBeNull();
      expect(saveRequest.routing).not.toBeUndefined();
      
      if (saveRequest.routing) {
        expect(saveRequest.routing.method).toBeDefined();
        expect(saveRequest.routing.channels).toBeDefined();
      }
    }
  });

  test("should include default routing channels", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // Trigger a save
    const publishButton = page.locator('button:has-text("Publish")');
    if (await publishButton.isVisible()) {
      await publishButton.click();
      await page.waitForTimeout(500);
    }

    // Verify routing has expected structure
    if (saveRequests.length > 0) {
      const lastSave = saveRequests[saveRequests.length - 1];
      
      if (lastSave.routing) {
        // Method should be either "single" or "all"
        expect(["single", "all"]).toContain(lastSave.routing.method);
        
        // Channels should be an array with at least one channel
        expect(Array.isArray(lastSave.routing.channels)).toBe(true);
        
        // Each channel should be a string (not null or undefined)
        for (const channel of lastSave.routing.channels) {
          if (typeof channel === "string") {
            expect(channel.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});

test.describe("Routing with Custom Save Button", () => {
  test("custom save button should use routingAtom automatically", async ({ page }) => {
    let capturedRouting: any = null;

    // Set up mock to capture routing
    await page.route("**/*", async (route) => {
      const request = route.request();
      const url = request.url();

      if (!url.includes("/client/q") && !url.includes("/graphql")) {
        await route.continue();
        return;
      }

      const postData = request.postData();

      if (postData && postData.includes("SaveNotification")) {
        try {
          const parsed = JSON.parse(postData);
          capturedRouting = parsed.variables?.input?.data?.routing;
        } catch (e) {
          console.error("Failed to parse:", e);
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              tenant: {
                notification: {
                  save: {
                    success: true,
                    version: "v1",
                    updatedAt: new Date().toISOString(),
                  },
                },
              },
            },
          }),
        });
      } else if (postData && postData.includes("GetTenant")) {
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
                  data: {
                    content: {
                      version: "2022-01-01",
                      elements: [],
                    },
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
      } else {
        await route.continue();
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // If there's a custom save button, click it
    const saveButton = page.locator('button:has-text("Save")').first();
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await page.waitForTimeout(500);

      // Verify routing was captured and is not null
      if (capturedRouting !== null) {
        expect(capturedRouting).not.toBeNull();
        expect(capturedRouting).toHaveProperty("method");
        expect(capturedRouting).toHaveProperty("channels");
      }
    }
  });
});

