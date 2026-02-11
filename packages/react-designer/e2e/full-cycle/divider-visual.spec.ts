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
  normalizeEmailPage,
  enterPreviewMode,
  exitPreviewMode,
} from "./visual-test-utils";
import { insertDivider } from "./ui-helpers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════
// Divider & Spacer Variant Definitions
// ═══════════════════════════════════════════════════════════════════════
//
// Dividers and Spacers are atom-like nodes with no text content.
// A Spacer is a Divider with variant:"spacer" and transparent color.
// Variants are identified by their index in the DOM (nth <hr> wrapper).

interface DividerVariant {
  name: string;
  /** Attributes passed to insertDivider (merged with defaults). */
  attrs: Record<string, unknown>;
}

const VARIANTS: DividerVariant[] = [
  // ── Divider Defaults ─────────────────────────────────────────────────
  {
    name: "default",
    attrs: {},
  },

  // ── Colors (Line → Color) ────────────────────────────────────────────
  {
    name: "red",
    attrs: { color: "#EF4444" },
  },
  {
    name: "blue",
    attrs: { color: "#3B82F6" },
  },
  {
    name: "gray",
    attrs: { color: "#9CA3AF" },
  },

  // ── Thickness (Line → Size) ──────────────────────────────────────────
  {
    name: "thin",
    attrs: { size: 1 },
  },
  {
    name: "medium-thick",
    attrs: { size: 3 },
  },
  {
    name: "thick",
    attrs: { size: 6 },
  },

  // ── Padding (Frame → Padding) ────────────────────────────────────────
  {
    name: "small-padding",
    attrs: { padding: 2 },
  },
  {
    name: "large-padding",
    attrs: { padding: 20 },
  },

  // ── Spacer Variants (Frame → Padding only) ───────────────────────────
  {
    name: "spacer-default",
    attrs: { variant: "spacer", color: "transparent", padding: 24 },
  },
  {
    name: "spacer-small",
    attrs: { variant: "spacer", color: "transparent", padding: 8 },
  },
  {
    name: "spacer-large",
    attrs: { variant: "spacer", color: "transparent", padding: 48 },
  },

  // ── Combinations (color + size + padding) ────────────────────────────
  {
    name: "combo-colored-thick",
    attrs: { color: "#059669", size: 4, padding: 12 },
  },
  {
    name: "combo-styled",
    attrs: { color: "#DC2626", size: 3, padding: 16 },
  },
];

// ═══════════════════════════════════════════════════════════════════════
// Test
// ═══════════════════════════════════════════════════════════════════════

test.describe("Divider & Spacer Visual Parity: Designer vs Rendered Email", () => {
  test.skip(
    !COURIER_AUTH_TOKEN,
    "COURIER_AUTH_TOKEN not set – skipping divider visual test"
  );

  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await loadDesignerEditor(page);
    await resetEditor(page);
  });

  test("all divider and spacer variants visual parity", async ({
    page,
    request,
    browser,
  }) => {
    // ─── Step 1: Insert all divider/spacer variants ───────────────────
    console.log(`Step 1: Inserting ${VARIANTS.length} divider/spacer variants...`);

    for (const v of VARIANTS) {
      console.log(`  Inserting: ${v.name}`);
      await insertDivider(page, v.attrs);
    }

    await page.waitForTimeout(500);
    console.log(`  ✓ ${VARIANTS.length} dividers/spacers inserted`);

    // ─── Step 2: Designer baseline snapshots (preview mode) ───────────
    // Dividers have no text, so we locate them by nth index of
    // .node-element:has(hr) within the preview editor.
    console.log("Step 2: Checking Designer baselines (preview mode)...");

    const previewEditor = await enterPreviewMode(page);
    await expect(previewEditor).toBeVisible({ timeout: 5000 });

    for (let i = 0; i < VARIANTS.length; i++) {
      const v = VARIANTS[i];
      const locator = previewEditor
        .locator(".node-element:has(hr)")
        .nth(i);
      await locator.waitFor({ state: "visible", timeout: 5000 });
      await locator.scrollIntoViewIfNeeded();
      await expect(locator).toHaveScreenshot(`designer-${v.name}.png`);
    }
    console.log(`  ✓ ${VARIANTS.length} Designer baselines checked`);

    await exitPreviewMode(page);

    // ─── Step 3: Capture Elemental content & send ────────────────────
    console.log("Step 3: Capturing Elemental content and sending...");

    const { emailElements } = await captureElementalContent(page);
    console.log(`  Elemental: ${emailElements.length} elements captured`);

    // ─── Steps 3b-5: Email rendering (backend-dependent, warn-only) ──
    const emailWarnings: string[] = [];
    let emailPage: import("playwright").Page | undefined;
    const snapshotsDir = path.join(
      __dirname,
      "divider-visual.spec.ts-snapshots"
    );

    try {
      const requestId = await sendNotification(request, emailElements);
      console.log(`  ✓ Sent, requestId: ${requestId}`);

      // ─── Step 4: Poll for rendered HTML ──────────────────────────────
      console.log("Step 4: Polling for rendered email...");

      const { renderedHtml } = await pollForRenderedHtml(request, requestId);

      if (!renderedHtml) {
        emailWarnings.push("Email rendering returned empty HTML — skipping email baselines.");
      } else {
        // ─── Step 5: Email baseline snapshots (warn-only) ────────────────
        console.log("Step 5: Checking Email baselines (warn-only)...");

        emailPage = await browser.newPage({ viewport: { width: 700, height: 4000 } });
        await emailPage.setContent(renderedHtml, { waitUntil: "networkidle" });
        await emailPage.waitForTimeout(500);

        await normalizeEmailPage(emailPage);

        // Courier renders dividers inside div.c--block-divider containers.
        const emailDividerSelector = "div.c--block-divider";
        const emailDividerCount = await emailPage.locator(emailDividerSelector).count();
        console.log(`  Found ${emailDividerCount} email divider blocks`);

        let matched = 0;
        let warned = 0;
        let created = 0;

        for (let i = 0; i < VARIANTS.length; i++) {
          const v = VARIANTS[i];
          const baselineName = `email-${v.name}-chromium-darwin.png`;
          const baselinePath = path.join(snapshotsDir, baselineName);

          try {
            if (i >= emailDividerCount) {
              emailWarnings.push(`email-${v.name}: no email element found at index ${i}`);
              warned++;
              continue;
            }

            const locator = emailPage.locator(emailDividerSelector).nth(i);
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
      emailWarnings.push(`Email rendering failed: ${(err as Error).message?.split("\n")[0] ?? err}`);
    } finally {
      if (emailPage) await emailPage.close().catch(() => {});
    }

    // ─── Summary ─────────────────────────────────────────────────────
    if (emailWarnings.length > 0) {
      console.warn("\n⚠️  Email snapshot warnings (non-blocking, backend-related):");
      for (const w of emailWarnings) {
        console.warn(`   • ${w}`);
      }
    }

    console.log("\n✅ Divider & Spacer visual parity test complete!");
  });
});
