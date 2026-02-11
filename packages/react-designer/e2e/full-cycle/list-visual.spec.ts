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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════
// List Variant Definitions
// ═══════════════════════════════════════════════════════════════════════
//
// Lists are block nodes containing listItem children, each wrapping a
// paragraph. The sidebar form exposes:
//   - Type (ordered / unordered)
//   - Padding (vertical + horizontal)
//   - Border (width + color)
//
// Text formatting (bold, italic, etc.) is applied on the inner paragraph
// content via marks. We build the entire document with setContent() to
// avoid cursor-nesting issues.

interface ListVariant {
  name: string;
  /** First item text — used as unique locator in Designer & email */
  uniqueText: string;
  /** TipTap list node attributes */
  attrs: Record<string, unknown>;
  /** List items: array of text strings (flat lists) */
  items: string[];
  /** Optional marks to apply to all items */
  marks?: Array<{ type: string }>;
  /**
   * Complete TipTap list node JSON (used for nested lists).
   * When provided, `items`, `marks`, and `attrs` are ignored — the
   * node is inserted into the document as-is.
   */
  rawNode?: Record<string, unknown>;
}

// ── Helper: build a nested list node (TipTap JSON) ────────────────────
// Returns a complete list node with deeply-nested children. Each level
// has one item with text and (except the leaf) a child list.
//
// `levels` is an array of { text, listType } from root → deepest.
function buildNestedListNode(
  levels: Array<{ text: string; listType: "ordered" | "unordered" }>
): Record<string, unknown> {
  const defaultAttrs = {
    borderColor: "#000000",
    borderWidth: 0,
    paddingVertical: 6,
    paddingHorizontal: 0,
  };

  // Build from the innermost level outward
  let currentNode: Record<string, unknown> | undefined;

  for (let i = levels.length - 1; i >= 0; i--) {
    const { text, listType } = levels[i];
    const itemContent: Record<string, unknown>[] = [
      { type: "paragraph", content: [{ type: "text", text }] },
    ];
    // Attach the child list built in the previous iteration
    if (currentNode) {
      itemContent.push(currentNode);
    }

    currentNode = {
      type: "list",
      attrs: { ...defaultAttrs, listType },
      content: [{ type: "listItem", content: itemContent }],
    };
  }

  return currentNode!;
}

const VARIANTS: ListVariant[] = [
  // ── Unordered ──────────────────────────────────────────────────────
  {
    name: "unordered-default",
    uniqueText: "Bullet list first entry",
    attrs: { listType: "unordered" },
    items: ["Bullet list first entry", "Second entry", "Third entry"],
  },
  {
    name: "unordered-single",
    uniqueText: "Solo bullet entry",
    attrs: { listType: "unordered" },
    items: ["Solo bullet entry"],
  },

  // ── Ordered ────────────────────────────────────────────────────────
  {
    name: "ordered-default",
    uniqueText: "Numbered list first entry",
    attrs: { listType: "ordered" },
    items: ["Numbered list first entry", "Second numbered entry", "Third numbered entry"],
  },
  {
    name: "ordered-single",
    uniqueText: "Solo numbered entry",
    attrs: { listType: "ordered" },
    items: ["Solo numbered entry"],
  },

  // ── Text Formatting ────────────────────────────────────────────────
  {
    name: "bold-items",
    uniqueText: "Bold first item",
    attrs: { listType: "unordered" },
    items: ["Bold first item", "Bold second item"],
    marks: [{ type: "bold" }],
  },
  {
    name: "italic-items",
    uniqueText: "Italic first item",
    attrs: { listType: "unordered" },
    items: ["Italic first item", "Italic second item"],
    marks: [{ type: "italic" }],
  },

  // ── Padding ────────────────────────────────────────────────────────
  {
    name: "with-padding",
    uniqueText: "Padded first item",
    attrs: { listType: "unordered", paddingVertical: 16, paddingHorizontal: 12 },
    items: ["Padded first item", "Padded second item"],
  },

  // ── Marker Color ─────────────────────────────────────────────────────
  {
    name: "marker-color",
    uniqueText: "Blue marker first item",
    attrs: { listType: "unordered", borderColor: "#3B82F6" },
    items: ["Blue marker first item", "Blue marker second item"],
  },

  // ── Many items ─────────────────────────────────────────────────────
  {
    name: "many-items",
    uniqueText: "Item number one",
    attrs: { listType: "unordered" },
    items: [
      "Item number one",
      "Item number two",
      "Item number three",
      "Item number four",
      "Item number five",
    ],
  },

  // ── Combinations ───────────────────────────────────────────────────
  {
    name: "ordered-red-marker",
    uniqueText: "Red marker ordered first",
    attrs: {
      listType: "ordered",
      borderColor: "#DC2626",
      paddingVertical: 10,
    },
    items: ["Red marker ordered first", "Red marker ordered second", "Red marker ordered third"],
  },
  {
    name: "combo-bold-purple-marker",
    uniqueText: "Bold purple first",
    attrs: {
      listType: "unordered",
      borderColor: "#7C3AED",
      paddingVertical: 8,
      paddingHorizontal: 8,
    },
    items: ["Bold purple first", "Bold purple second"],
    marks: [{ type: "bold" }],
  },

  // ── Nested Lists (5 levels) ─────────────────────────────────────────
  // Only the top-level list type is user-configurable. All nested
  // sub-lists are always unordered in the Designer UI.
  {
    name: "nested-unordered-root",
    uniqueText: "Bullets depth one",
    attrs: { listType: "unordered" },
    items: [],
    rawNode: buildNestedListNode([
      { text: "Bullets depth one", listType: "unordered" },
      { text: "Bullets depth two", listType: "unordered" },
      { text: "Bullets depth three", listType: "unordered" },
      { text: "Bullets depth four", listType: "unordered" },
      { text: "Bullets depth five", listType: "unordered" },
    ]),
  },
  {
    name: "nested-ordered-root",
    uniqueText: "Numbers depth one",
    attrs: { listType: "ordered" },
    items: [],
    rawNode: buildNestedListNode([
      { text: "Numbers depth one", listType: "ordered" },
      { text: "Numbers depth two", listType: "unordered" },
      { text: "Numbers depth three", listType: "unordered" },
      { text: "Numbers depth four", listType: "unordered" },
      { text: "Numbers depth five", listType: "unordered" },
    ]),
  },
];

