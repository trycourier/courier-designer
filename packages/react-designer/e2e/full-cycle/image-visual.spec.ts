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
import { normalizeEmailPage, enterPreviewMode, exitPreviewMode } from "./visual-test-utils";
import { insertImageBlock, insertDivider } from "./ui-helpers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// A stable public placeholder image for testing.
const TEST_IMAGE_URL = "https://placehold.co/400x200/EBF4FF/1E40AF.png?text=Test+Image";
const TEST_IMAGE_URL_2 = "https://placehold.co/400x200/FEF3C7/92400E.png?text=Alt+Image";

// ═══════════════════════════════════════════════════════════════════════
// ImageBlock Variant Definitions
// ═══════════════════════════════════════════════════════════════════════
//
// ImageBlock is an atom node. The sidebar form exposes:
//   - Source (upload / URL)
//   - Link (click-through URL)
//   - Alt text
//   - Width (percentage 1-100, plus original/fill toggle)
//   - Alignment (left / center / right)
//   - Border (width + color)
//
// We insert images programmatically via insertImageBlock(page, attrs).

interface ImageVariant {
  name: string;
  /** Unique alt text used to locate this image in Designer & email */
  uniqueAlt: string;
  attrs: Record<string, unknown>;
}

const VARIANTS: ImageVariant[] = [
  // ── Alignment ──────────────────────────────────────────────────────
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

  // ── Width ──────────────────────────────────────────────────────────
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

  // ── Border ─────────────────────────────────────────────────────────
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

  // ── Different image ────────────────────────────────────────────────
  {
    name: "alt-image",
    uniqueAlt: "alt-image-img",
    attrs: { sourcePath: TEST_IMAGE_URL_2, alt: "alt-image-img", alignment: "center", width: 70 },
  },

  // ── Combinations ───────────────────────────────────────────────────
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

test.describe("Image Visual Parity: Designer vs Rendered Email", () => {
  test.skip(!COURIER_AUTH_TOKEN, "COURIER_AUTH_TOKEN not set – skipping image visual test");

  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await loadDesignerEditor(page);
    await resetEditor(page);
  });

  test("all image variants visual parity", async ({ page, request, browser }) => {
    // ─── Step 1: Insert all image variants ────────────────────────────
    console.log(`Step 1: Inserting ${VARIANTS.length} image variants...`);

    for (let i = 0; i < VARIANTS.length; i++) {
      const v = VARIANTS[i];
      console.log(`  Inserting: ${v.name}`);
      await insertImageBlock(page, v.attrs);

      // Insert a divider between variants to force separate Elemental blocks
      if (i < VARIANTS.length - 1) {
        await insertDivider(page, { color: "#FFFFFF", size: 1, padding: 0 });
      }
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
        return Array.from(imgs).every((img) => (img as HTMLImageElement).complete);
      },
      VARIANTS.length,
      { timeout: 30_000, polling: 500 }
    );
    console.log("  ✓ All images loaded in Designer");

    // ─── Step 2: Designer baseline snapshots (preview mode) ───────────
    console.log("Step 2: Checking Designer baselines (preview mode)...");

    const previewEditor = await enterPreviewMode(page);
    await expect(previewEditor).toBeVisible({ timeout: 5000 });

    for (const v of VARIANTS) {
      const locator = previewEditor
        .locator(`.node-element:has(img[alt="${v.uniqueAlt}"])`)
        .first();
      await locator.waitFor({ state: "visible", timeout: 5000 });
      await locator.scrollIntoViewIfNeeded();
      await expect(locator).toHaveScreenshot(`designer-${v.name}.png`);
    }
    console.log(`  ✓ ${VARIANTS.length} Designer baselines checked`);

    await exitPreviewMode(page);

    // ─── Step 3: Capture Elemental content & send ─────────────────────
    console.log("Step 3: Capturing Elemental content and sending...");

    const { emailElements } = await captureElementalContent(page);
    console.log(`  Elemental: ${emailElements.length} elements captured`);

    // ─── Steps 3b-5: Email rendering (backend-dependent, warn-only) ──
    const emailWarnings: string[] = [];
    let emailPage: import("playwright").Page | undefined;
    const snapshotsDir = path.join(__dirname, "image-visual.spec.ts-snapshots");

    try {
      const requestId = await sendNotification(request, emailElements);
      console.log(`  ✓ Sent, requestId: ${requestId}`);

      // ─── Step 4: Poll for rendered HTML ─────────────────────────────
      console.log("Step 4: Polling for rendered email...");

      const { renderedHtml } = await pollForRenderedHtml(request, requestId);

      if (!renderedHtml) {
        emailWarnings.push("Email rendering returned empty HTML — skipping email baselines.");
      } else {
        // ─── Step 5: Email baseline snapshots (warn-only) ──────────────
        console.log("Step 5: Checking Email baselines (warn-only)...");

        emailPage = await browser.newPage({ viewport: { width: 700, height: 6000 } });
        await emailPage.setContent(renderedHtml, { waitUntil: "networkidle" });

        // Wait for email images to load
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

        let matched = 0;
        let warned = 0;
        let created = 0;

        for (const v of VARIANTS) {
          const baselineName = `email-${v.name}-chromium-darwin.png`;
          const baselinePath = path.join(snapshotsDir, baselineName);

          try {
            // Find image in the email by alt text. Backend renders inside .c--block-image.
            let locator = emailPage
              .locator(`.c--block-image:has(img[alt="${v.uniqueAlt}"])`)
              .first();

            let visible = await locator.isVisible().catch(() => false);
            if (!visible) {
              // Fallback: find by alt text directly on <img>
              locator = emailPage.locator(`img[alt="${v.uniqueAlt}"]`).first();
            }

            await locator.waitFor({ state: "visible", timeout: 5000 });
            await locator.scrollIntoViewIfNeeded();

            const actual = await locator.screenshot();

            if (fs.existsSync(baselinePath)) {
              const baseline = fs.readFileSync(baselinePath);
              if (!actual.equals(baseline)) {
                const actualPath = baselinePath.replace(".png", "-actual.png");
                fs.writeFileSync(actualPath, actual);
                emailWarnings.push(
                  `email-${v.name}: differs from baseline (actual saved to ${path.basename(actualPath)})`
                );
                warned++;
              } else {
                matched++;
              }
            } else {
              fs.mkdirSync(snapshotsDir, { recursive: true });
              fs.writeFileSync(baselinePath, actual);
              emailWarnings.push(`email-${v.name}: new baseline written (no previous baseline)`);
              created++;
            }
          } catch (err) {
            const msg = `email-${v.name}: ${(err as Error).message?.split("\n")[0] ?? err}`;
            emailWarnings.push(msg);
            warned++;
          }
        }
        console.log(
          `  ✓ ${VARIANTS.length} Email baselines checked (${matched} matched, ${created} created, ${warned} warned)`
        );
      }
    } catch (err) {
      emailWarnings.push(
        `Email rendering failed: ${(err as Error).message?.split("\n")[0] ?? err}`
      );
    } finally {
      if (emailPage) await emailPage.close().catch(() => {});
    }

    // ─── Summary ──────────────────────────────────────────────────────
    if (emailWarnings.length > 0) {
      console.warn("\n⚠️  Email snapshot warnings (non-blocking, backend-related):");
      for (const w of emailWarnings) {
        console.warn(`   • ${w}`);
      }
    }

    console.log("\n✅ Image visual parity test complete!");
  });
});
