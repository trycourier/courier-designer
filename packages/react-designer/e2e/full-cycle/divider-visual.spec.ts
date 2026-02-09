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
import { insertDivider } from "./ui-helpers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════
// Divider Variant Definitions
// ═══════════════════════════════════════════════════════════════════════

interface DividerVariant {
  name: string;
  attrs: Record<string, unknown>;
}

const VARIANTS: DividerVariant[] = [
  // ── Defaults ──────────────────────────────────────────────────────
  {
    name: "default",
    attrs: {},
  },

  // ── Colors ────────────────────────────────────────────────────────
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

  // ── Thickness (size) ──────────────────────────────────────────────
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

  // ── Padding ───────────────────────────────────────────────────────
  {
    name: "small-padding",
    attrs: { padding: 2 },
  },
  {
    name: "large-padding",
    attrs: { padding: 20 },
  },

  // ── Border Radius ─────────────────────────────────────────────────
  {
    name: "rounded",
    attrs: { size: 4, radius: 4 },
  },
  {
    name: "pill",
    attrs: { size: 6, radius: 10, color: "#7C3AED" },
  },

  // ── Spacer variant ────────────────────────────────────────────────
  {
    name: "spacer-default",
    attrs: { variant: "spacer", color: "transparent", padding: 24 },
  },
  {
    name: "spacer-small",
    attrs: { variant: "spacer", color: "transparent", padding: 8 },
  },

  // ── Combinations ──────────────────────────────────────────────────
  {
    name: "combo-colored-thick",
    attrs: { color: "#059669", size: 4, padding: 12 },
  },
  {
    name: "combo-styled",
    attrs: { color: "#DC2626", size: 3, padding: 16, radius: 6 },
  },
];

// ═══════════════════════════════════════════════════════════════════════
// Test
// ═══════════════════════════════════════════════════════════════════════

const ARTIFACTS_DIR = path.resolve(
  __dirname,
  "../../test-results/divider-visual"
);

test.describe("Divider Visual Parity: Designer vs Rendered Email", () => {
  test.skip(
    !COURIER_AUTH_TOKEN,
    "COURIER_AUTH_TOKEN not set – skipping divider visual test"
  );

  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    fs.rmSync(ARTIFACTS_DIR, { recursive: true, force: true });
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

    await loadDesignerEditor(page);
    await resetEditor(page);
  });

  test("all divider variants visual parity", async ({
    page,
    request,
    browser,
  }, testInfo) => {
    // ─── Step 1: Insert all divider variants programmatically ────────
    // Dividers have no text content — they are purely visual elements
    // configured through attributes. Programmatic insertion is the only
    // practical approach (no typing involved).
    console.log(`Step 1: Inserting ${VARIANTS.length} divider variants...`);

    for (const v of VARIANTS) {
      console.log(`  Inserting: ${v.name}`);
      await insertDivider(page, v.attrs);
    }

    await page.waitForTimeout(500);
    console.log(`  ✓ ${VARIANTS.length} dividers inserted`);

    // ─── Step 2: Preview mode + screenshot each element ──────────────
    // Dividers don't have text content, so we identify them by index.
    // The nth <hr> wrapper in the editor corresponds to the nth variant.
    console.log("Step 2: Designer element screenshots (preview mode)...");

    const previewEditor = await enterPreviewMode(page);
    await expect(previewEditor).toBeVisible({ timeout: 5000 });

    const designerShots: Map<string, Buffer | null> = new Map();
    for (let i = 0; i < VARIANTS.length; i++) {
      const v = VARIANTS[i];
      // Screenshot the wrapper div containing the <hr>, which captures
      // both the line and its padding (margin) above/below.
      const locator = previewEditor
        .locator(".node-element:has(hr)")
        .nth(i);
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

    const emailPage = await browser.newPage({ viewport: { width: 700, height: 4000 } });
    await emailPage.setContent(renderedHtml!, { waitUntil: "networkidle" });
    await emailPage.waitForTimeout(500);

    // Normalize backgrounds to white, but preserve divider-related styling.
    // Email dividers are rendered as <p style="border-top:solid Npx #color">.
    await emailPage.evaluate(() => {
      document.querySelectorAll("*").forEach((el) => {
        const tag = el.tagName;
        const htmlEl = el as HTMLElement;
        // Preserve links and elements whose border-top IS the divider line
        if (tag === "A") return;
        const inlineStyle = htmlEl.getAttribute("style") || "";
        if (inlineStyle.includes("border-top")) return;
        htmlEl.style.backgroundColor = "white";
        htmlEl.style.background = "white";
      });
      // Hide brand header/footer
      document.querySelectorAll(".header, .footer, .blue-footer").forEach((el) => {
        (el as HTMLElement).style.display = "none";
      });
    });
    await emailPage.waitForTimeout(300);

    const fullEmailShot = await emailPage.screenshot({ fullPage: true });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "rendered-email-full.png"), fullEmailShot);

    // Courier's backend renders dividers inside div.c--block-divider containers.
    // Each block contains a <p style="border-top:solid Npx #color"> for the line
    // and a parent <td> with vertical padding.
    const emailDividerSelector = "div.c--block-divider";
    const emailDividerCount = await emailPage.locator(emailDividerSelector).count();
    console.log(`  Found ${emailDividerCount} email divider blocks (div.c--block-divider)`);

    // Debug: log each divider block's structure
    if (emailDividerCount > 0) {
      for (let i = 0; i < Math.min(emailDividerCount, 3); i++) {
        const sample = await emailPage.locator(emailDividerSelector).nth(i)
          .evaluate((el) => el.innerHTML.substring(0, 300));
        console.log(`  Sample divider ${i}: ${sample}`);
      }
    } else {
      // Fallback debug — log what selectors find
      const debug = await emailPage.evaluate(() => ({
        blockDivider: document.querySelectorAll(".c--block-divider").length,
        borderTop: document.querySelectorAll('[style*="border-top"]').length,
        hr: document.querySelectorAll("hr").length,
        allBlocks: Array.from(document.querySelectorAll('[class*="c--block"]'))
          .map((el) => el.className).slice(0, 10),
      }));
      console.log("  Email debug:", JSON.stringify(debug, null, 2));
    }

    const emailShots: Map<string, Buffer | null> = new Map();
    for (let i = 0; i < VARIANTS.length; i++) {
      const v = VARIANTS[i];
      if (i < emailDividerCount) {
        // Screenshot the full divider block (includes padding)
        const locator = emailPage.locator(emailDividerSelector).nth(i);
        const shot = await screenshotElement(locator, `email-${v.name}`, ARTIFACTS_DIR);
        emailShots.set(v.name, shot);
      } else {
        console.log(`  ⚠ No email element for variant ${i} (${v.name})`);
        emailShots.set(v.name, null);
      }
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

    const results = await compareElementPairs(pairs, ARTIFACTS_DIR, "Divider");

    printResultsSummary(results, MAX_DIFF_PERCENT, ARTIFACTS_DIR);
    await attachFailedResults(results, testInfo);
    saveResultsJson(results, "divider");

    // Assert pixel parity
    for (const r of results) {
      expect(
        r.diffPercent,
        `${r.name}: visual difference ${r.diffPercent.toFixed(1)}% exceeds ${MAX_DIFF_PERCENT}%. ` +
          `See diff-${r.name}.png for details.`
      ).toBeLessThanOrEqual(MAX_DIFF_PERCENT);
    }

    console.log("\n✅ Divider visual parity test complete!");
  });
});
