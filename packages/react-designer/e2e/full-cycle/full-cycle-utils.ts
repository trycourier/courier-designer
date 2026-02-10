/**
 * Shared utilities for full-cycle E2E tests.
 *
 * These tests connect to the REAL Courier API (prod) to verify the complete
 * pipeline: Designer → Elemental → Send → Render → Verify.
 *
 * ## Running full-cycle tests
 *
 *   pnpm --filter @trycourier/react-designer test:e2e:fullcycle
 *
 * ## Setup
 *
 * Copy `.env.fullcycle.example` to `.env.fullcycle` and fill in credentials:
 *
 *   COURIER_AUTH_TOKEN   - Courier workspace API key (Bearer token for REST API)
 *   VITE_JWT_TOKEN       - JWT for the Designer's GraphQL client API
 *   VITE_API_URL         - GraphQL endpoint (default: https://api.courier.com/client/q)
 *   VITE_TENANT_ID       - Tenant ID
 *   VITE_TEMPLATE_ID     - Template ID to use for the test
 *
 * ## CI
 *
 * These tests run on every PR via the `full-cycle-e2e-test` job in
 * `.github/workflows/check-pull-request.yml`. Credentials are read from
 * GitHub repository secrets: `COURIER_AUTH_TOKEN`, `VITE_JWT_TOKEN`,
 * `VITE_API_URL`, `VITE_TENANT_ID`, and `VITE_TEMPLATE_ID`.
 */

import { expect, type Page, type APIRequestContext, type Locator } from "@playwright/test";
import { MAIN_EDITOR_SELECTOR } from "../test-utils";

// ═══════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════

export const COURIER_API_BASE = "https://api.courier.com";
export const COURIER_AUTH_TOKEN = process.env.COURIER_AUTH_TOKEN;
export const TEST_EMAIL = "e2e-test@example.com";

/** Ctrl on Linux/Windows, Meta on macOS — use for keyboard shortcuts like select-all, bold, etc. */
export const MOD = process.platform === "darwin" ? "Meta" : "Control";

/** Message statuses that indicate rendering is complete (content is available) */
const RENDERED_STATUSES = ["SENT", "DELIVERED", "OPENED", "CLICKED", "UNDELIVERABLE"];

// ═══════════════════════════════════════════════════════════════════════
// Editor Helpers
// ═══════════════════════════════════════════════════════════════════════

/**
 * Navigate to the full-cycle test app and wait for the editor to be ready.
 * Returns a locator for the main editor element.
 */
export async function loadDesignerEditor(page: Page): Promise<Locator> {
  await page.goto("/full-cycle-test", { waitUntil: "domcontentloaded" });

  const editor = page.locator(MAIN_EDITOR_SELECTOR);
  await expect(editor).toBeVisible({ timeout: 30_000 });
  await expect(editor).toHaveAttribute("contenteditable", "true");

  await page.waitForFunction(
    () => {
      const t = (window as any).__COURIER_CREATE_TEST__;
      return t && t.currentEditor !== null;
    },
    { timeout: 15_000, polling: 200 }
  );

  return editor;
}

/**
 * Clear the editor content programmatically to ensure a clean slate.
 */
export async function resetEditor(page: Page): Promise<void> {
  await page.evaluate(() => {
    const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
    if (ed) {
      ed.commands.clearContent();
      ed.commands.focus();
    }
  });
  await page.waitForTimeout(300);
}

/**
 * Capture Elemental content from the Designer and extract the email channel elements.
 */
export async function captureElementalContent(page: Page): Promise<{
  elementalContent: any;
  emailElements: any[];
}> {
  const elementalContent = await page.evaluate(() => {
    const t = (window as any).__COURIER_CREATE_TEST__;
    return t?.getTemplateEditorContent?.() || t?.templateEditorContent;
  });

  expect(elementalContent).toBeTruthy();
  expect(elementalContent.elements).toBeTruthy();

  // The Designer wraps content in channel nodes: { type: "channel", channel: "email", elements: [...] }
  const emailChannel = elementalContent.elements.find(
    (el: any) => el.type === "channel" && el.channel === "email"
  );
  const emailElements = emailChannel?.elements || elementalContent.elements;

  return { elementalContent, emailElements };
}

// ═══════════════════════════════════════════════════════════════════════
// Save & Publish
// ═══════════════════════════════════════════════════════════════════════

/**
 * Trigger auto-save by focusing the editor and wait for the SaveNotification
 * GraphQL response to confirm the save succeeded.
 */
export async function saveTemplate(page: Page): Promise<void> {
  const savePromise = page.waitForResponse(
    (r) =>
      r.url().includes("/client/q") &&
      r.request().postData()?.includes("SaveNotification") === true,
    { timeout: 30_000 }
  );

  await page.evaluate(() => {
    const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
    ed?.commands.focus();
  });

  // Wait for auto-save debounce to fire + response
  const resp = await savePromise;
  const data = await resp.json();
  if (data.errors) {
    console.log("  Save errors:", JSON.stringify(data.errors));
  }
  expect(data.errors).toBeFalsy();
}

/**
 * Publish the template via the test helper or the Publish button.
 */
