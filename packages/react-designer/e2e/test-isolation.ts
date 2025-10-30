import type { Page } from "@playwright/test";

/**
 * Generates a unique test identifier for each worker/test combination
 */
export function generateTestId(): string {
  const workerId = process.env.PLAYWRIGHT_WORKER_INDEX || "0";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `worker-${workerId}-${timestamp}-${random}`;
}

/**
 * Isolates editor state using unique identifiers for storage keys
 */
export async function initIsolatedEditor(page: Page, testId: string) {
  // Inject a unique test identifier into the app
  await page.addInitScript((id: string) => {
    // Set a unique identifier for this test instance
    window.testInstanceId = id;

    // Override localStorage to use prefixed keys
    const originalSetItem = localStorage.setItem;
    const originalGetItem = localStorage.getItem;
    const originalRemoveItem = localStorage.removeItem;

    localStorage.setItem = function (key: string, value: string) {
      return originalSetItem.call(this, `${id}-${key}`, value);
    };

    localStorage.getItem = function (key: string) {
      return originalGetItem.call(this, `${id}-${key}`);
    };

    localStorage.removeItem = function (key: string) {
      return originalRemoveItem.call(this, `${id}-${key}`);
    };

    // Same for sessionStorage
    const originalSessionSetItem = sessionStorage.setItem;
    const originalSessionGetItem = sessionStorage.getItem;
    const originalSessionRemoveItem = sessionStorage.removeItem;

    sessionStorage.setItem = function (key: string, value: string) {
      return originalSessionSetItem.call(this, `${id}-${key}`, value);
    };

    sessionStorage.getItem = function (key: string) {
      return originalSessionGetItem.call(this, `${id}-${key}`);
    };

    sessionStorage.removeItem = function (key: string) {
      return originalSessionRemoveItem.call(this, `${id}-${key}`);
    };
  }, testId);
}

/**
 * Enhanced test setup with worker isolation
 */
export async function setupIsolatedTest(page: Page) {
  const testId = generateTestId();

  // Initialize isolated storage
  await initIsolatedEditor(page, testId);

  // Navigate to the app
  await page.goto("/test-app", { waitUntil: "domcontentloaded" });

  // Wait for the app to be fully loaded
  await page.waitForSelector(".tiptap.ProseMirror", { timeout: 30000 });
  await page.waitForFunction(
    () => {
      const editor = document.querySelector(".tiptap.ProseMirror");
      return editor && editor.getAttribute("contenteditable") === "true";
    },
    { timeout: 30000 }
  );

  const editor = page.locator(".tiptap.ProseMirror").first();

  // Clear any existing content
  await page.evaluate(() => {
    // Clear storage with our unique prefix
    const testId = window.testInstanceId;
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(`${testId}-`)) {
        localStorage.removeItem(key);
      }
    });
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith(`${testId}-`)) {
        sessionStorage.removeItem(key);
      }
    });
  });

  // Clear subject input
  const subjectInput = page.locator('input[placeholder="Write subject..."]');
  if ((await subjectInput.count()) > 0) {
    await subjectInput.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await page.keyboard.press("Escape");
  }

  // Clear editor content thoroughly
  await editor.click();
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);
  }

  // Final wait for content to stabilize
  await page.waitForTimeout(500);

  return { testId, editor };
}

declare global {
  interface Window {
    testInstanceId: string;
  }
}
