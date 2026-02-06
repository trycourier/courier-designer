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
// Button Variant Definitions
// ═══════════════════════════════════════════════════════════════════════

interface ButtonVariant {
  name: string;
  attrs: Record<string, unknown>;
  content: Array<{ type: string; text: string }>;
  uniqueText: string;
}

const VARIANTS: ButtonVariant[] = [
  // ── Alignment ──────────────────────────────────────────────────────
  {
    name: "center-default",
    attrs: {
      label: "Center Default Button",
      link: "https://example.com",
      alignment: "center",
      backgroundColor: "#0085FF",
      padding: 6,
      borderRadius: 0,
    },
    content: [{ type: "text", text: "Center Default Button" }],
    uniqueText: "Center Default Button",
  },
  {
    name: "left-aligned",
    attrs: {
      label: "Left Aligned Button",
      link: "https://example.com",
      alignment: "left",
      backgroundColor: "#0085FF",
      padding: 6,
      borderRadius: 0,
    },
    content: [{ type: "text", text: "Left Aligned Button" }],
    uniqueText: "Left Aligned Button",
  },
  {
    name: "right-aligned",
    attrs: {
      label: "Right Aligned Button",
      link: "https://example.com",
      alignment: "right",
      backgroundColor: "#0085FF",
      padding: 6,
      borderRadius: 0,
    },
    content: [{ type: "text", text: "Right Aligned Button" }],
    uniqueText: "Right Aligned Button",
  },

  // ── Colors ─────────────────────────────────────────────────────────
  {
    name: "purple-bg",
    attrs: {
      label: "Purple Background Button",
      link: "https://example.com",
      alignment: "center",
      backgroundColor: "#7C3AED",
      textColor: "#ffffff",
      padding: 6,
      borderRadius: 0,
    },
    content: [{ type: "text", text: "Purple Background Button" }],
    uniqueText: "Purple Background Button",
  },
  {
    name: "green-bg",
    attrs: {
      label: "Green Background Button",
      link: "https://example.com",
      alignment: "center",
      backgroundColor: "#059669",
      textColor: "#ffffff",
      padding: 6,
      borderRadius: 0,
    },
    content: [{ type: "text", text: "Green Background Button" }],
    uniqueText: "Green Background Button",
  },
  {
    name: "dark-text-light-bg",
    attrs: {
      label: "Dark Text Light Background",
      link: "https://example.com",
      alignment: "center",
      backgroundColor: "#FEF3C7",
      textColor: "#92400E",
      padding: 6,
      borderRadius: 0,
    },
    content: [{ type: "text", text: "Dark Text Light Background" }],
    uniqueText: "Dark Text Light Background",
  },

  // ── Padding ────────────────────────────────────────────────────────
  {
    name: "small-padding",
    attrs: {
      label: "Small Padding Button",
      link: "https://example.com",
      alignment: "center",
      backgroundColor: "#0085FF",
      padding: 4,
      borderRadius: 0,
    },
    content: [{ type: "text", text: "Small Padding Button" }],
    uniqueText: "Small Padding Button",
  },
  {
    name: "large-padding",
    attrs: {
      label: "Large Padding Button",
      link: "https://example.com",
      alignment: "center",
      backgroundColor: "#0085FF",
      padding: 16,
      borderRadius: 0,
    },
    content: [{ type: "text", text: "Large Padding Button" }],
    uniqueText: "Large Padding Button",
  },

  // ── Border Radius ──────────────────────────────────────────────────
  {
    name: "rounded-small",
    attrs: {
      label: "Small Rounded Button",
      link: "https://example.com",
      alignment: "center",
      backgroundColor: "#0085FF",
      padding: 8,
      borderRadius: 4,
    },
    content: [{ type: "text", text: "Small Rounded Button" }],
    uniqueText: "Small Rounded Button",
  },
  {
    name: "rounded-large",
    attrs: {
      label: "Large Rounded Button",
      link: "https://example.com",
      alignment: "center",
      backgroundColor: "#0085FF",
      padding: 8,
      borderRadius: 20,
    },
    content: [{ type: "text", text: "Large Rounded Button" }],
    uniqueText: "Large Rounded Button",
  },
  {
    name: "pill-shape",
    attrs: {
      label: "Pill Shape Button",
      link: "https://example.com",
      alignment: "center",
      backgroundColor: "#7C3AED",
      padding: 10,
      borderRadius: 50,
    },
    content: [{ type: "text", text: "Pill Shape Button" }],
    uniqueText: "Pill Shape Button",
  },

  // ── Typography ─────────────────────────────────────────────────────
  {
    name: "bold-text",
    attrs: {
      label: "Bold Text Button",
      link: "https://example.com",
      alignment: "center",
      backgroundColor: "#0085FF",
      padding: 8,
      borderRadius: 4,
      fontWeight: "bold",
    },
    content: [{ type: "text", text: "Bold Text Button" }],
    uniqueText: "Bold Text Button",
  },
  {
    name: "italic-text",
    attrs: {
      label: "Italic Text Button",
      link: "https://example.com",
      alignment: "center",
      backgroundColor: "#0085FF",
      padding: 8,
      borderRadius: 4,
      fontStyle: "italic",
    },
    content: [{ type: "text", text: "Italic Text Button" }],
    uniqueText: "Italic Text Button",
  },

  // ── Combinations ──────────────────────────────────────────────────
  {
    name: "combo-styled",
    attrs: {
      label: "Full Combo Styled Button",
      link: "https://example.com",
      alignment: "center",
      backgroundColor: "#DC2626",
      textColor: "#ffffff",
      padding: 14,
      borderRadius: 8,
      fontWeight: "bold",
    },
    content: [{ type: "text", text: "Full Combo Styled Button" }],
    uniqueText: "Full Combo Styled Button",
  },
  {
    name: "combo-left-pill",
    attrs: {
      label: "Left Pill Combo Button",
      link: "https://example.com",
      alignment: "left",
      backgroundColor: "#059669",
      textColor: "#ffffff",
      padding: 12,
      borderRadius: 40,
      fontWeight: "bold",
    },
    content: [{ type: "text", text: "Left Pill Combo Button" }],
    uniqueText: "Left Pill Combo Button",
  },
  {
    name: "long-label",
    attrs: {
      label: "This Is A Longer Button Label For Wrapping Test",
      link: "https://example.com",
      alignment: "center",
      backgroundColor: "#4F46E5",
      textColor: "#ffffff",
      padding: 10,
      borderRadius: 6,
    },
    content: [{ type: "text", text: "This Is A Longer Button Label For Wrapping Test" }],
    uniqueText: "Longer Button Label For Wrapping",
  },
];