export async function publishTemplate(page: Page): Promise<boolean> {
  const publishResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/client/q") &&
      response.request().postData()?.includes("PublishNotification") === true,
    { timeout: 30_000 }
  );

  await page.evaluate(async () => {
    const testObj = (window as any).__COURIER_CREATE_TEST__;
    if (testObj?.publishTemplate) {
      await testObj.publishTemplate();
    }
  });

  // Fallback: click the Publish button if visible
  const publishButton = page.locator('button:has-text("Publish")');
  if (await publishButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await publishButton.click();
  }

  try {
    const publishResponse = await publishResponsePromise;
    const publishData = await publishResponse.json();
    console.log("  Publish response:", JSON.stringify(publishData).substring(0, 200));
    return !publishData.errors;
  } catch (e) {
    console.log("  ⚠ Publish response not captured:", (e as Error).message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Courier API Helpers
// ═══════════════════════════════════════════════════════════════════════

/**
 * Send a notification with inline Elemental content via the Courier REST API.
 * Returns the requestId (which is also the messageId for single-recipient sends).
 */
export async function sendNotification(
  request: APIRequestContext,
  emailElements: any[],
  /** Variable data to pass for template rendering */
  templateData?: Record<string, unknown>
): Promise<string> {
  const sendResponse = await request.post(`${COURIER_API_BASE}/send`, {
    headers: {
      Authorization: `Bearer ${COURIER_AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
    data: {
      message: {
        to: { email: TEST_EMAIL },
        content: {
          version: "2022-01-01",
          elements: emailElements,
        },
        routing: {
          method: "single",
          channels: ["email"],
        },
        ...(templateData ? { data: templateData } : {}),
      },
    },
  });

  const sendData = await sendResponse.json();
  if (!sendResponse.ok()) {
    console.log(`  ✗ Send failed with status ${sendResponse.status()}`);
    console.log(`  Response body: ${JSON.stringify(sendData, null, 2)}`);
  }
  expect(sendResponse.ok()).toBe(true);

  const requestId = sendData.requestId;
  expect(requestId).toBeTruthy();
  return requestId;
}

/**
 * Poll the Courier Messages API until the rendered HTML is available.
 *
 * @param options.required - If true (default), throws when HTML is not retrieved
 *   after all attempts. Set to false to silently return null.
 */
export async function pollForRenderedHtml(
  request: APIRequestContext,
  messageId: string,
  options?: { maxAttempts?: number; required?: boolean }
): Promise<{
  renderedHtml: string | null;
  renderedText: string | null;
  messageStatus: string | null;
}> {
  const maxAttempts = options?.maxAttempts ?? 15;
  const required = options?.required ?? true;
  let renderedHtml: string | null = null;
  let renderedText: string | null = null;
  let messageStatus: string | null = null;
  let waitMs = 2000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`  Polling attempt ${attempt}/${maxAttempts} (waiting ${waitMs}ms)...`);
    await new Promise((r) => setTimeout(r, waitMs));

    const statusResponse = await request.get(
      `${COURIER_API_BASE}/messages/${messageId}`,
      { headers: { Authorization: `Bearer ${COURIER_AUTH_TOKEN}` } }
    );

    if (statusResponse.ok()) {
      const statusData = await statusResponse.json();
      messageStatus = statusData.status;
      console.log(`  Message status: ${messageStatus}`);

      if (RENDERED_STATUSES.includes(messageStatus!)) {
        const contentResponse = await request.get(
          `${COURIER_API_BASE}/messages/${messageId}/output`,
          { headers: { Authorization: `Bearer ${COURIER_AUTH_TOKEN}` } }
        );

        if (contentResponse.ok()) {
          const contentData = await contentResponse.json();

          if (contentData.results && contentData.results.length > 0) {
            const emailResult = contentData.results.find(
              (r: any) => r.channel === "email" || r.content?.html
            );
            if (emailResult) {
              renderedHtml = emailResult.content?.html || null;
              renderedText = emailResult.content?.text || emailResult.content?.body || null;
              console.log(
                `  ✓ Got rendered content (html: ${renderedHtml?.length || 0} chars)`
              );
              break;
            }
          }
        } else {
          console.log(`  Content API returned ${contentResponse.status()}`);
        }
      }
    } else {
      console.log(`  Status API returned ${statusResponse.status()}`);
    }

    waitMs = Math.min(waitMs * 1.5, 10_000);
  }

  if (required && !renderedHtml) {
    throw new Error(
      `Failed to retrieve rendered HTML after ${maxAttempts} attempts. Last status: ${messageStatus}`
    );
  }

  return { renderedHtml, renderedText, messageStatus };
}

/**
 * Convenience: capture content → send → poll → return rendered HTML.
 * Combines captureElementalContent + sendNotification + pollForRenderedHtml.
 */
export async function sendAndGetRenderedHtml(
  page: Page,
  request: APIRequestContext
): Promise<{
  elementalContent: any;
  emailElements: any[];
  requestId: string;
  renderedHtml: string | null;
  renderedText: string | null;
  messageStatus: string | null;
}> {
  const { elementalContent, emailElements } = await captureElementalContent(page);
  const requestId = await sendNotification(request, emailElements);
  const { renderedHtml, renderedText, messageStatus } = await pollForRenderedHtml(
    request,
    requestId
  );

  return {
    elementalContent,
    emailElements,
    requestId,
    renderedHtml,
    renderedText,
    messageStatus,
  };
}
