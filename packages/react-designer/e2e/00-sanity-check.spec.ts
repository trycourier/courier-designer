import { test, expect } from "@playwright/test";
import { setupMockedTest, mockTemplateDataSamples } from "./template-test-utils";

/**
 * Sanity check test that runs FIRST (00- prefix ensures alphabetical ordering)
 *
 * This test verifies that the basic test infrastructure is working:
 * - Mocked API responses are being intercepted
 * - The dev server is running
 * - At least one editor can be rendered
 *
 * If this test fails, it will fail fast and prevent running 300+ other tests.
 */

test.describe("00 - Sanity Check (runs first)", () => {
  test("should render at least one editor with mocked API", async ({ page }) => {
    console.log("🔍 Running sanity check - verifying test infrastructure...");

    // Track API calls
    const apiCalls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("graphql")) {
        apiCalls.push(`GraphQL: ${request.method()} ${request.url()}`);
      }
    });

    page.on("response", (response) => {
      if (response.url().includes("graphql")) {
        apiCalls.push(`Response: ${response.status()} ${response.url()}`);
      }
    });

    // Track console logs from the start
    const logs: string[] = [];
    page.on("console", (msg) => {
      logs.push(`Console ${msg.type()}: ${msg.text()}`);
    });

    // Track page errors
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(`Page error: ${error.message}`);
    });

    // Setup mocked API
    await setupMockedTest(page, mockTemplateDataSamples.allChannelsTemplate);

    // Wait for editor to appear
    const editor = page.locator(".tiptap.ProseMirror").first();

    try {
      await expect(editor).toBeVisible({ timeout: 10000 });
    } catch (error) {
      console.error("❌ SANITY CHECK FAILED: No editor found!");
      console.error("This means the test infrastructure is not working correctly.");
      console.error("\nAPI Calls made:");
      apiCalls.forEach((call) => console.error(`  ${call}`));

      // Check page content
      const bodyHTML = await page.evaluate(() => document.body.innerHTML);
      console.error("\nPage HTML (first 500 chars):");
      console.error(bodyHTML.substring(0, 500));

      // Check console logs
      console.error("\nConsole logs:");
      logs.forEach((log) => console.error(`  ${log}`));

      // Check page errors
      if (pageErrors.length > 0) {
        console.error("\nPage errors:");
        pageErrors.forEach((err) => console.error(`  ${err}`));
      }

      console.error("\nPossible causes:");
      console.error("  1. Dev server is not running properly");
      console.error("  2. API mocking is not intercepting requests");
      console.error("  3. .env file is missing or invalid");
      console.error("  4. Template data structure is incorrect");
      throw new Error(
        "SANITY CHECK FAILED: No editor rendered. " +
        "Cannot proceed with test suite. " +
        "Check that .env.test file exists in apps/editor-dev/ " +
        "and that setupMockedTest is working correctly."
      );
    }

    // Check that editor is functional
    await expect(editor).toHaveAttribute("contenteditable", "true");

    console.log("✅ Sanity check passed - editor rendered successfully");
    console.log("✅ Test infrastructure is working correctly");
  });

  test("should verify .env.test exists and is valid", async ({ page }) => {
    console.log("🔍 Verifying .env.test configuration...");

    // Just check that we can navigate to the page without errors
    await setupMockedTest(page, mockTemplateDataSamples.emptyTemplate);

    // If we got here without throwing an error, the setup worked
    const editor = page.locator(".tiptap.ProseMirror").first();

    // Check editor exists (even if content is empty)
    const editorCount = await editor.count();

    if (editorCount === 0) {
      throw new Error(
        "CONFIGURATION FAILED: No editor found after setupMockedTest. " +
        "Check that .env.test exists in apps/editor-dev/ with valid structure."
      );
    }

    console.log("✅ Configuration is valid - .env.test is working correctly");
  });
});
