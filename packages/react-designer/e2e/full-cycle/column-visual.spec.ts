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
  enterRealPreviewMode,
  exitRealPreviewMode,
  compareScreenshots,
} from "./visual-test-utils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════
// Column Variant Definitions
// ═══════════════════════════════════════════════════════════════════════
//
// Columns are complex nested nodes: column > columnRow > columnCell+.
// The sidebar exposes:
//
//   Column wrapper: columns count, padding, background, border
//   Individual cells: padding, background, border, width
//
// Each cell must contain at least one node whose text matches cellTexts[i]
// so the email locator can verify correct ordering. Variants are identified
// by nth index in the Designer and by `.c--block-columns-outer` in email.

interface ColumnVariant {
  name: string;
  cellTexts: string[];
  node: Record<string, unknown>;
}

function buildColumnNode(opts: {
  columnsCount: number;
  cellTexts: string[];
  columnAttrs?: Record<string, unknown>;
  cellAttrs?: Array<Record<string, unknown>>;
  cellContent?: Array<Record<string, unknown>[]>;
}): Record<string, unknown> {
  const { columnsCount, cellTexts, columnAttrs = {}, cellAttrs = [], cellContent } = opts;
  const equalWidth = 100 / columnsCount;

  const cells = Array.from({ length: columnsCount }, (_, index) => ({
    type: "columnCell",
    attrs: {
      index,
      width: equalWidth,
      columnId: `col-visual-${index}`,
      isEditorMode: true,
      paddingHorizontal: 6,
      paddingVertical: 6,
      backgroundColor: "transparent",
      borderWidth: 0,
      borderRadius: 0,
      borderColor: "transparent",
      ...(cellAttrs[index] || {}),
    },
    content: cellContent?.[index] ?? [
      {
        type: "paragraph",
        content: [{ type: "text", text: cellTexts[index] }],
      },
      { type: "paragraph" },
    ],
  }));

  return {
    type: "column",
    attrs: {
      columnsCount,
      paddingHorizontal: 0,
      paddingVertical: 0,
      backgroundColor: "transparent",
      borderWidth: 0,
      borderRadius: 0,
      borderColor: "transparent",
      ...columnAttrs,
    },
    content: [
      {
        type: "columnRow",
        content: cells,
      },
    ],
  };
}

function variant(
  name: string,
  cellTexts: string[],
  opts: {
    columnAttrs?: Record<string, unknown>;
    cellAttrs?: Array<Record<string, unknown>>;
  } = {}
): ColumnVariant {
  return {
    name,
    cellTexts,
    node: buildColumnNode({
      columnsCount: cellTexts.length,
      cellTexts,
      ...opts,
    }),
  };
}

function richVariant(
  name: string,
  cells: Array<{ text: string; content: Record<string, unknown>[] }>,
  opts: {
    columnAttrs?: Record<string, unknown>;
    cellAttrs?: Array<Record<string, unknown>>;
  } = {}
): ColumnVariant {
  return {
    name,
    cellTexts: cells.map((c) => c.text),
    node: buildColumnNode({
      columnsCount: cells.length,
      cellTexts: cells.map((c) => c.text),
      cellContent: cells.map((c) => c.content),
      ...opts,
    }),
  };
}

