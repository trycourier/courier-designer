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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════
// Paragraph Variant Definitions
// ═══════════════════════════════════════════════════════════════════════

/**
 * Each variant describes a single paragraph to insert into the editor.
 * `uniqueText` is a distinctive string used to locate the element in both
 * the Designer preview and the rendered email HTML.
 */
interface ParagraphVariant {
  /** Short identifier for logging / artifact filenames */
  name: string;
  /** TipTap paragraph node attributes */
  attrs: Record<string, unknown>;
  /** TipTap content array (inline text + marks) */
  content: Array<{ type: string; text: string; marks?: Array<{ type: string; attrs?: Record<string, unknown> }> }>;
  /** Unique substring present in this paragraph (for locator matching) */
  uniqueText: string;
}

const VARIANTS: ParagraphVariant[] = [
  // ── Alignment ───────────────────────────────────────────────────────
  {
    name: "align-left",
    attrs: { textAlign: "left" },
    content: [{ type: "text", text: "Left aligned plain text paragraph for visual parity check." }],
    uniqueText: "Left aligned plain text",
  },
  {
    name: "align-center",
    attrs: { textAlign: "center" },
    content: [{ type: "text", text: "Center aligned paragraph used for testing alignment rendering." }],
    uniqueText: "Center aligned paragraph",
  },
  {
    name: "align-right",
    attrs: { textAlign: "right" },
    content: [{ type: "text", text: "Right aligned paragraph to verify text positioning in email." }],
    uniqueText: "Right aligned paragraph",
  },
  {
    name: "align-justify",
    attrs: { textAlign: "justify" },
    content: [
      { type: "text", text: "Justified paragraph with enough words to demonstrate full justification across the entire width of the content area." },
    ],
    uniqueText: "Justified paragraph with enough",
  },

  // ── Inline Formatting ──────────────────────────────────────────────
  {
    name: "bold",
    attrs: { textAlign: "left" },
    content: [
      { type: "text", text: "This paragraph has " },
      { type: "text", text: "bold text", marks: [{ type: "bold" }] },
      { type: "text", text: " inside it for formatting check." },
    ],
    uniqueText: "bold text inside it for",
  },
  {
    name: "italic",
    attrs: { textAlign: "left" },
    content: [
      { type: "text", text: "This paragraph has " },
      { type: "text", text: "italic text", marks: [{ type: "italic" }] },
      { type: "text", text: " inside it for style verification." },
    ],
    uniqueText: "italic text inside it for",
  },
  {
    name: "mixed-formatting",
    attrs: { textAlign: "left" },
    content: [
      { type: "text", text: "Mixed: " },
      { type: "text", text: "bold", marks: [{ type: "bold" }] },
      { type: "text", text: " and " },
      { type: "text", text: "italic", marks: [{ type: "italic" }] },
      { type: "text", text: " and " },
      { type: "text", text: "underline", marks: [{ type: "underline" }] },
      { type: "text", text: " and " },
      { type: "text", text: "strike", marks: [{ type: "strike" }] },
      { type: "text", text: " together in one line." },
    ],
    uniqueText: "Mixed: bold and italic",
  },
  {
    name: "link",
    attrs: { textAlign: "left" },
    content: [
      { type: "text", text: "Paragraph with a " },
      {
        type: "text",
        text: "clickable link",
        marks: [{ type: "link", attrs: { href: "https://example.com", target: "_blank" } }],
      },
      { type: "text", text: " embedded for link rendering test." },
    ],
    uniqueText: "clickable link embedded for",
  },

  // ── Variables ──────────────────────────────────────────────────────
  {
    name: "variable",
    attrs: { textAlign: "left" },
    content: [
      { type: "text", text: "Hello " },
      { type: "text", text: "{{userName}}" },
      { type: "text", text: ", welcome to the variable rendering test." },
    ],
    uniqueText: "welcome to the variable rendering",
  },

  // ── Frame / Styling ───────────────────────────────────────────────
  {
    name: "custom-padding",
    attrs: { textAlign: "left", paddingVertical: 20, paddingHorizontal: 30 },
    content: [{ type: "text", text: "Paragraph with custom padding values applied for spacing test." }],
    uniqueText: "custom padding values applied",
  },
  {
    name: "background-color",
    attrs: { textAlign: "left", backgroundColor: "#FEF3C7" },
    content: [{ type: "text", text: "Paragraph with yellow background color for visual styling check." }],
    uniqueText: "yellow background color for",
  },
  {
    name: "border",
    attrs: { textAlign: "left", borderWidth: 2, borderColor: "#EF4444" },
    content: [{ type: "text", text: "Paragraph with red border for border rendering verification." }],
    uniqueText: "red border for border rendering",
  },

  // ── Combinations ──────────────────────────────────────────────────
  {
    name: "combo-styled",
    attrs: {
      textAlign: "center",
      paddingVertical: 16,
      paddingHorizontal: 24,
      backgroundColor: "#EFF6FF",
      borderWidth: 1,
      borderColor: "#3B82F6",
    },
    content: [
      { type: "text", text: "Styled combo: " },
      { type: "text", text: "centered bold", marks: [{ type: "bold" }] },
      { type: "text", text: " with padding, background, and border." },
    ],
    uniqueText: "Styled combo: centered bold",
  },
  {
    name: "multiline-formatted",
    attrs: { textAlign: "left" },
    content: [
      { type: "text", text: "First line with " },
      { type: "text", text: "bold", marks: [{ type: "bold" }] },
      { type: "text", text: " then " },
      { type: "text", text: "italic", marks: [{ type: "italic" }] },
      { type: "text", text: " then " },
      {
        type: "text",
        text: "a link",
        marks: [{ type: "link", attrs: { href: "https://example.com", target: "_blank" } }],
      },
      { type: "text", text: " all in the multiline formatted test paragraph." },
    ],
    uniqueText: "multiline formatted test paragraph",
  },
];

