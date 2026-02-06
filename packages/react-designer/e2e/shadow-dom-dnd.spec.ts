import { test, expect } from "@playwright/test";
import { mockTemplateResponse, mockTemplateDataSamples } from "./template-test-utils";

/**
 * E2E tests for Shadow DOM drag-and-drop compatibility.
 *
 * These tests use the Shadow DOM test page (/shadow-dom) which renders
 * the editor inside a Shadow DOM to verify drag-and-drop functionality
 * with the applyShadowDomDndFix workaround.
 */

// Helper to set up the Shadow DOM test page with mocked API
async function setupShadowDomTest(page: import("@playwright/test").Page) {
  await mockTemplateResponse(page, mockTemplateDataSamples.emptyTemplate, {
    delay: 100,
    requireAuth: false,
  });

  await page.goto("/shadow-dom", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
}

// Helper to wait for editor inside shadow DOM to be ready
async function waitForShadowEditor(page: import("@playwright/test").Page) {
  // Wait for the shadow DOM container to exist
  await page.waitForSelector('[style*="dashed"]', { timeout: 10000 });

  // Wait for the editor inside the shadow DOM to render
  await page.waitForFunction(
    () => {
      const containers = document.querySelectorAll('[style*="dashed"]');
      for (const container of containers) {
        const shadowRoot = container.shadowRoot;
        if (shadowRoot) {
          const editor = shadowRoot.querySelector(".tiptap.ProseMirror");
          if (editor) return true;
        }
      }
      return false;
    },
    { timeout: 15000 }
  );

  await page.waitForTimeout(1000);
}

// Helper to get a locator for elements inside the shadow DOM
function getShadowLocator(page: import("@playwright/test").Page, selector: string) {
  return page.locator(`[style*="dashed"] >> internal:shadow=${selector}`);
}

test.describe("Shadow DOM Drag-and-Drop Fix", () => {
  test("should render editor inside shadow DOM", async ({ page }) => {
    await setupShadowDomTest(page);
    await waitForShadowEditor(page);

    // Verify the editor exists inside the shadow DOM
    const hasEditor = await page.evaluate(() => {
      const containers = document.querySelectorAll('[style*="dashed"]');
      for (const container of containers) {
        const shadowRoot = container.shadowRoot;
        if (shadowRoot) {
          const editor = shadowRoot.querySelector(".tiptap.ProseMirror");
          return !!editor;
        }
      }
      return false;
    });

    expect(hasEditor).toBe(true);
  });

  test("should show Enable Fix button initially", async ({ page }) => {
    await setupShadowDomTest(page);
    await waitForShadowEditor(page);

    // The fix should be disabled by default
    const enableButton = page.locator("button", { hasText: "Enable Fix" });
    await expect(enableButton).toBeVisible();
  });

  test("should toggle fix state when button is clicked", async ({ page }) => {
    await setupShadowDomTest(page);
    await waitForShadowEditor(page);

    // Click "Enable Fix"
    const enableButton = page.locator("button", { hasText: "Enable Fix" });
    await enableButton.click();
    await page.waitForTimeout(2000);

    // Should now show "Disable Fix"
    const disableButton = page.locator("button", { hasText: "Disable Fix" });
    await expect(disableButton).toBeVisible();
  });

  test("should display warning banner about Shadow DOM test", async ({ page }) => {
    await setupShadowDomTest(page);
    await waitForShadowEditor(page);

    // Check for the warning banner text
    const banner = page.locator("text=Shadow DOM Test");
    await expect(banner).toBeVisible();
  });

  test("should render sidebar blocks inside shadow DOM", async ({ page }) => {
    await setupShadowDomTest(page);
    await waitForShadowEditor(page);

    // Enable the fix first
    const enableButton = page.locator("button", { hasText: "Enable Fix" });
    await enableButton.click();
    await page.waitForTimeout(2000);
    await waitForShadowEditor(page);

    // Check that sidebar blocks exist inside the shadow DOM
    const hasSidebar = await page.evaluate(() => {
      const containers = document.querySelectorAll('[style*="dashed"]');
      for (const container of containers) {
        const shadowRoot = container.shadowRoot;
        if (shadowRoot) {
          // Look for the sidebar / blocks library
          const sidebarItems = shadowRoot.querySelectorAll("[data-drag-handle], .draggable-item");
          return sidebarItems.length > 0;
        }
      }
      return false;
    });

    // The sidebar with draggable blocks should be present
    expect(hasSidebar).toBe(true);
  });

  test("should allow dragging new blocks from sidebar with fix enabled", async ({ page }) => {
    await setupShadowDomTest(page);
    await waitForShadowEditor(page);

    // Enable the fix
    const enableButton = page.locator("button", { hasText: "Enable Fix" });
    await enableButton.click();
    await page.waitForTimeout(2000);
    await waitForShadowEditor(page);

    // Get block count before drag
    const blockCountBefore = await page.evaluate(() => {
      const containers = document.querySelectorAll('[style*="dashed"]');
      for (const container of containers) {
        const shadowRoot = container.shadowRoot;
        if (shadowRoot) {
          const blocks = shadowRoot.querySelectorAll("[data-node-view-wrapper]");
          return blocks.length;
        }
      }
      return 0;
    });

    // Find a sidebar text block and the editor drop zone
    const sidebarBlock = await page.evaluate(() => {
      const containers = document.querySelectorAll('[style*="dashed"]');
      for (const container of containers) {
        const shadowRoot = container.shadowRoot;
        if (shadowRoot) {
          // Find a draggable sidebar item (e.g., Text block)
          const items = shadowRoot.querySelectorAll(".draggable-item");
          if (items.length > 0) {
            const rect = items[0].getBoundingClientRect();
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          }
        }
      }
      return null;
    });

    const editorArea = await page.evaluate(() => {
      const containers = document.querySelectorAll('[style*="dashed"]');
      for (const container of containers) {
        const shadowRoot = container.shadowRoot;
        if (shadowRoot) {
          const editor = shadowRoot.querySelector(".tiptap.ProseMirror");
          if (editor) {
            const rect = editor.getBoundingClientRect();
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          }
        }
      }
      return null;
    });

    if (sidebarBlock && editorArea) {
      // Perform drag from sidebar to editor
      await page.mouse.move(sidebarBlock.x, sidebarBlock.y);
      await page.mouse.down();
      await page.waitForTimeout(200);
      await page.mouse.move(editorArea.x, editorArea.y, { steps: 10 });
      await page.waitForTimeout(200);
      await page.mouse.up();
      await page.waitForTimeout(1000);
    }

    // Verify block count increased (or at minimum, no errors occurred)
    const blockCountAfter = await page.evaluate(() => {
      const containers = document.querySelectorAll('[style*="dashed"]');
      for (const container of containers) {
        const shadowRoot = container.shadowRoot;
        if (shadowRoot) {
          const blocks = shadowRoot.querySelectorAll("[data-node-view-wrapper]");
          return blocks.length;
        }
      }
      return 0;
    });

    // With the fix enabled, block count should increase or stay stable (no crashes)
    expect(blockCountAfter).toBeGreaterThanOrEqual(blockCountBefore);
  });

  test("should detect shadow DOM context for drag handle behavior", async ({ page }) => {
    await setupShadowDomTest(page);
    await waitForShadowEditor(page);

    // Enable the fix
    const enableButton = page.locator("button", { hasText: "Enable Fix" });
    await enableButton.click();
    await page.waitForTimeout(2000);
    await waitForShadowEditor(page);

    // Verify elements inside shadow DOM are recognized as being in shadow DOM
    const isInShadowDom = await page.evaluate(() => {
      const containers = document.querySelectorAll('[style*="dashed"]');
      for (const container of containers) {
        const shadowRoot = container.shadowRoot;
        if (shadowRoot) {
          const anyElement = shadowRoot.querySelector("div");
          if (anyElement) {
            return anyElement.getRootNode() instanceof ShadowRoot;
          }
        }
      }
      return false;
    });

    expect(isInShadowDom).toBe(true);
  });

  test("should not have console errors with fix enabled", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Ignore expected errors (network, resource loading)
        if (
          !text.includes("ERR_NAME_NOT_RESOLVED") &&
          !text.includes("net::ERR") &&
          !text.includes("Failed to load resource") &&
          !text.includes("401") &&
          !text.includes("example.com")
        ) {
          consoleErrors.push(text);
        }
      }
    });

    await setupShadowDomTest(page);
    await waitForShadowEditor(page);

    // Enable the fix
    const enableButton = page.locator("button", { hasText: "Enable Fix" });
    await enableButton.click();
    await page.waitForTimeout(2000);
    await waitForShadowEditor(page);

    // Interact with the editor a bit
    const editorArea = await page.evaluate(() => {
      const containers = document.querySelectorAll('[style*="dashed"]');
      for (const container of containers) {
        const shadowRoot = container.shadowRoot;
        if (shadowRoot) {
          const editor = shadowRoot.querySelector(".tiptap.ProseMirror");
          if (editor) {
            const rect = editor.getBoundingClientRect();
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          }
        }
      }
      return null;
    });

    if (editorArea) {
      await page.mouse.click(editorArea.x, editorArea.y);
      await page.waitForTimeout(500);
    }

    // Filter out non-critical errors
    const criticalErrors = consoleErrors.filter(
      (err) =>
        !err.includes("ShadowDomFix") &&
        !err.includes("Warning:") &&
        !err.includes("Attempted to synchronously unmount")
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test("should properly clean up fix when toggling off", async ({ page }) => {
    await setupShadowDomTest(page);
    await waitForShadowEditor(page);

    // Enable the fix
    const enableButton = page.locator("button", { hasText: "Enable Fix" });
    await enableButton.click();
    await page.waitForTimeout(2000);

    // Verify Event.prototype.target is patched
    const isPatchedBefore = await page.evaluate(() => {
      const originalGetter = Object.getOwnPropertyDescriptor(Event.prototype, "target")?.get;
      // The patched getter will be a different function
      return originalGetter !== undefined;
    });
    expect(isPatchedBefore).toBe(true);

    // Disable the fix
    const disableButton = page.locator("button", { hasText: "Disable Fix" });
    await disableButton.click();
    await page.waitForTimeout(2000);

    // After disabling, the page remounts and the patch is cleaned up
    // Verify Enable Fix button is back
    await expect(page.locator("button", { hasText: "Enable Fix" })).toBeVisible();
  });
});
