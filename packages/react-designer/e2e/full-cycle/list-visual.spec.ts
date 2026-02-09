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
  ENFORCE_STYLES,
  screenshotElement,
  enterPreviewMode,
  exitPreviewMode,
  normalizeEmailPage,
  compareElementPairs,
  printResultsSummary,
  attachFailedResults,
  saveResultsJson,
  assertStyleParity,
  printStyleResults,
  type StyleCheck,
  type StyleProperty,
} from "./visual-test-utils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════
// List Variant Definitions
// ═══════════════════════════════════════════════════════════════════════

interface ListVariant {
  name: string;
  /** First item text — used as unique identifier in the email */
  uniqueText: string;
  /** TipTap list node attributes */
  attrs: Record<string, unknown>;
  /** List items: array of text strings */
  items: string[];
  /** Optional marks to apply to all items */
  marks?: Array<{ type: string }>;
  /** CSS properties the email must have (checked structurally, not pixel) */
  expectedStyles?: StyleProperty[];
}

const VARIANTS: ListVariant[] = [
  // ── Unordered ─────────────────────────────────────────────────────
  {
    name: "unordered-default",
    uniqueText: "Unordered first item",
    attrs: { listType: "unordered" },
    items: ["Unordered first item", "Second item", "Third item"],
  },
  {
    name: "unordered-single",
    uniqueText: "Single unordered item",
    attrs: { listType: "unordered" },
    items: ["Single unordered item"],
  },

  // ── Ordered ───────────────────────────────────────────────────────
  {
    name: "ordered-default",
    uniqueText: "Ordered first item",
    attrs: { listType: "ordered" },
    items: ["Ordered first item", "Second ordered item", "Third ordered item"],
  },
  {
    name: "ordered-single",
    uniqueText: "Single ordered item",
    attrs: { listType: "ordered" },
    items: ["Single ordered item"],
  },

  // ── Text Formatting ───────────────────────────────────────────────
  {
    name: "bold-items",
    uniqueText: "Bold first item",
    attrs: { listType: "unordered" },
    items: ["Bold first item", "Bold second item"],
    marks: [{ type: "bold" }],
    expectedStyles: ["bold"],
  },
  {
    name: "italic-items",
    uniqueText: "Italic first item",
    attrs: { listType: "unordered" },
    items: ["Italic first item", "Italic second item"],
    marks: [{ type: "italic" }],
    expectedStyles: ["italic"],
  },

  // ── Padding ───────────────────────────────────────────────────────
  {
    name: "with-padding",
    uniqueText: "Padded first item",
    attrs: { listType: "unordered", paddingVertical: 16, paddingHorizontal: 12 },
    items: ["Padded first item", "Padded second item"],
  },

  // ── Border ────────────────────────────────────────────────────────
  {
    name: "with-border",
    uniqueText: "Bordered first item",
    attrs: { listType: "unordered", borderWidth: 2, borderColor: "#3B82F6" },
    items: ["Bordered first item", "Bordered second item"],
    expectedStyles: ["border"],
  },

  // ── Many items ────────────────────────────────────────────────────
  {
    name: "many-items",
    uniqueText: "Item number one",
    attrs: { listType: "unordered" },
    items: [
      "Item number one",
      "Item number two",
      "Item number three",
      "Item number four",
      "Item number five",
    ],
  },

  // ── Combinations ──────────────────────────────────────────────────
  {
    name: "ordered-with-border",
    uniqueText: "Styled ordered first",
    attrs: {
      listType: "ordered",
      borderWidth: 2,
      borderColor: "#DC2626",
      paddingVertical: 10,
    },
    items: ["Styled ordered first", "Styled ordered second", "Styled ordered third"],
    expectedStyles: ["border"],
  },
];

// ═══════════════════════════════════════════════════════════════════════
// Test
// ═══════════════════════════════════════════════════════════════════════

const ARTIFACTS_DIR = path.resolve(
  __dirname,
  "../../test-results/list-visual"
);

