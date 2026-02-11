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
import { insertCustomCode, insertDivider } from "./ui-helpers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════
// Custom HTML Variant Definitions
// ═══════════════════════════════════════════════════════════════════════
//
// Custom HTML blocks are atom nodes whose only editable property is the
// HTML `code` string (edited via a Monaco editor in the sidebar form).
// They are inserted programmatically via insertCustomCode(page, code).
//
// The Designer renders the HTML inline via dangerouslySetInnerHTML.
// The backend renders it as an Elemental `html` node (raw HTML in email).

interface CustomHtmlVariant {
  name: string;
  /** Unique text appearing in the rendered HTML so we can locate it */
  uniqueText: string;
  /** The HTML code to insert */
  code: string;
  /** Optional CSS selector override for locating this variant in the rendered email.
   *  Useful when the default `td:has-text / div:has-text` selector captures only a
   *  fragment (e.g. a single table cell instead of the full table). */
  emailSelector?: string;
}

const VARIANTS: CustomHtmlVariant[] = [
  // ── Simple Text ──────────────────────────────────────────────────────
  {
    name: "plain-text",
    uniqueText: "Simple plain text custom HTML",
    code: "<p>Simple plain text custom HTML block for visual parity.</p>",
  },

  // ── Styled Text ──────────────────────────────────────────────────────
  {
    name: "styled-text",
    uniqueText: "Styled custom HTML with inline",
    code: '<p style="color: #DC2626; font-weight: bold; font-size: 18px;">Styled custom HTML with inline CSS for rendering check.</p>',
  },

  // ── Background Color ─────────────────────────────────────────────────
  {
    name: "background",
    uniqueText: "Custom HTML with background color",
    code: '<div style="background-color: #FEF3C7; padding: 12px; border-radius: 4px;">Custom HTML with background color and padding.</div>',
  },

  // ── Border ───────────────────────────────────────────────────────────
  {
    name: "border",
    uniqueText: "Custom HTML with border styling",
    code: '<div style="border: 2px solid #7C3AED; padding: 10px;">Custom HTML with border styling for visual check.</div>',
  },

  // ── Table ────────────────────────────────────────────────────────────
  {
    name: "table",
    uniqueText: "Custom HTML table cell one",
    code:
      '<table style="width: 100%; border-collapse: collapse;">' +
      '<tr><td style="border: 1px solid #d1d5db; padding: 8px;">Custom HTML table cell one</td>' +
      '<td style="border: 1px solid #d1d5db; padding: 8px;">Cell two</td></tr>' +
      '<tr><td style="border: 1px solid #d1d5db; padding: 8px;">Cell three</td>' +
      '<td style="border: 1px solid #d1d5db; padding: 8px;">Cell four</td></tr></table>',
    // Default locator would capture a single <td>; target the full table instead
    emailSelector: 'table:has(td:has-text("Custom HTML table cell one"))',
  },

  // ── Multi-element ────────────────────────────────────────────────────
  {
    name: "multi-element",
    uniqueText: "Custom HTML multi-element heading",
    code:
      '<div>' +
      '<h3 style="margin: 0 0 8px 0; color: #1E293B;">Custom HTML multi-element heading</h3>' +
      '<p style="margin: 0; color: #64748B;">A paragraph below the heading with muted text color.</p>' +
      '</div>',
  },

  // ── Combo ────────────────────────────────────────────────────────────
  {
    name: "combo-styled",
    uniqueText: "Combo styled custom HTML block",
    code:
      '<div style="background-color: #F0FDF4; border-left: 4px solid #16A34A; padding: 16px;">' +
      '<strong style="color: #166534;">Combo styled custom HTML block</strong>' +
      '<p style="margin: 8px 0 0 0; color: #15803D;">Green-themed callout with left border accent.</p>' +
      '</div>',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// Test
// ═══════════════════════════════════════════════════════════════════════

test.describe("Custom HTML Visual Parity: Designer vs Rendered Email", () => {
  test.skip(
    !COURIER_AUTH_TOKEN,
    "COURIER_AUTH_TOKEN not set – skipping custom HTML visual test"
  );

  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await loadDesignerEditor(page);
    await resetEditor(page);
  });

  test("all custom HTML variants visual parity", async ({
    page,
    request,
    browser,
  }) => {
    // ─── Step 1: Insert all custom HTML variants ─────────────────────
    console.log(`Step 1: Inserting ${VARIANTS.length} custom HTML variants...`);

    for (let i = 0; i < VARIANTS.length; i++) {
      const v = VARIANTS[i];
      console.log(`  Inserting: ${v.name}`);
      await insertCustomCode(page, v.code);

      // Insert a divider between variants to force separate Elemental blocks
      if (i < VARIANTS.length - 1) {
        await insertDivider(page, { color: "#FFFFFF", size: 1, padding: 0 });
      }
    }

    await page.waitForTimeout(500);
    console.log(`  ✓ ${VARIANTS.length} custom HTML blocks inserted`);

    // ─── Step 2: Designer baseline snapshots (preview mode) ───────────
    // Custom HTML blocks are identified by their rendered HTML content.
    // We locate them by the unique text within .node-element.
    console.log("Step 2: Checking Designer baselines (preview mode)...");

    const previewEditor = await enterPreviewMode(page);
    await expect(previewEditor).toBeVisible({ timeout: 5000 });

    for (const v of VARIANTS) {
      const locator = previewEditor
        .locator(`.node-element:has-text("${v.uniqueText}")`)
        .last();
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
      "custom-html-visual.spec.ts-snapshots"
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

        let matched = 0;
        let warned = 0;
        let created = 0;

        for (const v of VARIANTS) {
          const baselineName = `email-${v.name}-chromium-darwin.png`;
          const baselinePath = path.join(snapshotsDir, baselineName);

          try {
            // Custom HTML renders as raw HTML in the email; locate by unique text.
            // When emailSelector is provided (e.g. for tables), use it instead
            // of the default td/div selector which may capture only a fragment.
            const selector = v.emailSelector
              ? v.emailSelector
              : `td:has-text("${v.uniqueText}"), div:has-text("${v.uniqueText}")`;
            let locator = emailPage
              .locator(selector)
              .locator("visible=true")
              .last();
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

    console.log("\n✅ Custom HTML visual parity test complete!");
  });
});