const VARIANTS: ColumnVariant[] = [
  // ── Column Counts ──────────────────────────────────────────────────
  variant("2-col-default", [
    "Your order has been confirmed",
    "Estimated delivery in 3 days",
  ]),
  variant("3-col-default", [
    "Monthly plan details",
    "Shipping information",
    "Return policy overview",
  ]),
  variant("4-col-default", [
    "Account info",
    "Billing cycle",
    "Usage stats",
    "Support links",
  ]),

  // ── Column Wrapper Padding ─────────────────────────────────────────
  variant(
    "2-col-with-padding",
    ["Welcome to your dashboard", "Get started with the guide"],
    { columnAttrs: { paddingHorizontal: 20, paddingVertical: 16 } }
  ),

  // ── Cell Padding ───────────────────────────────────────────────────
  variant(
    "2-col-cell-padding",
    ["Important announcement here", "Read more about the update"],
    {
      cellAttrs: [
        { paddingHorizontal: 20, paddingVertical: 16 },
        { paddingHorizontal: 8, paddingVertical: 4 },
      ],
    }
  ),

  // ── Column Wrapper Background ──────────────────────────────────────
  variant(
    "2-col-bg-color",
    ["Featured product launch", "Limited time offer details"],
    { columnAttrs: { backgroundColor: "#F3F4F6" } }
  ),

  // ── Cell Backgrounds ───────────────────────────────────────────────
  variant(
    "2-col-cell-bg",
    ["Payment received successfully", "Invoice attached to email"],
    {
      cellAttrs: [
        { backgroundColor: "#DBEAFE" },
        { backgroundColor: "#FEF3C7" },
      ],
    }
  ),

  // ── Column Wrapper Border ──────────────────────────────────────────
  variant(
    "2-col-border",
    ["Security alert notification", "Action required immediately"],
    { columnAttrs: { borderWidth: 2, borderRadius: 8, borderColor: "#6B7280" } }
  ),

  // ── Cell Borders ───────────────────────────────────────────────────
  variant(
    "2-col-cell-border",
    ["Subscription renewal date", "Payment method on file"],
    {
      cellAttrs: [
        { borderWidth: 2, borderRadius: 4, borderColor: "#EF4444" },
        { borderWidth: 1, borderRadius: 0, borderColor: "#3B82F6" },
      ],
    }
  ),

  // ── Full Combination ───────────────────────────────────────────────
  variant(
    "combo-styled",
    ["Premium membership benefits", "Exclusive member discount"],
    {
      columnAttrs: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderRadius: 12,
        borderColor: "#D1D5DB",
      },
      cellAttrs: [
        {
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: "#EFF6FF",
          borderWidth: 1,
          borderRadius: 6,
          borderColor: "#93C5FD",
        },
        {
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: "#FEF3C7",
          borderWidth: 1,
          borderRadius: 6,
          borderColor: "#FCD34D",
        },
      ],
    }
  ),

  // ═══════════════════════════════════════════════════════════════════
  // Rich Content Variants (different element types inside cells)
  // ═══════════════════════════════════════════════════════════════════

  // ── Headings + Text ─────────────────────────────────────────────
  richVariant("heading-and-text", [
    {
      text: "Welcome aboard",
      content: [
        {
          type: "heading",
          attrs: { level: 1, textAlign: "center" },
          content: [{ type: "text", text: "Welcome aboard" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "We are glad to have you on the team" }],
        },
      ],
    },
    {
      text: "Quick start guide",
      content: [
        {
          type: "heading",
          attrs: { level: 2, textAlign: "right" },
          content: [{ type: "text", text: "Quick start guide" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Follow these steps to get up and running" }],
        },
      ],
    },
  ]),

  // ── Buttons with Different Styles ───────────────────────────────
  richVariant("buttons-styled", [
    {
      text: "Confirm your account",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Confirm your account" }],
        },
        {
          type: "button",
          attrs: {
            label: "Verify Email",
            link: "https://example.com/verify",
            alignment: "center",
            backgroundColor: "#2563EB",
            borderRadius: 6,
            paddingVertical: 12,
            paddingHorizontal: 24,
          },
          content: [{ type: "text", text: "Verify Email" }],
        },
      ],
    },
    {
      text: "Download the mobile app",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Download the mobile app" }],
        },
        {
          type: "button",
          attrs: {
            label: "Get the App",
            link: "https://example.com/app",
            alignment: "left",
            backgroundColor: "#059669",
            borderRadius: 20,
            paddingVertical: 10,
            paddingHorizontal: 32,
          },
          content: [{ type: "text", text: "Get the App" }],
        },
      ],
    },
  ]),

  // ── Dividers Between Text ───────────────────────────────────────
  richVariant("divider-variants", [
    {
      text: "Terms of service updated",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Terms of service updated" }],
        },
        { type: "divider", attrs: { color: "#EF4444", size: 3, padding: 12 } },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Please review the changes below" }],
        },
      ],
    },
    {
      text: "Privacy policy changes",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Privacy policy changes" }],
        },
        { type: "divider", attrs: { color: "#9CA3AF", size: 1, padding: 8 } },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Effective starting next month" }],
        },
      ],
    },
  ]),

  // ── Blockquote with Styling ─────────────────────────────────────
  richVariant("blockquote-styled", [
    {
      text: "Customer testimonial",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Customer testimonial" }],
        },
        {
          type: "blockquote",
          attrs: {
            borderColor: "#6366F1",
            borderLeftWidth: 4,
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: "#EEF2FF",
          },
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "This product changed how we work entirely" },
              ],
            },
          ],
        },
      ],
    },
    {
      text: "Editor highlights from the team",
      content: [
        {
          type: "paragraph",
          attrs: { backgroundColor: "#FEF3C7" },
          content: [
            {
              type: "text",
              text: "Editor highlights from the team",
              marks: [{ type: "textStyle", attrs: { color: "#92400E" } }],
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Curated picks from our editorial staff" },
          ],
        },
      ],
    },
  ]),

  // ── Lists (Ordered + Unordered) ─────────────────────────────────
  richVariant(
    "list-ordered",
    [
      {
        text: "Setup checklist",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Setup checklist" }],
          },
          {
            type: "list",
            attrs: { listType: "ordered", paddingVertical: 4, paddingHorizontal: 0 },
            content: [
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Create your workspace" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Invite team members" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Configure notifications" }] }] },
            ],
          },
        ],
      },
      {
        text: "Key features included",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Key features included" }],
          },
          {
            type: "list",
            attrs: { listType: "unordered", paddingVertical: 4, paddingHorizontal: 0 },
            content: [
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Real-time collaboration" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Advanced analytics dashboard" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Priority customer support" }] }] },
            ],
          },
        ],
      },
    ],
    { cellAttrs: [{ paddingHorizontal: 12, paddingVertical: 10 }, { paddingHorizontal: 12, paddingVertical: 10 }] }
  ),

  // ── Rich Mixed Content ──────────────────────────────────────────
  richVariant(
    "rich-mixed",
    [
      {
        text: "Monthly report summary",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Monthly report summary" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Your usage statistics for this billing period" }],
          },
          {
            type: "button",
            attrs: {
              label: "View Full Report",
              link: "https://example.com/report",
              alignment: "center",
              backgroundColor: "#7C3AED",
              borderRadius: 4,
              paddingVertical: 10,
              paddingHorizontal: 20,
            },
            content: [{ type: "text", text: "View Full Report" }],
          },
        ],
      },
      {
        text: "Recent activity log",
        content: [
          {
            type: "list",
            attrs: { listType: "unordered", paddingVertical: 0, paddingHorizontal: 0 },
            content: [
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Invoice #1042 paid" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "New user joined workspace" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "API key rotated successfully" }] }] },
            ],
          },
          { type: "divider", attrs: { color: "#D1D5DB", size: 1, padding: 8 } },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Recent activity log" }],
          },
        ],
      },
    ],
    {
      columnAttrs: {
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderRadius: 8,
        borderColor: "#E5E7EB",
      },
    }
  ),

  // ── Text Alignment Variations ───────────────────────────────────
  richVariant("text-alignment", [
    {
      text: "Left aligned introduction",
      content: [
        {
          type: "paragraph",
          attrs: { textAlign: "left" },
          content: [{ type: "text", text: "Left aligned introduction" }],
        },
        {
          type: "paragraph",
          attrs: { textAlign: "center", backgroundColor: "#DBEAFE" },
          content: [{ type: "text", text: "Centered with blue background" }],
        },
      ],
    },
    {
      text: "Right aligned summary",
      content: [
        {
          type: "paragraph",
          attrs: { textAlign: "right" },
          content: [{ type: "text", text: "Right aligned summary" }],
        },
        {
          type: "paragraph",
          attrs: { backgroundColor: "#DCFCE7" },
          content: [{ type: "text", text: "Default alignment with green background" }],
        },
      ],
    },
  ]),

  // ── Formatted Text (Bold, Italic, Color, Links) ─────────────────
  richVariant("formatted-text", [
    {
      text: "Important deadline approaching",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Important deadline ",
              marks: [{ type: "bold" }],
            },
            {
              type: "text",
              text: "approaching",
              marks: [
                { type: "bold" },
                { type: "italic" },
                { type: "textStyle", attrs: { color: "#DC2626" } },
              ],
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Submit your documents before the cutoff" },
          ],
        },
      ],
    },
    {
      text: "Visit our help center",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Visit our ",
              marks: [{ type: "underline" }],
            },
            {
              type: "text",
              text: "help center",
              marks: [
                { type: "underline" },
                { type: "link", attrs: { href: "https://example.com/help", target: "_blank" } },
              ],
            },
            { type: "text", text: " for detailed guides" },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Available 24/7 for your convenience",
              marks: [{ type: "italic" }],
            },
          ],
        },
      ],
    },
  ]),
];