// ═══════════════════════════════════════════════════════════════════════
// Test
// ═══════════════════════════════════════════════════════════════════════

const ARTIFACTS_DIR = path.resolve(
  __dirname,
  "../../test-results/button-visual"
);

test.describe("Button Visual Parity: Designer vs Rendered Email", () => {
  test.skip(
    !COURIER_AUTH_TOKEN,
    "COURIER_AUTH_TOKEN not set – skipping button visual test"
  );

  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    fs.rmSync(ARTIFACTS_DIR, { recursive: true, force: true });
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

    await loadDesignerEditor(page);
    await resetEditor(page);
  });

  test("all button variants visual parity", async ({
    page,
    request,
    browser,
  }, testInfo) => {
    // ─── Step 1: Insert all button variants ───────────────────────────
    console.log(`Step 1: Inserting ${VARIANTS.length} button variants...`);

    await page.evaluate((variants) => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!ed) throw new Error("Editor not available");

      ed.commands.clearContent();

      for (const v of variants) {
        ed.commands.insertContent({
          type: "button",
          attrs: v.attrs,
          content: v.content,
        });
      }
    }, VARIANTS);

    await page.waitForTimeout(800);
    console.log(`  ✓ ${VARIANTS.length} buttons inserted`);

    // ─── Step 2: Preview mode + screenshot each element ──────────────
    console.log("Step 2: Designer element screenshots (preview mode)...");

    const previewEditor = await enterPreviewMode(page);
    await expect(previewEditor).toBeVisible({ timeout: 5000 });

    const designerShots: Map<string, Buffer | null> = new Map();
    for (const v of VARIANTS) {
      // Buttons render as .courier-inline-flex in the Designer
      // Use the container div that holds the button with matching text
      const locator = previewEditor
        .locator(`div:has(.courier-inline-flex:has-text("${v.uniqueText}"))`)
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

    const emailPage = await browser.newPage({ viewport: { width: 700, height: 3000 } });
    await emailPage.setContent(renderedHtml!, { waitUntil: "networkidle" });
    await emailPage.waitForTimeout(500);

    await normalizeEmailPage(emailPage);

    const fullEmailShot = await emailPage.screenshot({ fullPage: true });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "rendered-email-full.png"), fullEmailShot);

    const emailShots: Map<string, Buffer | null> = new Map();
    for (const v of VARIANTS) {
      // In rendered email, buttons are <a> tags or wrapped in <td>
      // Use the <a> tag with matching text for the tightest match
      const locator = emailPage
        .locator(`a:has-text("${v.uniqueText}")`)
        .first();
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

    const results = await compareElementPairs(pairs, ARTIFACTS_DIR, "Button");

    printResultsSummary(results, MAX_DIFF_PERCENT, ARTIFACTS_DIR);
    await attachFailedResults(results, testInfo);
    saveResultsJson(results, "button");

    for (const r of results) {
      expect(
        r.diffPercent,
        `${r.name}: visual difference ${r.diffPercent.toFixed(1)}% exceeds ${MAX_DIFF_PERCENT}%. ` +
        `See diff-${r.name}.png for details.`
      ).toBeLessThanOrEqual(MAX_DIFF_PERCENT);
    }

    console.log("\n✅ Button visual parity test complete!");
  });
});