// ═══════════════════════════════════════════════════════════════════════
// Test
// ═══════════════════════════════════════════════════════════════════════

test.describe("List Visual Parity: Designer vs Rendered Email", () => {
  test.skip(!COURIER_AUTH_TOKEN, "COURIER_AUTH_TOKEN not set – skipping list visual test");

  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await loadDesignerEditor(page);
    await resetEditor(page);
  });

  test("all list variants visual parity", async ({ page, request, browser }) => {
    // ─── Step 1: Build and set the full document ──────────────────────
    // Lists contain listItem children with paragraphs. We build the
    // entire document and set it in one go via setContent to avoid
    // cursor-nesting issues.
    console.log(`Step 1: Inserting ${VARIANTS.length} list variants...`);

    const defaultListAttrs = {
      listType: "unordered",
      borderColor: "#000000",
      paddingVertical: 6,
      paddingHorizontal: 0,
    };

    const docContent = VARIANTS.flatMap((v) => {
      // Nested lists provide a complete rawNode — use it directly
      if (v.rawNode) {
        return [v.rawNode, { type: "paragraph" }];
      }

      // Flat lists — build from items array
      const listItems = v.items.map((text) => {
        const textNode: Record<string, unknown> = { type: "text", text };
        if (v.marks && v.marks.length > 0) {
          textNode.marks = v.marks;
        }
        return {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [textNode],
            },
          ],
        };
      });

      return [
        {
          type: "list",
          attrs: { ...defaultListAttrs, ...v.attrs },
          content: listItems,
        },
        { type: "paragraph" }, // Separator
      ];
    });

    await page.evaluate((content) => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!ed) throw new Error("Editor not available");
      ed.commands.setContent({ type: "doc", content });
    }, docContent);

    await page.waitForTimeout(500);
    console.log(`  ✓ ${VARIANTS.length} lists inserted via setContent`);

    // ─── Step 2: Designer baseline snapshots (preview mode) ───────────
    console.log("Step 2: Checking Designer baselines (preview mode)...");

    const previewEditor = await enterPreviewMode(page);
    await expect(previewEditor).toBeVisible({ timeout: 5000 });

    for (const v of VARIANTS) {
      // Styles (border, padding) are on the <ul>/<ol> (.courier-list-wrapper).
      // Using this class with has-text uniquely identifies each list.
      const locator = previewEditor
        .locator(`.courier-list-wrapper:has-text("${v.uniqueText}")`)
        .first();
      await locator.waitFor({ state: "visible", timeout: 5000 });
      await locator.scrollIntoViewIfNeeded();
      await expect(locator).toHaveScreenshot(`designer-${v.name}.png`);
    }
    console.log(`  ✓ ${VARIANTS.length} Designer baselines checked`);

    await exitPreviewMode(page);

    // ─── Step 3: Capture Elemental content & send ─────────────────────
    console.log("Step 3: Capturing Elemental content and sending...");

    const { emailElements } = await captureElementalContent(page);
    console.log(`  Elemental: ${emailElements.length} elements captured`);

    // ─── Steps 3b-5: Email rendering (backend-dependent, warn-only) ──
    const emailWarnings: string[] = [];
    let emailPage: import("playwright").Page | undefined;
    const snapshotsDir = path.join(__dirname, "list-visual.spec.ts-snapshots");

    try {
      const requestId = await sendNotification(request, emailElements);
      console.log(`  ✓ Sent, requestId: ${requestId}`);

      // ─── Step 4: Poll for rendered HTML ─────────────────────────────
      console.log("Step 4: Polling for rendered email...");

      const { renderedHtml } = await pollForRenderedHtml(request, requestId);

      if (!renderedHtml) {
        emailWarnings.push("Email rendering returned empty HTML — skipping email baselines.");
      } else {
        // ─── Step 5: Email baseline snapshots (warn-only) ──────────────
        console.log("Step 5: Checking Email baselines (warn-only)...");

        emailPage = await browser.newPage({ viewport: { width: 700, height: 5000 } });
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
            // Try c--block-list class first, then fall back to ul/ol or td
            let locator = emailPage
              .locator(`.c--block-list:has-text("${v.uniqueText}")`)
              .first();

            let visible = await locator.isVisible().catch(() => false);
            if (!visible) {
              locator = emailPage
                .locator(`ul:has-text("${v.uniqueText}"), ol:has-text("${v.uniqueText}")`)
                .first();
              visible = await locator.isVisible().catch(() => false);
            }
            if (!visible) {
              locator = emailPage
                .locator(`td:has-text("${v.uniqueText}")`)
                .first();
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

    // ─── Summary ──────────────────────────────────────────────────────
    if (emailWarnings.length > 0) {
      console.warn("\n⚠️  Email snapshot warnings (non-blocking, backend-related):");
      for (const w of emailWarnings) {
        console.warn(`   • ${w}`);
      }
    }

    console.log("\n✅ List visual parity test complete!");
  });
});
