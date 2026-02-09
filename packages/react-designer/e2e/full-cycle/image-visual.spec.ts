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
  normalizeEmailPage,
  compareElementPairs,
  printResultsSummary,
  attachFailedResults,
  saveResultsJson,
} from "./visual-test-utils";
import { insertImageBlock } from "./ui-helpers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// A stable public placeholder image for testing.
// Using placehold.co which is widely used and reliable.
const TEST_IMAGE_URL = "https://placehold.co/400x200/EBF4FF/1E40AF.png?text=Test+Image";
const TEST_IMAGE_URL_2 = "https://placehold.co/400x200/FEF3C7/92400E.png?text=Alt+Image";

// ═══════════════════════════════════════════════════════════════════════
// ImageBlock Variant Definitions
// ═══════════════════════════════════════════════════════════════════════

interface ImageVariant {
  name: string;
  /** Alt text — used as unique identifier in the email */
  uniqueAlt: string;
  attrs: Record<string, unknown>;
}

const VARIANTS: ImageVariant[] = [
  // ── Default / Alignment ───────────────────────────────────────────
  {
    name: "center-default",
    uniqueAlt: "center-default-img",
    attrs: { sourcePath: TEST_IMAGE_URL, alt: "center-default-img", alignment: "center", width: 80 },
  },
  {
    name: "left-aligned",
    uniqueAlt: "left-aligned-img",
    attrs: { sourcePath: TEST_IMAGE_URL, alt: "left-aligned-img", alignment: "left", width: 60 },
  },
  {
    name: "right-aligned",
    uniqueAlt: "right-aligned-img",
    attrs: { sourcePath: TEST_IMAGE_URL, alt: "right-aligned-img", alignment: "right", width: 60 },
  },

  // ── Width ─────────────────────────────────────────────────────────
  {
    name: "full-width",
    uniqueAlt: "full-width-img",
    attrs: { sourcePath: TEST_IMAGE_URL, alt: "full-width-img", alignment: "center", width: 100 },
  },
  {
    name: "half-width",
    uniqueAlt: "half-width-img",
    attrs: { sourcePath: TEST_IMAGE_URL, alt: "half-width-img", alignment: "center", width: 50 },
  },
  {
    name: "small-width",
    uniqueAlt: "small-width-img",
    attrs: { sourcePath: TEST_IMAGE_URL, alt: "small-width-img", alignment: "center", width: 25 },
  },

  // ── Border ────────────────────────────────────────────────────────
  {
    name: "thin-border",
    uniqueAlt: "thin-border-img",
    attrs: {
      sourcePath: TEST_IMAGE_URL,
      alt: "thin-border-img",
      alignment: "center",
      width: 70,
      borderWidth: 1,
      borderColor: "#000000",
    },
  },
  {
    name: "thick-colored-border",
    uniqueAlt: "thick-border-img",
    attrs: {
      sourcePath: TEST_IMAGE_URL,
      alt: "thick-border-img",
      alignment: "center",
      width: 70,
      borderWidth: 4,
      borderColor: "#DC2626",
    },
  },

  // ── Different image ───────────────────────────────────────────────
  {
    name: "alt-image",
    uniqueAlt: "alt-image-img",
    attrs: { sourcePath: TEST_IMAGE_URL_2, alt: "alt-image-img", alignment: "center", width: 70 },
  },

  // ── Combinations ──────────────────────────────────────────────────
  {
    name: "combo-left-bordered",
    uniqueAlt: "combo-left-bordered-img",
    attrs: {
      sourcePath: TEST_IMAGE_URL,
      alt: "combo-left-bordered-img",
      alignment: "left",
      width: 50,
      borderWidth: 2,
      borderColor: "#3B82F6",
    },
  },
  {
    name: "combo-right-small",
    uniqueAlt: "combo-right-small-img",
    attrs: {
      sourcePath: TEST_IMAGE_URL_2,
      alt: "combo-right-small-img",
      alignment: "right",
      width: 40,
      borderWidth: 3,
      borderColor: "#10B981",
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════
// Test
// ═══════════════════════════════════════════════════════════════════════

const ARTIFACTS_DIR = path.resolve(
  __dirname,
  "../../test-results/image-visual"
);

test.describe("Image Visual Parity: Designer vs Rendered Email", () => {
  test.skip(
    !COURIER_AUTH_TOKEN,
    "COURIER_AUTH_TOKEN not set – skipping image visual test"
  );

  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    fs.rmSync(ARTIFACTS_DIR, { recursive: true, force: true });
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

    await loadDesignerEditor(page);
    await resetEditor(page);
  });

  test("all image variants visual parity", async ({
    page,
    request,
    browser,
  }, testInfo) => {
    // ─── Step 1: Insert all image variants programmatically ──────────
    // ImageBlock is an atom node configured through form fields (not
    // typing), so programmatic insertion is appropriate.
    console.log(`Step 1: Inserting ${VARIANTS.length} image variants...`);

    for (const v of VARIANTS) {
      console.log(`  Inserting: ${v.name}`);
      await insertImageBlock(page, v.attrs);
    }

    await page.waitForTimeout(500);
    console.log(`  ✓ ${VARIANTS.length} image blocks inserted`);

    // Wait for all images to load in the Designer
    console.log("  Waiting for images to load...");
    await page.waitForFunction(
      (count) => {
        const imgs = document.querySelectorAll(
          '[data-testid="email-editor"] img[src^="http"]'
        );
        if (imgs.length < count) return false;
        return Array.from(imgs).every(
          (img) => (img as HTMLImageElement).complete
        );
      },
      VARIANTS.length,
      { timeout: 30_000, polling: 500 }
    );
    console.log("  ✓ All images loaded in Designer");

    // ─── Step 2: Preview mode + screenshot each element ──────────────
    console.log("Step 2: Designer element screenshots (preview mode)...");

    const previewEditor = await enterPreviewMode(page);
    await expect(previewEditor).toBeVisible({ timeout: 5000 });

    const designerShots: Map<string, Buffer | null> = new Map();
    for (const v of VARIANTS) {
      // ImageBlock renders with alt attribute on the <img> tag.
      const locator = previewEditor
        .locator(`.node-element:has(img[alt="${v.uniqueAlt}"])`)
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
      viewport: { width: 700, height: 6000 },
    });
    await emailPage.setContent(renderedHtml!, { waitUntil: "networkidle" });
    // Wait for email images to finish loading
    await emailPage.waitForFunction(
      () => {
        const imgs = document.querySelectorAll("img");
        return Array.from(imgs).every(
          (img) => img.complete && img.naturalWidth > 0
        );
      },
      { timeout: 30_000, polling: 500 }
    );
    await emailPage.waitForTimeout(500);

    await normalizeEmailPage(emailPage);

    const fullEmailShot = await emailPage.screenshot({ fullPage: true });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "rendered-email-full.png"),
      fullEmailShot
    );

    // Debug: detect image blocks
    const debug = await emailPage.evaluate(() => ({
      imageBlocks: document.querySelectorAll(".c--block-image").length,
      imgElements: document.querySelectorAll("img").length,
      allBlocks: Array.from(document.querySelectorAll('[class*="c--block"]'))
        .map((el) => el.className)
        .slice(0, 15),
    }));
    console.log("  Email debug:", JSON.stringify(debug, null, 2));

    const emailShots: Map<string, Buffer | null> = new Map();
    for (const v of VARIANTS) {
      // Find the image in the email by alt text.
      // The backend renders images inside div.c--block-image blocks.
      let locator = emailPage
        .locator(`.c--block-image:has(img[alt="${v.uniqueAlt}"])`)
        .first();

      let visible = await locator.isVisible().catch(() => false);
      if (!visible) {
        // Fallback: find by alt text on the <img> directly
        locator = emailPage
          .locator(`img[alt="${v.uniqueAlt}"]`)
          .first();
        visible = await locator.isVisible().catch(() => false);
      }
      if (!visible) {
        // Last resort: find by src URL
        const src =
          v.attrs.sourcePath as string;
        locator = emailPage
          .locator(`td:has(img[src="${src}"])`)
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

    const results = await compareElementPairs(pairs, ARTIFACTS_DIR, "Image");

    printResultsSummary(results, MAX_DIFF_PERCENT, ARTIFACTS_DIR);
    await attachFailedResults(results, testInfo);
    saveResultsJson(results, "image");

    // Assert pixel parity
    for (const r of results) {
      expect(
        r.diffPercent,
        `${r.name}: visual difference ${r.diffPercent.toFixed(1)}% exceeds ${MAX_DIFF_PERCENT}%. ` +
          `See diff-${r.name}.png for details.`
      ).toBeLessThanOrEqual(MAX_DIFF_PERCENT);
    }

    console.log("\n✅ Image visual parity test complete!");
  });
});
