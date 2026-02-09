import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import {
  COURIER_AUTH_TOKEN,
  loadDesignerEditor,
  resetEditor,
  captureElementalContent,
  sendNotification,
  pollForRenderedHtml,
} from "./full-cycle-utils";
import {
  MAX_DIFF_PERCENT,
  screenshotElement,
  enterPreviewMode,
  exitPreviewMode,
  compareElementPairs,
  printResultsSummary,
  attachFailedResults,
  saveResultsJson,
} from "./visual-test-utils";
import { insertCustomCode } from "./ui-helpers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════
// CustomCode Variant Definitions
// ═══════════════════════════════════════════════════════════════════════

interface CustomCodeVariant {
  name: string;
  /** Unique text inside the HTML for locating elements in the email */
  uniqueText: string;
  /** HTML code to render */
  code: string;
}

const VARIANTS: CustomCodeVariant[] = [
  {
    name: "simple-paragraph",
    uniqueText: "Simple custom paragraph",
    code: '<p style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#111827;">Simple custom paragraph</p>',
  },
  {
    name: "colored-text",
    uniqueText: "Red custom text",
    code: '<p style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#DC2626;">Red custom text</p>',
  },
  {
    name: "bold-italic",
    uniqueText: "Bold italic custom",
    code: '<p style="font-family:Helvetica,Arial,sans-serif;font-size:14px;"><b><i>Bold italic custom</i></b></p>',
  },
  {
    name: "styled-div",
    uniqueText: "Styled div content",
    code: '<div style="background-color:#EFF6FF;border:1px solid #3B82F6;border-radius:4px;padding:12px;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#1E40AF;">Styled div content</div>',
  },
  {
    name: "heading",
    uniqueText: "Custom heading text",
    code: '<h2 style="font-family:Helvetica,Arial,sans-serif;font-size:24px;font-weight:bold;color:#111827;margin:0;">Custom heading text</h2>',
  },
  {
    name: "two-line",
    uniqueText: "First line of custom",
    code: '<p style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#111827;">First line of custom</p><p style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#6B7280;">Second line of custom</p>',
  },
  {
    name: "centered",
    uniqueText: "Centered custom text",
    code: '<p style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#111827;text-align:center;">Centered custom text</p>',
  },
  {
    name: "large-text",
    uniqueText: "Large custom text",
    code: '<p style="font-family:Helvetica,Arial,sans-serif;font-size:24px;font-weight:bold;color:#7C3AED;">Large custom text</p>',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// Test
// ═══════════════════════════════════════════════════════════════════════

const ARTIFACTS_DIR = path.resolve(
  __dirname,
  "../../test-results/customcode-visual"
);

test.describe("CustomCode Visual Parity: Designer vs Rendered Email", () => {
  test.skip(
    !COURIER_AUTH_TOKEN,
    "COURIER_AUTH_TOKEN not set – skipping customcode visual test"
  );

  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    fs.rmSync(ARTIFACTS_DIR, { recursive: true, force: true });
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

    await loadDesignerEditor(page);
    await resetEditor(page);
  });

  test("all customcode variants visual parity", async ({
    page,
    request,
    browser,
  }, testInfo) => {
    // ─── Step 1: Insert all custom code variants ─────────────────────
    // CustomCode is an atom node whose only attribute is `code` (raw HTML).
    // Programmatic insertion is the only approach — there's no typing.
    console.log(`Step 1: Inserting ${VARIANTS.length} custom code variants...`);

    for (const v of VARIANTS) {
      console.log(`  Inserting: ${v.name}`);
      await insertCustomCode(page, v.code);
    }

    await page.waitForTimeout(500);
    console.log(`  ✓ ${VARIANTS.length} custom code blocks inserted`);

    // ─── Step 2: Preview mode + screenshot each element ──────────────
    console.log("Step 2: Designer element screenshots (preview mode)...");

    const previewEditor = await enterPreviewMode(page);
    await expect(previewEditor).toBeVisible({ timeout: 5000 });

    const designerShots: Map<string, Buffer | null> = new Map();
    for (const v of VARIANTS) {
      // CustomCode renders inside a .courier-custom-code div.
      // Use the unique text to find the right one.
      const locator = previewEditor
        .locator(`.node-element:has-text("${v.uniqueText}")`)
        .first();
      const shot = await screenshotElement(
        locator,
        `designer-${v.name}`,
        ARTIFACTS_DIR
      );
      designerShots.set(v.name, shot);
    }
    console.log(`  ✓ ${designerShots.size} Designer screenshots taken`);

    await exitPreviewMode(page);

    // ─── Step 3: Capture Elemental content & send ────────────────────
    console.log("Step 3: Capturing Elemental content and sending...");

    const { emailElements } = await captureElementalContent(page);
    console.log(`  Elemental: ${emailElements.length} elements captured`);

    const requestId = await sendNotification(request, emailElements);
    console.log(`  ✓ Sent, requestId: ${requestId}`);

    // ─── Step 4: Poll for rendered HTML ──────────────────────────────
    console.log("Step 4: Polling for rendered email...");

    const { renderedHtml } = await pollForRenderedHtml(request, requestId);
    expect(renderedHtml).toBeTruthy();
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "rendered-email.html"),
      renderedHtml!
    );

    // ─── Step 5: Render email & screenshot each element ──────────────
    console.log("Step 5: Rendering email and taking element screenshots...");

    const emailPage = await browser.newPage({
      viewport: { width: 700, height: 4000 },
    });
    await emailPage.setContent(renderedHtml!, { waitUntil: "networkidle" });
    await emailPage.waitForTimeout(500);

    // Normalize email — but preserve custom HTML element styling
    await emailPage.evaluate(() => {
      // Only normalize the outer email template backgrounds, not the
      // custom HTML content itself (which has its own inline styles).
      document.querySelectorAll(".header, .footer, .blue-footer").forEach(
        (el) => {
          (el as HTMLElement).style.display = "none";
        }
      );
      // Set body/wrapper backgrounds to white
      document.querySelectorAll(".c--email-body").forEach((el) => {
        (el as HTMLElement).style.backgroundColor = "white";
        (el as HTMLElement).style.background = "white";
      });
      document.body.style.backgroundColor = "white";
      document.body.style.background = "white";
      // Set outer table backgrounds to white, but don't touch custom HTML blocks
      document.querySelectorAll("table, td, tr, tbody, div").forEach((el) => {
        const htmlEl = el as HTMLElement;
        // Skip elements inside custom HTML blocks
        if (htmlEl.closest(".c--block-html")) return;
        if (htmlEl.classList.contains("c--block-html")) return;
        htmlEl.style.backgroundColor = "white";
        htmlEl.style.background = "white";
      });
    });
    await emailPage.waitForTimeout(300);

    const fullEmailShot = await emailPage.screenshot({ fullPage: true });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "rendered-email-full.png"),
      fullEmailShot
    );

    // Debug: detect custom HTML blocks
    const debug = await emailPage.evaluate(() => ({
      htmlBlocks: document.querySelectorAll(".c--block-html").length,
      allBlocks: Array.from(document.querySelectorAll('[class*="c--block"]'))
        .map((el) => el.className)
        .slice(0, 10),
    }));
    console.log("  Email debug:", JSON.stringify(debug, null, 2));

    const emailShots: Map<string, Buffer | null> = new Map();
    for (const v of VARIANTS) {
      // Find the custom HTML block containing this variant's unique text.
      // The backend wraps custom HTML in div.c--block-html blocks.
      let locator = emailPage
        .locator(`.c--block-html:has-text("${v.uniqueText}")`)
        .first();

      // Fallback: try broader selectors
      const visible = await locator.isVisible().catch(() => false);
      if (!visible) {
        locator = emailPage
          .locator(`td:has-text("${v.uniqueText}")`)
          .first();
      }

      const shot = await screenshotElement(
        locator,
        `email-${v.name}`,
        ARTIFACTS_DIR
      );
      emailShots.set(v.name, shot);
    }
    console.log(`  ✓ ${emailShots.size} email screenshots taken`);
    await emailPage.close();

    // ─── Step 6: Compare each element pair (pixel) ───────────────────
    console.log(
      `\nStep 6: Comparing ${VARIANTS.length} element pairs (pixel)...\n`
    );

    const pairs = VARIANTS.map((v) => ({
      name: v.name,
      designerShot: designerShots.get(v.name) ?? null,
      emailShot: emailShots.get(v.name) ?? null,
    }));

    const results = await compareElementPairs(
      pairs,
      ARTIFACTS_DIR,
      "CustomCode"
    );

    printResultsSummary(results, MAX_DIFF_PERCENT, ARTIFACTS_DIR);
    await attachFailedResults(results, testInfo);
    saveResultsJson(results, "customcode");

    // Assert pixel parity
    for (const r of results) {
      expect(
        r.diffPercent,
        `${r.name}: visual difference ${r.diffPercent.toFixed(1)}% exceeds ${MAX_DIFF_PERCENT}%. ` +
          `See diff-${r.name}.png for details.`
      ).toBeLessThanOrEqual(MAX_DIFF_PERCENT);
    }

    console.log("\n✅ CustomCode visual parity test complete!");
  });
});