test.describe("List Visual Parity: Designer vs Rendered Email", () => {
  test.skip(
    !COURIER_AUTH_TOKEN,
    "COURIER_AUTH_TOKEN not set – skipping list visual test"
  );

  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    fs.rmSync(ARTIFACTS_DIR, { recursive: true, force: true });
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

    await loadDesignerEditor(page);
    await resetEditor(page);
  });

  test("all list variants visual parity", async ({
    page,
    request,
    browser,
  }, testInfo) => {
    // ─── Step 1: Build and set the full document ─────────────────────
    // Lists contain listItem children which contain paragraphs. To avoid
    // cursor-nesting issues (like blockquotes), we build the entire
    // document content and set it in one go via setContent.
    console.log(`Step 1: Inserting ${VARIANTS.length} list variants...`);

    const defaultListAttrs = {
      listType: "unordered",
      borderColor: "#000000",
      borderWidth: 0,
      paddingVertical: 6,
      paddingHorizontal: 0,
    };

    const docContent = VARIANTS.flatMap((v) => {
      const listItems = v.items.map((text) => {
        const textNode: Record<string, unknown> = { type: "text", text };
        if (v.marks && v.marks.length > 0) {
          textNode.marks = v.marks;
        }
        return {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [textNode],
            },
          ],
        };
      });

      return [
        {
          type: "list",
          attrs: { ...defaultListAttrs, ...v.attrs },
          content: listItems,
        },
        { type: "paragraph" }, // Separator
      ];
    });

    await page.evaluate((content) => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!ed) throw new Error("Editor not available");
      ed.commands.setContent({ type: "doc", content });
    }, docContent);

    await page.waitForTimeout(500);
    console.log(`  ✓ ${VARIANTS.length} lists inserted via setContent`);

    // ─── Step 2: Preview mode + screenshot each element ──────────────
    console.log("Step 2: Designer element screenshots (preview mode)...");

    const previewEditor = await enterPreviewMode(page);
    await expect(previewEditor).toBeVisible({ timeout: 5000 });

    const designerShots: Map<string, Buffer | null> = new Map();
    for (const v of VARIANTS) {
      // Lists are rendered in .courier-list-wrapper elements.
      // Use unique text from the first item to identify the right list.
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
      viewport: { width: 700, height: 5000 },
    });
    await emailPage.setContent(renderedHtml!, { waitUntil: "networkidle" });
    await emailPage.waitForTimeout(500);

    // ─── Step 5a: Structural style assertions (BEFORE normalization) ─
    console.log("\nStep 5a: Checking structural parity (raw HTML)...");

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
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "rendered-email-full.png"),
      fullEmailShot
    );

    // Debug: detect list elements in the email HTML
    const debug = await emailPage.evaluate(() => ({
      listBlocks: document.querySelectorAll(".c--block-list").length,
      ulElements: document.querySelectorAll("ul").length,
      olElements: document.querySelectorAll("ol").length,
      allBlocks: Array.from(document.querySelectorAll('[class*="c--block"]'))
        .map((el) => el.className)
        .slice(0, 15),
    }));
    console.log("  Email debug:", JSON.stringify(debug, null, 2));

    const emailShots: Map<string, Buffer | null> = new Map();
    for (const v of VARIANTS) {
      // Find the list block containing this variant's unique text.
      // Try c--block-list class first, then fall back to ul/ol or td.
      let locator = emailPage
        .locator(`.c--block-list:has-text("${v.uniqueText}")`)
        .first();

      let visible = await locator.isVisible().catch(() => false);
      if (!visible) {
        // Try <ul> or <ol> containing the text
        locator = emailPage
          .locator(`ul:has-text("${v.uniqueText}"), ol:has-text("${v.uniqueText}")`)
          .first();
        visible = await locator.isVisible().catch(() => false);
      }
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

    const results = await compareElementPairs(pairs, ARTIFACTS_DIR, "List");

    printResultsSummary(results, MAX_DIFF_PERCENT, ARTIFACTS_DIR);
    await attachFailedResults(results, testInfo);
    saveResultsJson(results, "list");

    // Assert pixel parity
    for (const r of results) {
      expect(
        r.diffPercent,
        `${r.name}: visual difference ${r.diffPercent.toFixed(1)}% exceeds ${MAX_DIFF_PERCENT}%. ` +
          `See diff-${r.name}.png for details.`
      ).toBeLessThanOrEqual(MAX_DIFF_PERCENT);
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

    console.log("\n✅ List visual parity test complete!");
  });
});
