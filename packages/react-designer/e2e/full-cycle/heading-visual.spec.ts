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
import {
  typeText,
  toggleBold,
  toggleItalic,
  toggleUnderline,
  toggleStrike,
  setAlignment,
  insertVariable,
  applyLink,
  setBlockAttrs,
  insertDivider,
  insertHeadingBlock,
} from "./ui-helpers";
import type { Page } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════
// Heading Variant Definitions (UI-driven)
// ═══════════════════════════════════════════════════════════════════════

interface HeadingVariant {
  name: string;
  uniqueText: string;
  level: 1 | 2 | 3;
  /** Create this heading via UI actions (typing, shortcuts, etc.) */
  setup: (page: Page) => Promise<void>;
  /** Optional: frame styling attrs to apply programmatically after UI setup */
  frameAttrs?: Record<string, unknown>;
}

const VARIANTS: HeadingVariant[] = [
  // ── Heading Levels ──────────────────────────────────────────────────
  {
    name: "h1-default",
    uniqueText: "Heading level one default",
    level: 1,
    setup: async (page) => {
      await typeText(page, "Heading level one default alignment.");
    },
  },
  {
    name: "h2-default",
    uniqueText: "Heading level two default",
    level: 2,
    setup: async (page) => {
      await typeText(page, "Heading level two default alignment.");
    },
  },
  {
    name: "h3-default",
    uniqueText: "Heading level three default",
    level: 3,
    setup: async (page) => {
      await typeText(page, "Heading level three default alignment.");
    },
  },

  // ── Alignment ───────────────────────────────────────────────────────
  {
    name: "h1-center",
    uniqueText: "Center aligned heading",
    level: 1,
    setup: async (page) => {
      await typeText(page, "Center aligned heading one.");
      await setAlignment(page, "center");
    },
  },
  {
    name: "h1-right",
    uniqueText: "Right aligned heading",
    level: 1,
    setup: async (page) => {
      await typeText(page, "Right aligned heading one.");
      await setAlignment(page, "right");
    },
  },

  // ── Inline Formatting ──────────────────────────────────────────────
  {
    name: "h1-bold",
    uniqueText: "Bold heading text check",
    level: 1,
    setup: async (page) => {
      await toggleBold(page);
      await typeText(page, "Bold heading text check.");
      await toggleBold(page);
    },
  },
  {
    name: "h1-italic",
    uniqueText: "Italic heading text check",
    level: 1,
    setup: async (page) => {
      await toggleItalic(page);
      await typeText(page, "Italic heading text check.");
      await toggleItalic(page);
    },
  },
  {
    name: "h2-mixed-formatting",
    uniqueText: "heading with mixed inline",
    level: 2,
    setup: async (page) => {
      await typeText(page, "A ");
      await toggleBold(page);
      await typeText(page, "heading");
      await toggleBold(page);
      await typeText(page, " with ");
      await toggleItalic(page);
      await typeText(page, "mixed inline");
      await toggleItalic(page);
      await typeText(page, " formatting.");
    },
  },
  {
    name: "h1-underline-strike",
    uniqueText: "heading underline and strike",
    level: 1,
    setup: async (page) => {
      await typeText(page, "A ");
      await toggleUnderline(page);
      await typeText(page, "heading underline");
      await toggleUnderline(page);
      await typeText(page, " and ");
      await toggleStrike(page);
      await typeText(page, "strike");
      await toggleStrike(page);
      await typeText(page, " marks.");
    },
  },

  // ── Link ────────────────────────────────────────────────────────────
  {
    name: "h1-link",
    uniqueText: "heading with embedded link check",
    level: 1,
    setup: async (page) => {
      await typeText(page, "A heading with ");
      const linkText = "embedded link";
      await typeText(page, linkText);
      await applyLink(page, linkText.length, "https://example.com");
      await typeText(page, " check.");
    },
  },

  // ── Variable ────────────────────────────────────────────────────────
  {
    name: "h1-variable",
    uniqueText: "Hello heading user",
    level: 1,
    setup: async (page) => {
      await typeText(page, "Hello heading user ");
      await insertVariable(page, "userName");
      await typeText(page, "!");
    },
  },

  // ── Frame Styling ──────────────────────────────────────────────────
  {
    name: "h1-background",
    uniqueText: "Heading with background color",
    level: 1,
    setup: async (page) => {
      await typeText(page, "Heading with background color.");
    },
    frameAttrs: { backgroundColor: "#FEF3C7" },
  },
  {
    name: "h1-border",
    uniqueText: "Heading with red border check",
    level: 1,
    setup: async (page) => {
      await typeText(page, "Heading with red border check.");
    },
    frameAttrs: { borderWidth: 2, borderColor: "#EF4444" },
  },
  {
    name: "h2-combo-styled",
    uniqueText: "Styled heading combo",
    level: 2,
    setup: async (page) => {
      await typeText(page, "Styled heading combo: ");
      await toggleBold(page);
      await typeText(page, "centered bold");
      await toggleBold(page);
      await typeText(page, " with padding, background, and border.");
      await setAlignment(page, "center");
    },
    frameAttrs: {
      paddingVertical: 24,
      paddingHorizontal: 32,
      backgroundColor: "#F0FDF4",
      borderWidth: 2,
      borderColor: "#7C3AED",
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════
// Test
// ═══════════════════════════════════════════════════════════════════════

test.describe("Heading Visual Parity: Designer vs Rendered Email", () => {
  test.skip(
    !COURIER_AUTH_TOKEN,
    "COURIER_AUTH_TOKEN not set – skipping heading visual test"
  );

  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await loadDesignerEditor(page);
    await resetEditor(page);
  });

  test("all heading variants visual parity", async ({
    page,
    request,
    browser,
  }) => {
    // ─── Step 1: Create all heading variants via UI ───────────────────
    console.log(`Step 1: Creating ${VARIANTS.length} heading variants via UI...`);

    for (let i = 0; i < VARIANTS.length; i++) {
      const v = VARIANTS[i];
      console.log(`  Creating: ${v.name} (h${v.level})`);

      // Insert a heading block at the correct level
      await insertHeadingBlock(page, v.level);

      // Run variant-specific setup (type text, apply formatting, etc.)
      await v.setup(page);

      // Insert a divider between each heading variant to force separate
      // Elemental elements (consecutive blocks would merge).
      if (i < VARIANTS.length - 1) {
        await insertDivider(page, { color: "#FFFFFF", size: 1, padding: 0 });
      }
    }

    // Apply frame styling attrs where needed
    for (const v of VARIANTS) {
      if (v.frameAttrs) {
        await setBlockAttrs(page, v.uniqueText, v.frameAttrs);
      }
    }

    await page.waitForTimeout(500);
    console.log(`  ✓ ${VARIANTS.length} headings created via UI`);

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

    // Pass variable values so they render as real text in the email
    const templateData = {
      userName: "TestUser",
      user: "TestUser",
    };

    // ─── Steps 3b-5: Email rendering (backend-dependent, warn-only) ──
    // Email snapshots depend on the Courier backend for rendering.
    // Failures here should NOT block PRs — they are logged as warnings.
    const emailWarnings: string[] = [];
    let emailPage: import("playwright").Page | undefined;
    const snapshotsDir = path.join(
      __dirname,
      "heading-visual.spec.ts-snapshots"
    );

    try {
      const requestId = await sendNotification(request, emailElements, templateData);
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

        // Normalize email chrome before screenshots
        await normalizeEmailPage(emailPage);

        let matched = 0;
        let warned = 0;
        let created = 0;

        for (const v of VARIANTS) {
          const baselineName = `email-${v.name}-chromium-darwin.png`;
          const baselinePath = path.join(snapshotsDir, baselineName);

          try {
            let locator = emailPage
              .locator(`.c--block-text:has-text("${v.uniqueText}")`)
              .last();
            const visible = await locator.isVisible().catch(() => false);
            if (!visible) {
              locator = emailPage
                .locator(`td:has-text("${v.uniqueText}"), div:has-text("${v.uniqueText}")`)
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

    console.log("\n✅ Heading visual parity test complete!");
  });
});
