import { test, expect } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import {
  COURIER_AUTH_TOKEN,
  COURIER_API_BASE,
  TEST_EMAIL,
  loadDesignerEditor,
  resetEditor,
  captureElementalContent,
  pollForRenderedHtml,
} from "./full-cycle-utils";
import { typeText } from "./ui-helpers";

/**
 * Full-Cycle E2E: Email Background Colors
 *
 * Verifies that `background_color` (body) and `content_background_color`
 * (content area) on the Elemental email channel node flow through the
 * Courier backend rendering pipeline and appear in the final email HTML.
 *
 * Pipeline:
 *   Designer sets channel node properties
 *   → Elemental { type: "channel", channel: "email", background_color, content_background_color }
 *   → Backend extractChannelColors() maps to templateOverrides
 *   → Handlebars/MJML renders into final HTML with color styles
 *
 * BACKEND DEPENDENCY: These tests require the backend feature
 * `feat(email): add background_color and content_background_color support`
 * to be deployed. If the backend hasn't been deployed, tests will fail
 * because the API ignores the color properties on the channel node.
 */

const BODY_BG_COLOR = "#D32F2F";
const CONTENT_BG_COLOR = "#1565C0";
const MARKER_TEXT = "Background color e2e verification content";

async function sendWithChannelColors(
  request: APIRequestContext,
  emailElements: any[],
  colors: { background_color?: string; content_background_color?: string }
): Promise<string> {
  const channelNode: Record<string, unknown> = {
    type: "channel",
    channel: "email",
    elements: emailElements,
    ...colors,
  };

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
          elements: [channelNode],
        },
        routing: {
          method: "single",
          channels: ["email"],
        },
      },
    },
  });

  const sendData = await sendResponse.json();
  expect(sendResponse.ok(), `Send failed: ${JSON.stringify(sendData)}`).toBe(true);

  const requestId = sendData.requestId;
  expect(requestId).toBeTruthy();
  return requestId;
}

function htmlContainsColor(html: string, hexColor: string): boolean {
  const lower = html.toLowerCase();
  const colorLower = hexColor.toLowerCase();
  return lower.includes(colorLower) || lower.includes(colorLower.replace("#", ""));
}

test.describe("Full Cycle: Email Background Colors", () => {
  test.skip(
    !COURIER_AUTH_TOKEN,
    "COURIER_AUTH_TOKEN not set – skipping full-cycle test"
  );
  test.setTimeout(120_000);

  let capturedEmailElements: any[];

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await loadDesignerEditor(page);
    await resetEditor(page);

    const editor = page.locator(
      '[data-testid="email-editor"] .tiptap.ProseMirror[contenteditable="true"]'
    );
    await editor.click();
    await page.waitForTimeout(300);
    await typeText(page, MARKER_TEXT);
    await page.waitForTimeout(500);

    const { emailElements } = await captureElementalContent(page);
    capturedEmailElements = emailElements;

    await page.close();
  });

  test("body background color only", async ({ request }) => {
    const requestId = await test.step("Send with background_color only", () =>
      sendWithChannelColors(request, capturedEmailElements, {
        background_color: BODY_BG_COLOR,
      })
    );

    const { renderedHtml } = await test.step("Poll for rendered email", () =>
      pollForRenderedHtml(request, requestId)
    );

    await test.step("Verify body background color is present", () => {
      expect(renderedHtml).toBeTruthy();
      expect(
        htmlContainsColor(renderedHtml!, BODY_BG_COLOR),
        `Expected body background color ${BODY_BG_COLOR} in rendered HTML`
      ).toBe(true);
    });

    await test.step("Verify content background color is absent", () => {
      expect(
        htmlContainsColor(renderedHtml!, CONTENT_BG_COLOR),
        `Content background ${CONTENT_BG_COLOR} should NOT appear when only body color is set`
      ).toBe(false);
    });
  });

  test("content background color only", async ({ request }) => {
    const requestId = await test.step("Send with content_background_color only", () =>
      sendWithChannelColors(request, capturedEmailElements, {
        content_background_color: CONTENT_BG_COLOR,
      })
    );

    const { renderedHtml } = await test.step("Poll for rendered email", () =>
      pollForRenderedHtml(request, requestId)
    );

    await test.step("Verify content background color is present", () => {
      expect(renderedHtml).toBeTruthy();
      expect(
        htmlContainsColor(renderedHtml!, CONTENT_BG_COLOR),
        `Expected content background color ${CONTENT_BG_COLOR} in rendered HTML`
      ).toBe(true);
    });

    await test.step("Verify body background color is absent", () => {
      expect(
        htmlContainsColor(renderedHtml!, BODY_BG_COLOR),
        `Body background ${BODY_BG_COLOR} should NOT appear when only content color is set`
      ).toBe(false);
    });
  });

  test("both background colors together", async ({ request }) => {
    const requestId = await test.step("Send with both background colors", () =>
      sendWithChannelColors(request, capturedEmailElements, {
        background_color: BODY_BG_COLOR,
        content_background_color: CONTENT_BG_COLOR,
      })
    );

    const { renderedHtml } = await test.step("Poll for rendered email", () =>
      pollForRenderedHtml(request, requestId)
    );

    await test.step("Verify both colors are present", () => {
      expect(renderedHtml).toBeTruthy();
      expect(
        htmlContainsColor(renderedHtml!, BODY_BG_COLOR),
        `Expected body background ${BODY_BG_COLOR} in rendered HTML`
      ).toBe(true);
      expect(
        htmlContainsColor(renderedHtml!, CONTENT_BG_COLOR),
        `Expected content background ${CONTENT_BG_COLOR} in rendered HTML`
      ).toBe(true);
    });
  });

  test("no custom colors uses brand defaults", async ({ request }) => {
    const requestId = await test.step("Send without custom background colors", () =>
      sendWithChannelColors(request, capturedEmailElements, {})
    );

    const { renderedHtml } = await test.step("Poll for rendered email", () =>
      pollForRenderedHtml(request, requestId)
    );

    await test.step("Verify custom colors are absent", () => {
      expect(renderedHtml).toBeTruthy();
      expect(
        htmlContainsColor(renderedHtml!, BODY_BG_COLOR),
        `Custom body color ${BODY_BG_COLOR} should NOT appear when no colors are set`
      ).toBe(false);
      expect(
        htmlContainsColor(renderedHtml!, CONTENT_BG_COLOR),
        `Custom content color ${CONTENT_BG_COLOR} should NOT appear when no colors are set`
      ).toBe(false);
    });
  });
});