// ═══════════════════════════════════════════════════════════════════════
// Test
// ═══════════════════════════════════════════════════════════════════════

const ARTIFACTS_DIR = path.resolve(
  __dirname,
  "../../test-results/paragraph-visual"
);

test.describe("Paragraph Visual Parity: Designer vs Rendered Email", () => {
  test.skip(
    !COURIER_AUTH_TOKEN,
    "COURIER_AUTH_TOKEN not set – skipping paragraph visual test"
  );

  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    fs.rmSync(ARTIFACTS_DIR, { recursive: true, force: true });
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

    await loadDesignerEditor(page);
    await resetEditor(page);
  });

  test("all paragraph variants visual parity", async ({
    page,
    request,
    browser,
  }, testInfo) => {
    // ─── Step 1: Insert all paragraph variants ────────────────────────
    console.log(`Step 1: Inserting ${VARIANTS.length} paragraph variants...`);

    await page.evaluate((variants) => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!ed) throw new Error("Editor not available");

      ed.commands.clearContent();

      for (const v of variants) {
        ed.commands.insertContent({
          type: "paragraph",
          attrs: v.attrs,
          content: v.content,
        });
      }
    }, VARIANTS);

    await page.waitForTimeout(800);
    console.log(`  ✓ ${VARIANTS.length} paragraphs inserted`);

    // ─── Step 2: Preview mode + screenshot each element ──────────────
    console.log("Step 2: Designer element screenshots (preview mode)...");

    const previewEditor = await enterPreviewMode(page);
    await expect(previewEditor).toBeVisible({ timeout: 5000 });

    // Screenshot each variant by locating its unique text
    const designerShots: Map<string, Buffer | null> = new Map();
    for (const v of VARIANTS) {
      const locator = previewEditor
        .locator(`p:has-text("${v.uniqueText}")`)
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

    // Normalize backgrounds (but preserve element-level backgrounds for
    // the background-color variant — we only clear the wrapper/body bg)
    await emailPage.evaluate(() => {
      // Clear only top-level wrapper backgrounds, not content cells
      const wrapperTags = ["BODY", "HTML", "TABLE"];
      document.querySelectorAll("*").forEach((el) => {
        const tag = el.tagName;
        if (wrapperTags.includes(tag)) {
          (el as HTMLElement).style.backgroundColor = "white";
          (el as HTMLElement).style.background = "white";
        }
      });
      // Also clear the outermost TD backgrounds that are brand wrappers
      document.querySelectorAll("body > table td, body > div > table td").forEach((el) => {
        (el as HTMLElement).style.backgroundColor = "white";
        (el as HTMLElement).style.background = "white";
      });
      document.querySelectorAll(".header, .footer").forEach((el) => {
        (el as HTMLElement).style.display = "none";
      });
    });
    await emailPage.waitForTimeout(300);

    const fullEmailShot = await emailPage.screenshot({ fullPage: true });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "rendered-email-full.png"), fullEmailShot);

    // Screenshot each variant by locating its unique text in the rendered HTML
    const emailShots: Map<string, Buffer | null> = new Map();
    for (const v of VARIANTS) {
      // In rendered email, text may be in <div>, <td>, <p>, or nested elements.
      // Use a broad text-based locator and pick the tightest visible match.
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

    const results = await compareElementPairs(pairs, ARTIFACTS_DIR, "Paragraph");

    printResultsSummary(results, MAX_DIFF_PERCENT, ARTIFACTS_DIR);
    await attachFailedResults(results, testInfo);
    saveResultsJson(results, "paragraph");

    // Assert each variant individually so failures are specific
    for (const r of results) {
      expect(
        r.diffPercent,
        `${r.name}: visual difference ${r.diffPercent.toFixed(1)}% exceeds ${MAX_DIFF_PERCENT}%. ` +
        `See diff-${r.name}.png for details.`
      ).toBeLessThanOrEqual(MAX_DIFF_PERCENT);
    }

    console.log("\n✅ Paragraph visual parity test complete!");
  });
});
