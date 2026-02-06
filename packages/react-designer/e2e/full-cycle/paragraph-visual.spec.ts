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
import {
  typeText,
  pressEnter,
  toggleBold,
  toggleItalic,
  toggleUnderline,
  toggleStrike,
  setAlignment,
  insertVariable,
  applyLink,
  setBlockAttrs,
  moveCursorToEnd,
} from "./ui-helpers";
import type { Page } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════
// Paragraph Variant Definitions (UI-driven)
// ═══════════════════════════════════════════════════════════════════════

interface ParagraphVariant {
  name: string;
  uniqueText: string;
  /** Create this paragraph via UI actions (typing, shortcuts, etc.) */
  setup: (page: Page) => Promise<void>;
  /** Optional: frame styling attrs to apply programmatically after UI setup */
  frameAttrs?: Record<string, unknown>;
}

const VARIANTS: ParagraphVariant[] = [
  // ── Alignment ───────────────────────────────────────────────────────
  {
    name: "align-left",
    uniqueText: "Left aligned plain text",
    setup: async (page) => {
      await typeText(page, "Left aligned plain text paragraph for visual parity check.");
    },
  },
  {
    name: "align-center",
    uniqueText: "Center aligned paragraph",
    setup: async (page) => {
      await setAlignment(page, "center");
      await typeText(page, "Center aligned paragraph used for testing alignment rendering.");
    },
  },
  {
    name: "align-right",
    uniqueText: "Right aligned paragraph",
    setup: async (page) => {
      await setAlignment(page, "right");
      await typeText(page, "Right aligned paragraph to verify text positioning in email.");
    },
  },
  {
    name: "align-justify",
    uniqueText: "Justified paragraph with enough",
    setup: async (page) => {
      await setAlignment(page, "justify");
      await typeText(
        page,
        "Justified paragraph with enough words to demonstrate full justification across the entire width of the content area."
      );
    },
  },

  // ── Inline Formatting ──────────────────────────────────────────────
  {
    name: "bold",
    uniqueText: "bold text inside it for",
    setup: async (page) => {
      await typeText(page, "This paragraph has ");
      await toggleBold(page);
      await typeText(page, "bold text");
      await toggleBold(page);
      await typeText(page, " inside it for formatting check.");
    },
  },
  {
    name: "italic",
    uniqueText: "italic text inside it for",
    setup: async (page) => {
      await typeText(page, "This paragraph has ");
      await toggleItalic(page);
      await typeText(page, "italic text");
      await toggleItalic(page);
      await typeText(page, " inside it for style verification.");
    },
  },
  {
    name: "mixed-formatting",
    uniqueText: "Mixed: bold and italic",
    setup: async (page) => {
      await typeText(page, "Mixed: ");
      await toggleBold(page);
      await typeText(page, "bold");
      await toggleBold(page);
      await typeText(page, " and ");
      await toggleItalic(page);
      await typeText(page, "italic");
      await toggleItalic(page);
      await typeText(page, " and ");
      await toggleUnderline(page);
      await typeText(page, "underline");
      await toggleUnderline(page);
      await typeText(page, " and ");
      await toggleStrike(page);
      await typeText(page, "strike");
      await toggleStrike(page);
      await typeText(page, " together in one line.");
    },
  },
  {
    name: "link",
    uniqueText: "clickable link embedded for",
    setup: async (page) => {
      await typeText(page, "Paragraph with a ");
      const linkText = "clickable link";
      await typeText(page, linkText);
      await applyLink(page, linkText.length, "https://example.com");
      await typeText(page, " embedded for link rendering test.");
    },
  },

  // ── Variables ──────────────────────────────────────────────────────
  {
    name: "variable",
    uniqueText: "welcome to the variable rendering",
    setup: async (page) => {
      await typeText(page, "Hello ");
      await insertVariable(page, "userName");
      await typeText(page, ", welcome to the variable rendering test.");
    },
  },

  // ── Frame / Styling (UI text + programmatic frame attrs) ──────────
  {
    name: "custom-padding",
    uniqueText: "custom padding values applied",
    setup: async (page) => {
      await typeText(page, "Paragraph with custom padding values applied for spacing test.");
    },
    frameAttrs: { paddingVertical: 20, paddingHorizontal: 30 },
  },
  {
    name: "background-color",
    uniqueText: "yellow background color for",
    setup: async (page) => {
      await typeText(page, "Paragraph with yellow background color for visual styling check.");
    },
    frameAttrs: { backgroundColor: "#FEF3C7" },
  },
  {
    name: "border",
    uniqueText: "red border for border rendering",
    setup: async (page) => {
      await typeText(page, "Paragraph with red border for border rendering verification.");
    },
    frameAttrs: { borderWidth: 2, borderColor: "#EF4444" },
  },

  // ── Combinations ──────────────────────────────────────────────────
  {
    name: "combo-styled",
    uniqueText: "Styled combo: centered bold",
    setup: async (page) => {
      await setAlignment(page, "center");
      await typeText(page, "Styled combo: ");
      await toggleBold(page);
      await typeText(page, "centered bold");
      await toggleBold(page);
      await typeText(page, " with padding, background, and border.");
    },
    frameAttrs: {
      paddingVertical: 16,
      paddingHorizontal: 24,
      backgroundColor: "#EFF6FF",
      borderWidth: 1,
      borderColor: "#3B82F6",
    },
  },
  {
    name: "multiline-formatted",
    uniqueText: "multiline formatted test paragraph",
    setup: async (page) => {
      await typeText(page, "First line with ");
      await toggleBold(page);
      await typeText(page, "bold");
      await toggleBold(page);
      await typeText(page, " then ");
      await toggleItalic(page);
      await typeText(page, "italic");
      await toggleItalic(page);
      await typeText(page, " then ");
      const linkText = "a link";
      await typeText(page, linkText);
      await applyLink(page, linkText.length, "https://example.com");
      await typeText(page, " all in the multiline formatted test paragraph.");
    },
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
    // ─── Step 1: Create all paragraph variants via UI ─────────────────
    console.log(`Step 1: Creating ${VARIANTS.length} paragraph variants via UI...`);

    // Focus editor
    await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      ed?.commands.focus("end");
    });
    await page.waitForTimeout(200);

    for (let i = 0; i < VARIANTS.length; i++) {
      const v = VARIANTS[i];
      console.log(`  Creating: ${v.name}`);
      await v.setup(page);

      // Press Enter to create a new paragraph for the next variant
      // (skip for the last one)
      if (i < VARIANTS.length - 1) {
        await pressEnter(page);
      }
    }

    // Apply frame styling attrs where needed
    for (const v of VARIANTS) {
      if (v.frameAttrs) {
        await setBlockAttrs(page, v.uniqueText, v.frameAttrs);
      }
    }

    await page.waitForTimeout(500);
    console.log(`  ✓ ${VARIANTS.length} paragraphs created via UI`);

    // ─── Step 2: Preview mode + screenshot each element ──────────────
    console.log("Step 2: Designer element screenshots (preview mode)...");

    const previewEditor = await enterPreviewMode(page);
    await expect(previewEditor).toBeVisible({ timeout: 5000 });

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

    await emailPage.evaluate(() => {
      const wrapperTags = ["BODY", "HTML", "TABLE"];
      document.querySelectorAll("*").forEach((el) => {
        if (wrapperTags.includes(el.tagName)) {
          (el as HTMLElement).style.backgroundColor = "white";
          (el as HTMLElement).style.background = "white";
        }
      });
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

    const emailShots: Map<string, Buffer | null> = new Map();
    for (const v of VARIANTS) {
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
