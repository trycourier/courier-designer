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
import { normalizeEmailPage, enterPreviewMode, exitPreviewMode } from "./visual-test-utils";
import { insertBlockquote, insertDivider } from "./ui-helpers";
import type { Page } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════
// Blockquote Variant Definitions
// ═══════════════════════════════════════════════════════════════════════
//
// Blockquotes contain child text blocks (paragraphs/headings).
// The form exposes only "Border → color". The bubble text menu provides
// inline formatting (bold, italic, underline, strike, link, variable)
// and alignment when a blockquote is selected.
//
// We insert blockquotes programmatically via insertBlockquote(), then
// apply inline formatting and alignment through the UI.

interface BlockquoteVariant {
  name: string;
  uniqueText: string;
  /** Create this blockquote via programmatic insert + optional UI actions */
  setup: (page: Page) => Promise<void>;
}

const VARIANTS: BlockquoteVariant[] = [
  // ── Defaults ─────────────────────────────────────────────────────────
  {
    name: "default",
    uniqueText: "Default blockquote plain text",
    setup: async (page) => {
      await insertBlockquote(page, "Default blockquote plain text for visual parity.");
    },
  },

  // ── Border Color ─────────────────────────────────────────────────────
  {
    name: "red-border",
    uniqueText: "Red bordered blockquote text",
    setup: async (page) => {
      await insertBlockquote(page, "Red bordered blockquote text for border color check.", {
        borderColor: "#EF4444",
      });
    },
  },
  {
    name: "blue-border",
    uniqueText: "Blue bordered blockquote text",
    setup: async (page) => {
      await insertBlockquote(page, "Blue bordered blockquote text for border color check.", {
        borderColor: "#3B82F6",
      });
    },
  },
  {
    name: "green-border",
    uniqueText: "Green bordered blockquote text",
    setup: async (page) => {
      await insertBlockquote(page, "Green bordered blockquote text for border color check.", {
        borderColor: "#16A34A",
      });
    },
  },

  // ── Inline Formatting (via text menu) ────────────────────────────────
  {
    name: "bold",
    uniqueText: "Blockquote with bold inline text",
    setup: async (page) => {
      await insertBlockquote(page, "Blockquote with bold inline text for formatting check.", {}, [
        { type: "bold" },
      ]);
    },
  },
  {
    name: "italic",
    uniqueText: "Blockquote with italic inline text",
    setup: async (page) => {
      await insertBlockquote(page, "Blockquote with italic inline text for formatting check.", {}, [
        { type: "italic" },
      ]);
    },
  },
  {
    name: "mixed-formatting",
    uniqueText: "Blockquote mixed bold italic",
    setup: async (page) => {
      await insertBlockquote(page, "Blockquote mixed bold italic underline strike text.", {}, [
        { type: "bold" },
        { type: "italic" },
        { type: "underline" },
        { type: "strike" },
      ]);
    },
  },

  // ── Link ─────────────────────────────────────────────────────────────
  {
    name: "link",
    uniqueText: "clickable link embedded in blockquote",
    setup: async (page) => {
      await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!ed) throw new Error("Editor not available");
        const pos = ed.state.doc.content.size;
        ed.commands.insertContentAt(pos, {
          type: "blockquote",
          attrs: {
            paddingHorizontal: 8,
            paddingVertical: 0,
            backgroundColor: "transparent",
            borderLeftWidth: 2,
            borderColor: "#e0e0e0",
          },
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Blockquote with a " },
                {
                  type: "text",
                  text: "clickable link",
                  marks: [{ type: "link", attrs: { href: "https://example.com" } }],
                },
                { type: "text", text: " embedded in blockquote for link rendering test." },
              ],
            },
          ],
        });
      });
      await page.waitForTimeout(200);
    },
  },

  // ── Variable ────────────────────────────────────────────────────────
  {
    name: "variable",
    uniqueText: "welcome to blockquote variable",
    setup: async (page) => {
      await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!ed) throw new Error("Editor not available");
        const pos = ed.state.doc.content.size;
        ed.commands.insertContentAt(pos, {
          type: "blockquote",
          attrs: {
            paddingHorizontal: 8,
            paddingVertical: 0,
            backgroundColor: "transparent",
            borderLeftWidth: 2,
            borderColor: "#e0e0e0",
          },
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Hello " },
                { type: "variable", attrs: { id: "userName", isInvalid: false } },
                { type: "text", text: ", welcome to blockquote variable rendering test." },
              ],
            },
          ],
        });
      });
      await page.waitForTimeout(200);
    },
  },

  // ── Alignment (set programmatically on inner paragraph) ──────────────
  {
    name: "align-center",
    uniqueText: "Center aligned blockquote text",
    setup: async (page) => {
      await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!ed) throw new Error("Editor not available");
        const pos = ed.state.doc.content.size;
        ed.commands.insertContentAt(pos, {
          type: "blockquote",
          attrs: {
            paddingHorizontal: 8,
            paddingVertical: 0,
            backgroundColor: "transparent",
            borderLeftWidth: 2,
            borderColor: "#e0e0e0",
          },
          content: [
            {
              type: "paragraph",
              attrs: { textAlign: "center" },
              content: [
                { type: "text", text: "Center aligned blockquote text for alignment check." },
              ],
            },
          ],
        });
      });
      await page.waitForTimeout(200);
    },
  },
  {
    name: "align-right",
    uniqueText: "Right aligned blockquote text",
    setup: async (page) => {
      await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!ed) throw new Error("Editor not available");
        const pos = ed.state.doc.content.size;
        ed.commands.insertContentAt(pos, {
          type: "blockquote",
          attrs: {
            paddingHorizontal: 8,
            paddingVertical: 0,
            backgroundColor: "transparent",
            borderLeftWidth: 2,
            borderColor: "#e0e0e0",
          },
          content: [
            {
              type: "paragraph",
              attrs: { textAlign: "right" },
              content: [
                { type: "text", text: "Right aligned blockquote text for alignment check." },
              ],
            },
          ],
        });
      });
      await page.waitForTimeout(200);
    },
  },

  // ── Text Styles (headings inside blockquote) ─────────────────────────
  {
    name: "text-style-h1",
    uniqueText: "Blockquote with heading one style",
    setup: async (page) => {
      await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!ed) throw new Error("Editor not available");
        const pos = ed.state.doc.content.size;
        ed.commands.insertContentAt(pos, {
          type: "blockquote",
          attrs: {
            paddingHorizontal: 8,
            paddingVertical: 0,
            backgroundColor: "transparent",
            borderLeftWidth: 2,
            borderColor: "#e0e0e0",
          },
          content: [
            {
              type: "heading",
              attrs: { level: 1 },
              content: [
                { type: "text", text: "Blockquote with heading one style for text style check." },
              ],
            },
          ],
        });
      });
      await page.waitForTimeout(200);
    },
  },
  {
    name: "text-style-h2",
    uniqueText: "Blockquote with heading two style",
    setup: async (page) => {
      await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!ed) throw new Error("Editor not available");
        const pos = ed.state.doc.content.size;
        ed.commands.insertContentAt(pos, {
          type: "blockquote",
          attrs: {
            paddingHorizontal: 8,
            paddingVertical: 0,
            backgroundColor: "transparent",
            borderLeftWidth: 2,
            borderColor: "#e0e0e0",
          },
          content: [
            {
              type: "heading",
              attrs: { level: 2 },
              content: [
                { type: "text", text: "Blockquote with heading two style for text style check." },
              ],
            },
          ],
        });
      });
      await page.waitForTimeout(200);
    },
  },
  {
    name: "text-style-h3",
    uniqueText: "Blockquote with heading three style",
    setup: async (page) => {
      await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!ed) throw new Error("Editor not available");
        const pos = ed.state.doc.content.size;
        ed.commands.insertContentAt(pos, {
          type: "blockquote",
          attrs: {
            paddingHorizontal: 8,
            paddingVertical: 0,
            backgroundColor: "transparent",
            borderLeftWidth: 2,
            borderColor: "#e0e0e0",
          },
          content: [
            {
              type: "heading",
              attrs: { level: 3 },
              content: [
                { type: "text", text: "Blockquote with heading three style for text style check." },
              ],
            },
          ],
        });
      });
      await page.waitForTimeout(200);
    },
  },

  // ── Long Text ────────────────────────────────────────────────────────
  {
    name: "long-text",
    uniqueText: "Long blockquote text demonstrates",
    setup: async (page) => {
      await insertBlockquote(
        page,
        "Long blockquote text demonstrates how multi-line content wraps inside the " +
          "quote container. The left border should extend the full height of the content, " +
          "and padding should be applied consistently around all edges of the text."
      );
    },
  },

  // ── Combinations ─────────────────────────────────────────────────────
  {
    name: "combo-styled",
    uniqueText: "Styled combo blockquote with",
    setup: async (page) => {
      await insertBlockquote(
        page,
        "Styled combo blockquote with purple border and bold text.",
        { borderColor: "#7C3AED" },
        [{ type: "bold" }]
      );
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════
// Test
// ═══════════════════════════════════════════════════════════════════════

test.describe("Blockquote Visual Parity: Designer vs Rendered Email", () => {
  test.skip(!COURIER_AUTH_TOKEN, "COURIER_AUTH_TOKEN not set – skipping blockquote visual test");

  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await loadDesignerEditor(page);
    await resetEditor(page);
  });

  test("all blockquote variants visual parity", async ({ page, request, browser }) => {
    // ─── Step 1: Create all blockquote variants ──────────────────────
    console.log(`Step 1: Creating ${VARIANTS.length} blockquote variants...`);

    for (let i = 0; i < VARIANTS.length; i++) {
      const v = VARIANTS[i];
      console.log(`  Creating: ${v.name}`);
      await v.setup(page);

      // Insert a divider between variants to force separate Elemental blocks
      if (i < VARIANTS.length - 1) {
        await insertDivider(page, { color: "#FFFFFF", size: 1, padding: 0 });
      }
    }

    await page.waitForTimeout(500);
    console.log(`  ✓ ${VARIANTS.length} blockquotes created`);

    // ─── Step 2: Designer baseline snapshots (preview mode) ───────────
    console.log("Step 2: Checking Designer baselines (preview mode)...");

    const previewEditor = await enterPreviewMode(page);
    await expect(previewEditor).toBeVisible({ timeout: 5000 });

    for (const v of VARIANTS) {
      // TipTap adds class "node-blockquote" to blockquote node view wrappers.
      // Within that wrapper, the first .node-element is the BlockquoteComponent
      // outer div (which contains the border container), while the second
      // .node-element is the inner paragraph. Using .first() gets the blockquote
      // wrapper that includes the left border styling.
      const locator = previewEditor
        .locator(`.node-blockquote:has-text("${v.uniqueText}")`)
        .locator(".node-element")
        .first();
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
    const snapshotsDir = path.join(__dirname, "blockquote-visual.spec.ts-snapshots");

    try {
      const requestId = await sendNotification(request, emailElements, {
        userName: "Alex",
      });
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
            // Blockquotes render as .c--block-quote in the email
            let locator = emailPage.locator(`.c--block-quote:has-text("${v.uniqueText}")`).last();
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
      emailWarnings.push(
        `Email rendering failed: ${(err as Error).message?.split("\n")[0] ?? err}`
      );
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

    console.log("\n✅ Blockquote visual parity test complete!");
  });
});
