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

/**
 * Full-Cycle Visual Snapshot: Designer vs Rendered Email
 *
 * Compares each block element individually between the Designer and the
 * backend-rendered email. This avoids brand header/footer noise and gives
 * precise per-element visual parity results.
 *
 * All screenshots + diffs are saved as artifacts for manual review.
 */

const ARTIFACTS_DIR = path.resolve(
  __dirname,
  "../../test-results/visual-snapshots"
);

test.describe("Visual Snapshot: Designer vs Rendered Email", () => {
  test.skip(
    !COURIER_AUTH_TOKEN,
    "COURIER_AUTH_TOKEN not set – skipping full-cycle visual test"
  );

  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    // Clean stale artifacts from previous runs
    fs.rmSync(ARTIFACTS_DIR, { recursive: true, force: true });
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

    await loadDesignerEditor(page);
    await resetEditor(page);
  });

  test("heading + paragraph + button visual parity", async ({
    page,
    request,
    browser,
  }, testInfo) => {
    // ─── Step 1: Insert styled content ──────────────────────────────
    console.log("Step 1: Inserting Heading + Paragraph + Button...");

    await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!ed) throw new Error("Editor not available");

      ed.commands.clearContent();

      ed.commands.insertContent({
        type: "heading",
        attrs: { level: 1, textAlign: "center" },
        content: [{ type: "text", text: "Welcome to Our Newsletter" }],
      });

      ed.commands.insertContent({
        type: "paragraph",
        attrs: { textAlign: "left" },
        content: [
          { type: "text", text: "This is a " },
          { type: "text", text: "styled paragraph", marks: [{ type: "bold" }] },
          { type: "text", text: " with " },
          { type: "text", text: "italic text", marks: [{ type: "italic" }] },
          { type: "text", text: " inside it." },
        ],
      });

      ed.commands.insertContent({
        type: "button",
        attrs: {
          label: "Get Started",
          link: "https://example.com",
          backgroundColor: "#7C3AED",
          textColor: "#ffffff",
          alignment: "center",
          padding: 10,
          borderRadius: 6,
        },
        content: [{ type: "text", text: "Get Started" }],
      });
    });

    await page.waitForTimeout(600);
    console.log("  ✓ Content inserted");

    // ─── Step 2: Preview mode + screenshot each element ─────────────
    console.log("Step 2: Designer element screenshots (preview mode)...");

    const previewEditor = await enterPreviewMode(page);
    await expect(previewEditor).toBeVisible({ timeout: 5000 });

    const dsHeadingShot = await screenshotElement(previewEditor.locator("h1").first(), "designer-heading", ARTIFACTS_DIR);
    const dsParagraphShot = await screenshotElement(previewEditor.locator("p").first(), "designer-paragraph", ARTIFACTS_DIR);
    const dsButtonShot = await screenshotElement(previewEditor.locator(".courier-inline-flex").first(), "designer-button", ARTIFACTS_DIR);
    console.log("  ✓ Designer element screenshots taken");

    await exitPreviewMode(page);

    // ─── Step 3: Capture content & send ─────────────────────────────
    console.log("Step 3: Capturing content and sending...");

    const { emailElements } = await captureElementalContent(page);
    console.log(`  Elemental elements: ${JSON.stringify(emailElements, null, 2).substring(0, 600)}`);

    const requestId = await sendNotification(request, emailElements);
    console.log(`  ✓ Sent, requestId: ${requestId}`);

    // ─── Step 4: Poll for rendered HTML ─────────────────────────────
    console.log("Step 4: Polling for rendered email...");

    const { renderedHtml } = await pollForRenderedHtml(request, requestId);
    expect(renderedHtml).toBeTruthy();
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "rendered-email.html"), renderedHtml!);

    // ─── Step 5: Render email in browser & screenshot each element ──
    console.log("Step 5: Rendering email and taking element screenshots...");

    const emailPage = await browser.newPage({ viewport: { width: 700, height: 1200 } });
    await emailPage.setContent(renderedHtml!, { waitUntil: "networkidle" });
    await emailPage.waitForTimeout(500);

    await normalizeEmailPage(emailPage);

    const fullEmailShot = await emailPage.screenshot({ fullPage: true });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "rendered-email-full.png"), fullEmailShot);

    const emHeadingShot = await screenshotElement(
      emailPage.locator('div:has-text("Welcome to Our Newsletter")').locator("visible=true").last(),
      "email-heading",
      ARTIFACTS_DIR
    );
    const emParagraphShot = await screenshotElement(
      emailPage.locator('div:has-text("inside it.")').locator("visible=true").last(),
      "email-paragraph",
      ARTIFACTS_DIR
    );
    const emButtonShot = await screenshotElement(
      emailPage.locator('a:has-text("Get Started")').first(),
      "email-button",
      ARTIFACTS_DIR
    );
    console.log("  ✓ Email element screenshots taken");
    await emailPage.close();

    // ─── Step 6: Compare each element pair ──────────────────────────
    console.log("\nStep 6: Comparing element pairs...\n");

    const headingResults = await compareElementPairs(
      [{ name: "heading", designerShot: dsHeadingShot, emailShot: emHeadingShot }],
      ARTIFACTS_DIR, "Heading"
    );
    const paragraphResults = await compareElementPairs(
      [{ name: "paragraph", designerShot: dsParagraphShot, emailShot: emParagraphShot }],
      ARTIFACTS_DIR, "Paragraph"
    );
    const buttonResults = await compareElementPairs(
      [{ name: "button", designerShot: dsButtonShot, emailShot: emButtonShot }],
      ARTIFACTS_DIR, "Button"
    );
    const results = [...headingResults, ...paragraphResults, ...buttonResults];

    printResultsSummary(results, MAX_DIFF_PERCENT, ARTIFACTS_DIR);
    await attachFailedResults(results, testInfo);
    saveResultsJson(results, "mixed-elements");

    for (const r of results) {
      expect(
        r.diffPercent,
        `${r.name}: visual difference ${r.diffPercent.toFixed(1)}% exceeds ${MAX_DIFF_PERCENT}%. ` +
        `See diff-${r.name}.png for details.`
      ).toBeLessThanOrEqual(MAX_DIFF_PERCENT);
    }

    console.log("\n✅ Visual snapshot test complete!");
  });
});