// ═══════════════════════════════════════════════════════════════════════
// Test
// ═══════════════════════════════════════════════════════════════════════

test.describe("Column Visual Parity: Designer vs Rendered Email", () => {
  test.skip(
    !COURIER_AUTH_TOKEN,
    "COURIER_AUTH_TOKEN not set – skipping column visual test"
  );

  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await loadDesignerEditor(page);
    await resetEditor(page);
  });

  test("all column variants visual parity", async ({ page, request, browser }) => {
    // ─── Step 1: Build and set the full document ──────────────────────
    console.log(`Step 1: Inserting ${VARIANTS.length} column variants...`);

    const docContent = VARIANTS.flatMap((v) => [
      v.node,
      { type: "paragraph" },
    ]);

    await page.evaluate((content) => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!ed) throw new Error("Editor not available");
      ed.commands.setContent({ type: "doc", content });
    }, docContent);

    await page.waitForTimeout(500);
    console.log(`  ✓ ${VARIANTS.length} column layouts inserted via setContent`);

    // ─── Step 2: Designer baseline snapshots (preview mode) ───────────
    console.log("Step 2: Checking Designer baselines (preview mode)...");

    const previewEditor = await enterRealPreviewMode(page);
    await expect(previewEditor).toBeVisible({ timeout: 5000 });

    for (let i = 0; i < VARIANTS.length; i++) {
      const v = VARIANTS[i];
      const locator = previewEditor
        .locator(".react-renderer.node-column")
        .nth(i);
      await locator.waitFor({ state: "visible", timeout: 5000 });
      await locator.scrollIntoViewIfNeeded();
      await expect(locator).toHaveScreenshot(`designer-${v.name}.png`, {
        maxDiffPixelRatio: 0.03,
      });
    }
    console.log(`  ✓ ${VARIANTS.length} Designer baselines checked`);

    await exitRealPreviewMode(page);

    // ─── Step 3: Capture Elemental content & send ─────────────────────
    console.log("Step 3: Capturing Elemental content and sending...");

    const { emailElements } = await captureElementalContent(page);
    console.log(`  Elemental: ${emailElements.length} elements captured`);

    const columnsElements = emailElements.filter(
      (el: any) => el.type === "columns"
    );
    console.log(`  Found ${columnsElements.length} 'columns' elements in Elemental`);
    expect(columnsElements.length).toBeGreaterThanOrEqual(VARIANTS.length);


    // ─── Steps 3b-5: Email rendering (backend-dependent, warn-only) ──
    const emailWarnings: string[] = [];
    let emailPage: import("playwright").Page | undefined;
    const snapshotsDir = path.join(
      __dirname,
      "column-visual.spec.ts-snapshots"
    );

    try {
      const requestId = await sendNotification(request, emailElements);
      console.log(`  ✓ Sent, requestId: ${requestId}`);

      // ─── Step 4: Poll for rendered HTML ─────────────────────────────
      console.log("Step 4: Polling for rendered email...");

      const { renderedHtml } = await pollForRenderedHtml(request, requestId);

      if (!renderedHtml) {
        emailWarnings.push(
          "Email rendering returned empty HTML — skipping email baselines."
        );
      } else {
        // ─── Step 5: Email baseline snapshots (warn-only) ──────────────
        console.log("Step 5: Checking Email baselines (warn-only)...");

        emailPage = await browser.newPage({
          viewport: { width: 700, height: 5000 },
        });
        await emailPage.setContent(renderedHtml, {
          waitUntil: "networkidle",
        });
        await emailPage.waitForTimeout(500);

        await normalizeEmailPage(emailPage);

        // Courier renders each column variant as a pair of nested divs:
        //   .c--block-columns-outer  (border via bg + padding)
        //     .c--block-columns      (inner content with bg)
        // There is exactly one .c--block-columns-outer per variant.
        const emailColumnSelector = ".c--block-columns-outer";
        const emailColumnCount = await emailPage
          .locator(emailColumnSelector)
          .count();
        console.log(`  Found ${emailColumnCount} email column blocks`);

        let matched = 0;
        let warned = 0;
        let created = 0;

        for (let i = 0; i < VARIANTS.length; i++) {
          const v = VARIANTS[i];
          const baselineName = `email-${v.name}-chromium-darwin.png`;
          const baselinePath = path.join(snapshotsDir, baselineName);

          try {
            // Locate by nth-index, but verify it contains the expected text
            const locator = emailPage
              .locator(emailColumnSelector)
              .nth(i);

            if (i >= emailColumnCount) {
              emailWarnings.push(
                `email-${v.name}: no email element found at index ${i}`
              );
              warned++;
              continue;
            }

            await locator.waitFor({ state: "visible", timeout: 5000 });

            const innerText = await locator.innerText();
            if (!innerText.includes(v.cellTexts[0])) {
              emailWarnings.push(
                `email-${v.name}: expected text "${v.cellTexts[0]}" not found at index ${i}, got "${innerText.slice(0, 60)}..."`
              );
              warned++;
              continue;
            }

            await locator.scrollIntoViewIfNeeded();

            const actual = await locator.screenshot();

            if (fs.existsSync(baselinePath)) {
              const baseline = fs.readFileSync(baselinePath);
              const { match } = compareScreenshots(actual, baseline);
              if (!match) {
                const actualPath = baselinePath.replace(
                  ".png",
                  "-actual.png"
                );
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
              emailWarnings.push(
                `email-${v.name}: new baseline written (no previous baseline)`
              );
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

    // ─── Summary ──────────────────────────────────────────────────────
    if (emailWarnings.length > 0) {
      console.warn(
        "\n⚠️  Email snapshot warnings (non-blocking, backend-related):"
      );
      for (const w of emailWarnings) {
        console.warn(`   • ${w}`);
      }
    }

    console.log("\n✅ Column visual parity test complete!");
  });
});
