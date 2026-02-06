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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════
// Heading Variant Definitions
// ═══════════════════════════════════════════════════════════════════════

interface HeadingVariant {
  name: string;
  attrs: Record<string, unknown>;
  content: Array<{ type: string; text: string; marks?: Array<{ type: string; attrs?: Record<string, unknown> }> }>;
  uniqueText: string;
  /** CSS selector tag for Designer preview (h1, h2, h3) */
  tag: string;
}

const VARIANTS: HeadingVariant[] = [
  // ── Levels ─────────────────────────────────────────────────────────
  {
    name: "h1-default",
    attrs: { level: 1, textAlign: "left" },
    content: [{ type: "text", text: "Heading One Default Style" }],
    uniqueText: "Heading One Default Style",
    tag: "h1",
  },
  {
    name: "h2-default",
    attrs: { level: 2, textAlign: "left" },
    content: [{ type: "text", text: "Heading Two Default Style" }],
    uniqueText: "Heading Two Default Style",
    tag: "h2",
  },
  {
    name: "h3-default",
    attrs: { level: 3, textAlign: "left" },
    content: [{ type: "text", text: "Heading Three Default Style" }],
    uniqueText: "Heading Three Default Style",
    tag: "h3",
  },

  // ── Alignment ──────────────────────────────────────────────────────
  {
    name: "h1-center",
    attrs: { level: 1, textAlign: "center" },
    content: [{ type: "text", text: "Center Aligned Heading Test" }],
    uniqueText: "Center Aligned Heading Test",
    tag: "h1",
  },
  {
    name: "h1-right",
    attrs: { level: 1, textAlign: "right" },
    content: [{ type: "text", text: "Right Aligned Heading Test" }],
    uniqueText: "Right Aligned Heading Test",
    tag: "h1",
  },
  {
    name: "h2-center",
    attrs: { level: 2, textAlign: "center" },
    content: [{ type: "text", text: "Centered H2 Heading Verification" }],
    uniqueText: "Centered H2 Heading Verification",
    tag: "h2",
  },

  // ── Inline Formatting ──────────────────────────────────────────────
  {
    name: "h1-with-italic",
    attrs: { level: 1, textAlign: "left" },
    content: [
      { type: "text", text: "Heading with " },
      { type: "text", text: "italic emphasis", marks: [{ type: "italic" }] },
      { type: "text", text: " inside" },
    ],
    uniqueText: "italic emphasis inside",
    tag: "h1",
  },
  {
    name: "h2-mixed-formatting",
    attrs: { level: 2, textAlign: "left" },
    content: [
      { type: "text", text: "H2 with " },
      { type: "text", text: "bold", marks: [{ type: "bold" }] },
      { type: "text", text: " and " },
      { type: "text", text: "underline", marks: [{ type: "underline" }] },
      { type: "text", text: " mixed" },
    ],
    uniqueText: "H2 with bold and underline",
    tag: "h2",
  },

  // ── Frame / Styling ───────────────────────────────────────────────
  {
    name: "h1-custom-padding",
    attrs: { level: 1, textAlign: "left", paddingVertical: 20, paddingHorizontal: 24 },
    content: [{ type: "text", text: "Heading With Custom Padding Applied" }],
    uniqueText: "Heading With Custom Padding Applied",
    tag: "h1",
  },
  {
    name: "h1-background",
    attrs: { level: 1, textAlign: "left", backgroundColor: "#DBEAFE" },
    content: [{ type: "text", text: "Heading With Blue Background Color" }],
    uniqueText: "Heading With Blue Background Color",
    tag: "h1",
  },
  {
    name: "h2-border",
    attrs: { level: 2, textAlign: "left", borderWidth: 2, borderColor: "#10B981" },
    content: [{ type: "text", text: "H2 With Green Border Styling" }],
    uniqueText: "H2 With Green Border Styling",
    tag: "h2",
  },

  // ── Combinations ──────────────────────────────────────────────────
  {
    name: "h1-combo-styled",
    attrs: {
      level: 1,
      textAlign: "center",
      paddingVertical: 16,
      paddingHorizontal: 20,
      backgroundColor: "#FEF3C7",
      borderWidth: 2,
      borderColor: "#F59E0B",
    },
    content: [
      { type: "text", text: "Styled " },
      { type: "text", text: "Combo Heading", marks: [{ type: "italic" }] },
      { type: "text", text: " Full Test" },
    ],
    uniqueText: "Combo Heading Full Test",
    tag: "h1",
  },
  {
    name: "h2-combo-styled",
    attrs: {
      level: 2,
      textAlign: "right",
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: "#F3E8FF",
      borderWidth: 1,
      borderColor: "#8B5CF6",
    },
    content: [{ type: "text", text: "H2 Right Combo With All Styles" }],
    uniqueText: "H2 Right Combo With All Styles",
    tag: "h2",
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
    // ─── Step 1: Insert all heading variants ──────────────────────────
    console.log(`Step 1: Inserting ${VARIANTS.length} heading variants...`);

    await page.evaluate((variants) => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!ed) throw new Error("Editor not available");

      ed.commands.clearContent();

      for (const v of variants) {
        ed.commands.insertContent({
          type: "heading",
          attrs: v.attrs,
          content: v.content,
        });
      }
    }, VARIANTS);

    await page.waitForTimeout(800);
    console.log(`  ✓ ${VARIANTS.length} headings inserted`);

    // ─── Step 2: Preview mode + screenshot each element ──────────────
    console.log("Step 2: Designer element screenshots (preview mode)...");

    const previewEditor = await enterPreviewMode(page);
    await expect(previewEditor).toBeVisible({ timeout: 5000 });

    const designerShots: Map<string, Buffer | null> = new Map();
    for (const v of VARIANTS) {
      // Use the heading tag + unique text to locate each variant
      const locator = previewEditor
        .locator(`${v.tag}:has-text("${v.uniqueText}")`)
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

    await normalizeEmailPage(emailPage);

    const fullEmailShot = await emailPage.screenshot({ fullPage: true });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "rendered-email-full.png"), fullEmailShot);

    const emailShots: Map<string, Buffer | null> = new Map();
    for (const v of VARIANTS) {
      // Headings in rendered email are typically in <td>, <div>, or <h1>/<h2> tags
      const locator = emailPage
        .locator(`td:has-text("${v.uniqueText}"), div:has-text("${v.uniqueText}")`)
        .locator("visible=true")
        .last();
      const shot = await screenshotElement(locator, `email-${v.name}`, ARTIFACTS_DIR);
      emailShots.set(v.name, shot);
    }
    console.log(`  ✓ ${emailShots.size} email screenshots taken`);
    await emailPage.close();

    // ─── Step 6: Compare each element pair ───────────────────────────
    console.log(`\nStep 6: Comparing ${VARIANTS.length} element pairs...\n`);

    const pairs = VARIANTS.map((v) => ({
      name: v.name,
      designerShot: designerShots.get(v.name) ?? null,
      emailShot: emailShots.get(v.name) ?? null,
    }));

    const results = await compareElementPairs(pairs, ARTIFACTS_DIR, "Heading");

    printResultsSummary(results, MAX_DIFF_PERCENT, ARTIFACTS_DIR);
    await attachFailedResults(results, testInfo);
    saveResultsJson(results, "heading");

    for (const r of results) {
      expect(
        r.diffPercent,
        `${r.name}: visual difference ${r.diffPercent.toFixed(1)}% exceeds ${MAX_DIFF_PERCENT}%. ` +
        `See diff-${r.name}.png for details.`
      ).toBeLessThanOrEqual(MAX_DIFF_PERCENT);
    }

    console.log("\n✅ Heading visual parity test complete!");
  });
});
