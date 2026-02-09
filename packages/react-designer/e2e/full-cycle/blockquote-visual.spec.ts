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
// Note: insertBlockquote helper is not used here because blockquotes
// must be set via setContent to avoid cursor-nesting issues.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════
// Blockquote Variant Definitions
// ═══════════════════════════════════════════════════════════════════════

interface BlockquoteVariant {
  name: string;
  /** Unique text used to identify this variant in both Designer and email */
  uniqueText: string;
  /** Attributes to set on the blockquote node */
  attrs: Record<string, unknown>;
  /** Optional inline marks to apply to the text (bold, italic, etc.) */
  marks?: Array<{ type: string }>;
  /** CSS properties the email must have (checked structurally, not pixel) */
  expectedStyles?: StyleProperty[];
}

const VARIANTS: BlockquoteVariant[] = [
  // ── Defaults ──────────────────────────────────────────────────────
  {
    name: "default",
    uniqueText: "Default blockquote text",
    attrs: {},
  },

  // ── Border Colors ─────────────────────────────────────────────────
  {
    name: "red-border",
    uniqueText: "Red bordered quote",
    attrs: { borderColor: "#EF4444" },
    expectedStyles: ["border"],
  },
  {
    name: "blue-border",
    uniqueText: "Blue bordered quote",
    attrs: { borderColor: "#3B82F6" },
    expectedStyles: ["border"],
  },
  {
    name: "green-border",
    uniqueText: "Green bordered quote",
    attrs: { borderColor: "#10B981" },
    expectedStyles: ["border"],
  },

  // ── Border Width ──────────────────────────────────────────────────
  {
    name: "thick-border",
    uniqueText: "Thick border quote",
    attrs: { borderLeftWidth: 8 },
    expectedStyles: ["border"],
  },
  {
    name: "thin-border",
    uniqueText: "Thin border quote",
    attrs: { borderLeftWidth: 1 },
    expectedStyles: ["border"],
  },
  {
    name: "no-border",
    uniqueText: "No border quote",
    attrs: { borderLeftWidth: 0 },
  },

  // ── Padding ───────────────────────────────────────────────────────
  {
    name: "large-padding",
    uniqueText: "Large padding quote",
    attrs: { paddingHorizontal: 24, paddingVertical: 20 },
  },
  {
    name: "small-padding",
    uniqueText: "Small padding quote",
    attrs: { paddingHorizontal: 2, paddingVertical: 2 },
  },

  // ── Background Color ──────────────────────────────────────────────
  {
    name: "gray-background",
    uniqueText: "Gray background quote",
    attrs: { backgroundColor: "#F3F4F6" },
    expectedStyles: ["background"],
  },
  {
    name: "yellow-background",
    uniqueText: "Yellow background quote",
    attrs: { backgroundColor: "#FEF3C7" },
    expectedStyles: ["background"],
  },

  // ── Text Formatting ───────────────────────────────────────────────
  {
    name: "bold-text",
    uniqueText: "Bold blockquote text",
    attrs: {},
    marks: [{ type: "bold" }],
    expectedStyles: ["bold"],
  },
  {
    name: "italic-text",
    uniqueText: "Italic blockquote text",
    attrs: {},
    marks: [{ type: "italic" }],
    expectedStyles: ["italic"],
  },

  // ── Combinations ──────────────────────────────────────────────────
  {
    name: "combo-styled",
    uniqueText: "Styled combo quote",
    attrs: {
      borderColor: "#7C3AED",
      borderLeftWidth: 6,
      backgroundColor: "#F5F3FF",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    expectedStyles: ["border", "background"],
  },
  {
    name: "combo-bold-colored",
    uniqueText: "Bold colored quote",
    attrs: {
      borderColor: "#DC2626",
      borderLeftWidth: 5,
      backgroundColor: "#FEF2F2",
    },
    marks: [{ type: "bold" }],
    expectedStyles: ["border", "background", "bold"],
  },
];

// ═══════════════════════════════════════════════════════════════════════
// Test
// ═══════════════════════════════════════════════════════════════════════

const ARTIFACTS_DIR = path.resolve(
  __dirname,
  "../../test-results/blockquote-visual"
);

test.describe("Blockquote Visual Parity: Designer vs Rendered Email", () => {
  test.skip(
    !COURIER_AUTH_TOKEN,
    "COURIER_AUTH_TOKEN not set – skipping blockquote visual test"
  );

  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    fs.rmSync(ARTIFACTS_DIR, { recursive: true, force: true });
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

    await loadDesignerEditor(page);
    await resetEditor(page);
  });

  test("all blockquote variants visual parity", async ({
    page,
    request,
    browser,
  }, testInfo) => {
    // ─── Step 1: Insert all blockquote variants ──────────────────────
    // Blockquotes must be inserted as a single document to avoid cursor
    // nesting issues (focus("end") inside a blockquote causes the next
    // insertContent to land inside the same blockquote). We use
    // setContent to build the full document at once, with paragraph
    // separators between each blockquote.
    console.log(`Step 1: Inserting ${VARIANTS.length} blockquote variants...`);

    const defaultAttrs = {
      paddingHorizontal: 8,
      paddingVertical: 6,
      backgroundColor: "transparent",
      borderLeftWidth: 4,
      borderColor: "#e0e0e0",
    };

    const docContent = VARIANTS.flatMap((v) => {
      const textNode: Record<string, unknown> = {
        type: "text",
        text: v.uniqueText,
      };
      if (v.marks && v.marks.length > 0) {
        textNode.marks = v.marks;
      }
      return [
        {
          type: "blockquote",
          attrs: { ...defaultAttrs, ...v.attrs },
          content: [
            {
              type: "paragraph",
              content: [textNode],
            },
          ],
        },
        { type: "paragraph" }, // Separator to prevent merging
      ];
    });

    await page.evaluate((content) => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!ed) throw new Error("Editor not available");
      ed.commands.setContent({ type: "doc", content });
    }, docContent);

    await page.waitForTimeout(500);
    console.log(`  ✓ ${VARIANTS.length} blockquotes inserted via setContent`);

    // ─── Step 2: Preview mode + screenshot each element ──────────────
    // Blockquotes have unique text, so use text-based locators.
    console.log("Step 2: Designer element screenshots (preview mode)...");

    const previewEditor = await enterPreviewMode(page);
    await expect(previewEditor).toBeVisible({ timeout: 5000 });

    const designerShots: Map<string, Buffer | null> = new Map();
    for (const v of VARIANTS) {
      // The blockquote wrapper contains a .node-element div; find
      // the one whose descendant text includes our unique string.
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
    // Must run on raw HTML — normalization strips backgrounds/borders.
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
    // Normalize email page: white backgrounds but preserve blockquote
    // border-left styling which is the core visual element.
    console.log("\nStep 5b: Normalizing email and taking screenshots...");
    await emailPage.evaluate(() => {
      document.querySelectorAll("*").forEach((el) => {
        const tag = el.tagName;
        const htmlEl = el as HTMLElement;
        if (tag === "A") return;
        // Preserve elements with explicit border-left (blockquote lines)
        const inlineStyle = htmlEl.getAttribute("style") || "";
        if (inlineStyle.includes("border-left")) return;
        // Preserve blockquote background colors
        if (htmlEl.closest('[class*="block-quote"]')) return;
        htmlEl.style.backgroundColor = "white";
        htmlEl.style.background = "white";
      });
      // Hide brand header/footer
      document.querySelectorAll(".header, .footer, .blue-footer").forEach(
        (el) => {
          (el as HTMLElement).style.display = "none";
        }
      );
    });
    await emailPage.waitForTimeout(300);

    const fullEmailShot = await emailPage.screenshot({ fullPage: true });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "rendered-email-full.png"),
      fullEmailShot
    );

    // Debug: detect blockquote elements in the email HTML
    const debug = await emailPage.evaluate(() => {
      const blockquoteEls = document.querySelectorAll("blockquote");
      const quoteClassEls = document.querySelectorAll(
        '[class*="block-quote"], [class*="c--block-quote"]'
      );
      const borderLeftEls = document.querySelectorAll(
        '[style*="border-left"]'
      );
      return {
        blockquoteCount: blockquoteEls.length,
        quoteClassCount: quoteClassEls.length,
        borderLeftCount: borderLeftEls.length,
        sampleBlockquote:
          blockquoteEls[0]?.outerHTML?.substring(0, 300) || "(none)",
        sampleQuoteClass:
          quoteClassEls[0]?.outerHTML?.substring(0, 300) || "(none)",
        sampleBorderLeft:
          borderLeftEls[0]?.outerHTML?.substring(0, 300) || "(none)",
      };
    });
    console.log(
      "  Email blockquote debug:",
      JSON.stringify(debug, null, 2)
    );

    // Screenshot email blockquotes by finding the element containing unique text
    const emailShots: Map<string, Buffer | null> = new Map();
    for (const v of VARIANTS) {
      // Try multiple strategies to find the blockquote element in email:
      // 1. A <blockquote> ancestor of the text
      // 2. A div.c--block-quote ancestor
      // 3. An element with border-left that contains the text
      // 4. Fallback: the text element's closest table cell
      const shot = await emailPage.evaluate(
        ({ text }) => {
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode: (node) =>
                node.textContent?.includes(text)
                  ? NodeFilter.FILTER_ACCEPT
                  : NodeFilter.FILTER_REJECT,
            }
          );
          const textNode = walker.nextNode();
          if (!textNode?.parentElement) return null;

          // Walk up to find the best container for screenshotting
          const el = textNode.parentElement;
          const blockquote = el.closest("blockquote");
          const quoteBlock = el.closest(
            '[class*="block-quote"], [class*="c--block-quote"]'
          );
          // Find nearest element with border-left
          let borderLeftEl: HTMLElement | null = null;
          let current: HTMLElement | null = el;
          while (current && current !== document.body) {
            const style = current.getAttribute("style") || "";
            if (style.includes("border-left")) {
              borderLeftEl = current;
              break;
            }
            current = current.parentElement;
          }

          // Return which selector strategy worked (for logging)
          if (blockquote) return "blockquote";
          if (quoteBlock) return "quoteBlock";
          if (borderLeftEl) return "borderLeft";
          return "td";
        },
        { text: v.uniqueText }
      );
      console.log(
        `  ${v.name}: email element strategy = ${shot || "not found"}`
      );

      // Now screenshot the actual element using the best strategy
      let locator;
      if (shot === "blockquote") {
        locator = emailPage
          .locator(`blockquote:has-text("${v.uniqueText}")`)
          .first();
      } else if (shot === "quoteBlock") {
        locator = emailPage
          .locator(
            `[class*="block-quote"]:has-text("${v.uniqueText}"), [class*="c--block-quote"]:has-text("${v.uniqueText}")`
          )
          .first();
      } else if (shot === "borderLeft") {
        // Find the element with border-left that contains this text
        locator = emailPage
          .locator(`[style*="border-left"]:has-text("${v.uniqueText}")`)
          .first();
      } else {
        // Fallback: find the text and screenshot its closest table cell
        locator = emailPage
          .locator(`td:has-text("${v.uniqueText}")`)
          .first();
      }

      const emailShot = await screenshotElement(
        locator,
        `email-${v.name}`,
        ARTIFACTS_DIR
      );
      emailShots.set(v.name, emailShot);
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
      "Blockquote"
    );

    printResultsSummary(results, MAX_DIFF_PERCENT, ARTIFACTS_DIR);
    await attachFailedResults(results, testInfo);
    saveResultsJson(results, "blockquote");

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

    console.log("\n✅ Blockquote visual parity test complete!");
  });
});
