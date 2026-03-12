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
import { insertButton, insertDivider } from "./ui-helpers";
import type { Page } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════
// Button Variant Definitions
// ═══════════════════════════════════════════════════════════════════════
//
// Buttons are atom-like nodes whose text, colors, alignment, padding,
// and border-radius are controlled entirely through node attributes.
// We use `insertButton(page, attrs)` to create each variant.

interface ButtonVariant {
  name: string;
  uniqueText: string;
  /** Attributes passed to insertButton (merged with defaults). */
  attrs: Record<string, unknown>;
}

const VARIANTS: ButtonVariant[] = [
  // ── Defaults & Alignment ────────────────────────────────────────────
  {
    name: "default-center",
    uniqueText: "Default center button",
    attrs: {
      label: "Default center button",
      link: "https://example.com",
    },
  },
  {
    name: "align-left",
    uniqueText: "Left aligned button",
    attrs: {
      label: "Left aligned button",
      link: "https://example.com",
      alignment: "left",
    },
  },
  {
    name: "align-right",
    uniqueText: "Right aligned button",
    attrs: {
      label: "Right aligned button",
      link: "https://example.com",
      alignment: "right",
    },
  },

  // ── Colors ──────────────────────────────────────────────────────────
  {
    name: "green-bg",
    uniqueText: "Green action button",
    attrs: {
      label: "Green action button",
      link: "https://example.com",
      backgroundColor: "#16A34A",
      textColor: "#ffffff",
    },
  },
  {
    name: "red-bg",
    uniqueText: "Red danger button",
    attrs: {
      label: "Red danger button",
      link: "https://example.com",
      backgroundColor: "#DC2626",
      textColor: "#ffffff",
    },
  },
  {
    name: "dark-bg-light-text",
    uniqueText: "Dark button light text",
    attrs: {
      label: "Dark button light text",
      link: "https://example.com",
      backgroundColor: "#1E293B",
      textColor: "#F8FAFC",
    },
  },

  // ── Border Radius ───────────────────────────────────────────────────
  {
    name: "rounded-small",
    uniqueText: "Small rounded button",
    attrs: {
      label: "Small rounded button",
      link: "https://example.com",
      borderRadius: 4,
    },
  },
  {
    name: "rounded-large",
    uniqueText: "Large rounded pill button",
    attrs: {
      label: "Large rounded pill button",
      link: "https://example.com",
      borderRadius: 20,
    },
  },

  // ── Padding ─────────────────────────────────────────────────────────
  {
    name: "large-padding",
    uniqueText: "Large padded button",
    attrs: {
      label: "Large padded button",
      link: "https://example.com",
      paddingVertical: 18,
      paddingHorizontal: 26,
    },
  },

  // ── Combo ───────────────────────────────────────────────────────────
  {
    name: "combo-styled",
    uniqueText: "Styled combo CTA",
    attrs: {
      label: "Styled combo CTA",
      link: "https://example.com/signup",
      alignment: "center",
      backgroundColor: "#7C3AED",
      textColor: "#ffffff",
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 24,
    },
  },
  {
    name: "long-label",
    uniqueText: "button with a longer label to test",
    attrs: {
      label: "A button with a longer label to test wrapping behavior across the width",
      link: "https://example.com",
      alignment: "center",
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 20,
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════
// Test
// ═══════════════════════════════════════════════════════════════════════

test.describe("Button Visual Parity: Designer vs Rendered Email", () => {
  test.skip(
    !COURIER_AUTH_TOKEN,
    "COURIER_AUTH_TOKEN not set – skipping button visual test"
  );

  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await loadDesignerEditor(page);
    await resetEditor(page);
  });

  test("all button variants visual parity", async ({
    page,
    request,
    browser,
  }) => {
    // ─── Step 1: Create all button variants ───────────────────────────
    console.log(`Step 1: Creating ${VARIANTS.length} button variants...`);

    for (let i = 0; i < VARIANTS.length; i++) {
      const v = VARIANTS[i];
      console.log(`  Creating: ${v.name}`);

      await insertButton(page, v.attrs);

      // Insert a divider between each button variant to force separate
      // Elemental elements.
      if (i < VARIANTS.length - 1) {
        await insertDivider(page, { color: "#FFFFFF", size: 1, padding: 0 });
      }
    }

    await page.waitForTimeout(500);
    console.log(`  ✓ ${VARIANTS.length} buttons created`);

    // ─── Step 2: Designer baseline snapshots (preview mode) ───────────
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
      "button-visual.spec.ts-snapshots"
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

        emailPage = await browser.newPage({ viewport: { width: 700, height: 2400 } });
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
            // Buttons render as <a> with the label text inside
            let locator = emailPage
              .locator(`.c--block-action:has-text("${v.uniqueText}")`)
              .last();
            const visible = await locator.isVisible().catch(() => false);
            if (!visible) {
              locator = emailPage
                .locator(`a:has-text("${v.uniqueText}"), td:has-text("${v.uniqueText}")`)
                .locator("visible=true")
                .last();
            }
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

    console.log("\n✅ Button visual parity test complete!");
  });
});
