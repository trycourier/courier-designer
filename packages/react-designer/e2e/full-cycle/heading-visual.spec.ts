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
  ENFORCE_ALIGNMENT,
  ENFORCE_STYLES,
  screenshotElement,
  enterPreviewMode,
  exitPreviewMode,
  normalizeEmailPage,
  compareElementPairs,
  printResultsSummary,
  attachFailedResults,
  saveResultsJson,
  assertAlignmentParity,
  printAlignmentResults,
  assertStyleParity,
  printStyleResults,
  type AlignmentCheck,
  type StyleCheck,
  type StyleProperty,
} from "./visual-test-utils";
import {
  typeText,
  toggleBold,
  toggleItalic,
  toggleUnderline,
  setAlignment,
  insertHeadingBlock,
  setBlockAttrs,
} from "./ui-helpers";
// Note: heading blocks are inserted programmatically (level is a block
// attribute, not something users type). Text content and inline formatting
// are typed via real keyboard input.
import type { Page } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════
// Heading Variant Definitions (UI-driven)
// ═══════════════════════════════════════════════════════════════════════

interface HeadingVariant {
  name: string;
  uniqueText: string;
  tag: string; // h1, h2, h3
  setup: (page: Page) => Promise<void>;
  frameAttrs?: Record<string, unknown>;
  /** Expected alignment for structural assertion (default: "left") */
  expectedAlignment?: string;
  /** CSS properties the email must have (checked structurally, not pixel) */
  expectedStyles?: StyleProperty[];
}

const VARIANTS: HeadingVariant[] = [
  // ── Levels ─────────────────────────────────────────────────────────
  {
    name: "h1-default",
    uniqueText: "Heading One Default Style",
    tag: "h1",
    setup: async (page) => {
      await insertHeadingBlock(page, 1);
      await typeText(page, "Heading One Default Style");
    },
  },
  {
    name: "h2-default",
    uniqueText: "Heading Two Default Style",
    tag: "h2",
    setup: async (page) => {
      await insertHeadingBlock(page, 2);
      await typeText(page, "Heading Two Default Style");
    },
  },
  {
    name: "h3-default",
    uniqueText: "Heading Three Default Style",
    tag: "h3",
    setup: async (page) => {
      await insertHeadingBlock(page, 3);
      await typeText(page, "Heading Three Default Style");
    },
  },

  // ── Alignment ──────────────────────────────────────────────────────
  {
    name: "h1-center",
    uniqueText: "Center Aligned Heading Test",
    tag: "h1",
    expectedAlignment: "center",
    setup: async (page) => {
      await insertHeadingBlock(page, 1);
      await setAlignment(page, "center");
      await typeText(page, "Center Aligned Heading Test");
    },
  },
  {
    name: "h1-right",
    uniqueText: "Right Aligned Heading Test",
    tag: "h1",
    expectedAlignment: "right",
    setup: async (page) => {
      await insertHeadingBlock(page, 1);
      await setAlignment(page, "right");
      await typeText(page, "Right Aligned Heading Test");
    },
  },
  {
    name: "h2-center",
    uniqueText: "Centered H2 Heading Verification",
    tag: "h2",
    expectedAlignment: "center",
    setup: async (page) => {
      await insertHeadingBlock(page, 2);
      await setAlignment(page, "center");
      await typeText(page, "Centered H2 Heading Verification");
    },
  },

  // ── Inline Formatting ──────────────────────────────────────────────
  {
    name: "h1-with-italic",
    uniqueText: "italic emphasis inside",
    tag: "h1",
    expectedStyles: ["italic"],
    setup: async (page) => {
      await insertHeadingBlock(page, 1);
      await typeText(page, "Heading with ");
      await toggleItalic(page);
      await typeText(page, "italic emphasis");
      await toggleItalic(page);
      await typeText(page, " inside");
    },
  },
  {
    name: "h2-mixed-formatting",
    uniqueText: "H2 with bold and underline",
    tag: "h2",
    expectedStyles: ["bold", "underline"],
    setup: async (page) => {
      await insertHeadingBlock(page, 2);
      await typeText(page, "H2 with ");
      await toggleBold(page);
      await typeText(page, "bold");
      await toggleBold(page);
      await typeText(page, " and ");
      await toggleUnderline(page);
      await typeText(page, "underline");
      await toggleUnderline(page);
      await typeText(page, " mixed");
    },
  },

  // ── Frame / Styling ───────────────────────────────────────────────
  {
    name: "h1-custom-padding",
    uniqueText: "Heading With Custom Padding Applied",
    tag: "h1",
    setup: async (page) => {
      await insertHeadingBlock(page, 1);
      await typeText(page, "Heading With Custom Padding Applied");
    },
    frameAttrs: { paddingVertical: 20, paddingHorizontal: 24 },
  },
  {
    name: "h1-background",
    uniqueText: "Heading With Blue Background Color",
    tag: "h1",
    setup: async (page) => {
      await insertHeadingBlock(page, 1);
      await typeText(page, "Heading With Blue Background Color");
    },
    frameAttrs: { backgroundColor: "#DBEAFE" },
    expectedStyles: ["background"],
  },
  {
    name: "h2-border",
    uniqueText: "H2 With Green Border Styling",
    tag: "h2",
    setup: async (page) => {
      await insertHeadingBlock(page, 2);
      await typeText(page, "H2 With Green Border Styling");
    },
    frameAttrs: { borderWidth: 2, borderColor: "#10B981" },
    expectedStyles: ["border"],
  },

  // ── Combinations ──────────────────────────────────────────────────
  {
    name: "h1-combo-styled",
    uniqueText: "Combo Heading Full Test",
    tag: "h1",
    expectedAlignment: "center",
    setup: async (page) => {
      await insertHeadingBlock(page, 1);
      await setAlignment(page, "center");
      await typeText(page, "Styled ");
      await toggleItalic(page);
      await typeText(page, "Combo Heading");
      await toggleItalic(page);
      await typeText(page, " Full Test");
    },
    frameAttrs: {
      paddingVertical: 16,
      paddingHorizontal: 20,
      backgroundColor: "#FEF3C7",
      borderWidth: 2,
      borderColor: "#F59E0B",
    },
    expectedStyles: ["italic", "background", "border"],
  },
  {
    name: "h2-combo-styled",
    uniqueText: "H2 Right Combo With All Styles",
    tag: "h2",
    expectedAlignment: "right",
    setup: async (page) => {
      await insertHeadingBlock(page, 2);
      await setAlignment(page, "right");
      await typeText(page, "H2 Right Combo With All Styles");
    },
    frameAttrs: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: "#F3E8FF",
      borderWidth: 1,
      borderColor: "#8B5CF6",
    },
    expectedStyles: ["background", "border"],
  },
];

// ═══════════════════════════════════════════════════════════════════════
// Test
// ═══════════════════════════════════════════════════════════════════════

const ARTIFACTS_DIR = path.resolve(
  __dirname,
  "../../test-results/heading-visual"
);

test.describe("Heading Visual Parity: Designer vs Rendered Email", () => {
  test.skip(
    !COURIER_AUTH_TOKEN,
    "COURIER_AUTH_TOKEN not set – skipping heading visual test"
  );

  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    fs.rmSync(ARTIFACTS_DIR, { recursive: true, force: true });
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

    await loadDesignerEditor(page);
    await resetEditor(page);
  });

  test("all heading variants visual parity", async ({
    page,
    request,
    browser,
  }, testInfo) => {
    // ─── Step 1: Create all heading variants via UI ───────────────────
    console.log(`Step 1: Creating ${VARIANTS.length} heading variants via UI...`);

    await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      ed?.commands.focus("end");
    });
    await page.waitForTimeout(200);

    for (const v of VARIANTS) {
      console.log(`  Creating: ${v.name}`);
      await v.setup(page);
    }

    // Apply frame styling attrs where needed
    for (const v of VARIANTS) {
      if (v.frameAttrs) {
        await setBlockAttrs(page, v.uniqueText, v.frameAttrs);
      }
    }

    await page.waitForTimeout(500);
    console.log(`  ✓ ${VARIANTS.length} headings created via UI`);

    // ─── Step 2: Preview mode + screenshot each element ──────────────
    console.log("Step 2: Designer element screenshots (preview mode)...");

    const previewEditor = await enterPreviewMode(page);
    await expect(previewEditor).toBeVisible({ timeout: 5000 });

    const designerShots: Map<string, Buffer | null> = new Map();
    for (const v of VARIANTS) {
      // Use the block wrapper (.node-element) instead of just the <h1>/<h2>
      // tag so we capture the full element including frame padding/background.
      // This produces larger images where font rendering noise is a smaller %.
      const locator = previewEditor
        .locator(`.node-element:has-text("${v.uniqueText}")`)
        .first();
      const shot = await screenshotElement(locator, `designer-${v.name}`, ARTIFACTS_DIR);
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
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "rendered-email.html"), renderedHtml!);

    // ─── Step 5: Render email & screenshot each element ──────────────
    console.log("Step 5: Rendering email and taking element screenshots...");

    const emailPage = await browser.newPage({ viewport: { width: 700, height: 2400 } });
    await emailPage.setContent(renderedHtml!, { waitUntil: "networkidle" });
    await emailPage.waitForTimeout(500);

    // ─── Step 5a: Structural assertions (BEFORE normalization) ───────
    // Must run on raw HTML — normalizeEmailPage strips backgrounds/borders.
    console.log("\nStep 5a: Checking structural parity (raw HTML)...");

    const alignmentChecks: AlignmentCheck[] = VARIANTS
      .filter((v) => v.expectedAlignment)
      .map((v) => ({
        name: v.name,
        uniqueText: v.uniqueText,
        expectedAlignment: v.expectedAlignment!,
        elementType: "text" as const,
      }));

    const alignResults = await assertAlignmentParity(emailPage, alignmentChecks);
    printAlignmentResults(alignResults);

    const styleChecks: StyleCheck[] = VARIANTS
      .filter((v) => v.expectedStyles && v.expectedStyles.length > 0)
      .map((v) => ({
        name: v.name,
        uniqueText: v.uniqueText,
        expectedStyles: v.expectedStyles!,
      }));

    const styleResults = await assertStyleParity(emailPage, styleChecks);
    printStyleResults(styleResults);

    // ─── Step 5b: Normalize & screenshot ─────────────────────────────
    console.log("\nStep 5b: Normalizing email and taking screenshots...");

    await normalizeEmailPage(emailPage);

    const fullEmailShot = await emailPage.screenshot({ fullPage: true });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "rendered-email-full.png"), fullEmailShot);

    const emailShots: Map<string, Buffer | null> = new Map();
    for (const v of VARIANTS) {
      let locator = emailPage
        .locator(`.c--block:has-text("${v.uniqueText}")`)
        .first();
      const visible = await locator.isVisible().catch(() => false);
      if (!visible) {
        locator = emailPage
          .locator(`td:has-text("${v.uniqueText}"), div:has-text("${v.uniqueText}")`)
          .locator("visible=true")
          .last();
      }
      const shot = await screenshotElement(locator, `email-${v.name}`, ARTIFACTS_DIR);
      emailShots.set(v.name, shot);
    }
    console.log(`  ✓ ${emailShots.size} email screenshots taken`);

    await emailPage.close();

    // ─── Step 6: Compare each element pair (pixel) ───────────────────
    console.log(`\nStep 6: Comparing ${VARIANTS.length} element pairs (pixel)...\n`);

    const pairs = VARIANTS.map((v) => ({
      name: v.name,
      designerShot: designerShots.get(v.name) ?? null,
      emailShot: emailShots.get(v.name) ?? null,
    }));

    const results = await compareElementPairs(pairs, ARTIFACTS_DIR, "Heading");

    printResultsSummary(results, MAX_DIFF_PERCENT, ARTIFACTS_DIR);
    await attachFailedResults(results, testInfo);
    saveResultsJson(results, "heading");

    // Assert pixel parity
    for (const r of results) {
      expect(
        r.diffPercent,
        `${r.name}: visual difference ${r.diffPercent.toFixed(1)}% exceeds ${MAX_DIFF_PERCENT}%. ` +
        `See diff-${r.name}.png for details.`
      ).toBeLessThanOrEqual(MAX_DIFF_PERCENT);
    }

    // Assert alignment parity (report-only when ENFORCE_ALIGNMENT is false)
    if (ENFORCE_ALIGNMENT) {
      for (const r of alignResults) {
        expect(
          r.actual,
          `${r.name}: alignment mismatch — expected "${r.expected}", got "${r.actual}"`
        ).toBe(r.expected);
      }
    } else {
      const failed = alignResults.filter((r) => !r.passed);
      if (failed.length > 0) {
        console.log(`\n  ⚠ ${failed.length} alignment mismatch(es) detected (non-blocking):`);
        for (const r of failed) {
          console.log(`    • ${r.name}: expected "${r.expected}", got "${r.actual}"`);
        }
      }
    }

    // Assert structural style parity
    if (ENFORCE_STYLES) {
      for (const r of styleResults) {
        expect(
          r.passed,
          `${r.name} [${r.property}]: style mismatch — expected "${r.expected}", got "${r.actual}". ` +
            `The Designer sets this property but the rendered email does not have it.`
        ).toBe(true);
      }
    } else {
      const failed = styleResults.filter((r) => !r.passed);
      if (failed.length > 0) {
        console.log(`\n  ⚠ ${failed.length} style mismatch(es) detected (non-blocking):`);
        for (const r of failed) {
          console.log(`    • ${r.name} [${r.property}]: expected "${r.expected}", got "${r.actual}"`);
        }
      }
    }

    console.log("\n✅ Heading visual parity test complete!");
  });
});
