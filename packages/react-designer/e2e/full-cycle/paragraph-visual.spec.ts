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
  insertDivider,
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
    uniqueText: "Center aligned text",
    setup: async (page) => {
      // Type first, then set alignment via UI (bubble menu requires text to click on)
      await typeText(page, "Center aligned text.");
      await setAlignment(page, "center");
    },
  },
  {
    name: "align-right",
    uniqueText: "Right aligned text",
    setup: async (page) => {
      await typeText(page, "Right aligned text.");
      await setAlignment(page, "right");
    },
  },
  {
    name: "align-justify",
    uniqueText: "Justified paragraph with enough",
    setup: async (page) => {
      await typeText(
        page,
        "Justified paragraph with enough words to demonstrate full justification across the entire width of the content area."
      );
      await setAlignment(page, "justify");
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
    name: "underline",
    uniqueText: "underlined text alone for",
    setup: async (page) => {
      await typeText(page, "This paragraph has ");
      await toggleUnderline(page);
      await typeText(page, "underlined text");
      await toggleUnderline(page);
      await typeText(page, " alone for underline rendering check.");
    },
  },
  {
    name: "strikethrough",
    uniqueText: "struck-through text alone for",
    setup: async (page) => {
      await typeText(page, "This paragraph has ");
      await toggleStrike(page);
      await typeText(page, "struck-through text");
      await toggleStrike(page);
      await typeText(page, " alone for strikethrough rendering check.");
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
    name: "stacked-marks",
    uniqueText: "all marks stacked on same",
    setup: async (page) => {
      await typeText(page, "Text with ");
      await toggleItalic(page);
      await toggleUnderline(page);
      await toggleStrike(page);
      await typeText(page, "all marks stacked on same");
      await toggleStrike(page);
      await toggleUnderline(page);
      await toggleItalic(page);
      await typeText(page, " word for combined rendering.");
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
  {
    name: "bold-link",
    uniqueText: "bold link rendering check",
    setup: async (page) => {
      await typeText(page, "Text with ");
      await toggleBold(page);
      const linkText = "bold linked words";
      await typeText(page, linkText);
      await applyLink(page, linkText.length, "https://example.com");
      await toggleBold(page);
      await typeText(page, " for bold link rendering check.");
    },
  },
  {
    name: "italic-link",
    uniqueText: "italic link rendering check",
    setup: async (page) => {
      await typeText(page, "Text with ");
      await toggleItalic(page);
      const linkText = "italic linked words";
      await typeText(page, linkText);
      await applyLink(page, linkText.length, "https://example.com");
      await toggleItalic(page);
      await typeText(page, " for italic link rendering check.");
    },
  },
  {
    name: "formatted-link",
    uniqueText: "combined link format check",
    setup: async (page) => {
      await typeText(page, "Text with ");
      await toggleBold(page);
      await toggleItalic(page);
      await toggleUnderline(page);
      const linkText = "multi-styled linked words";
      await typeText(page, linkText);
      await applyLink(page, linkText.length, "https://example.com");
      await toggleUnderline(page);
      await toggleItalic(page);
      await toggleBold(page);
      await typeText(page, " for combined link format check.");
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
  {
    name: "bold-with-variable",
    uniqueText: "bold greeting with variable for",
    setup: async (page) => {
      await toggleBold(page);
      await typeText(page, "Hello: ");
      await toggleBold(page);
      await insertVariable(page, "user");
      await typeText(page, " bold greeting with variable for combined test.");
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
      await typeText(page, "Styled combo: ");
      await toggleBold(page);
      await typeText(page, "centered bold");
      await toggleBold(page);
      await typeText(page, " with padding, background, and border.");
      await setAlignment(page, "center");
    },
    frameAttrs: {
      paddingVertical: 16,
      paddingHorizontal: 24,
      backgroundColor: "#F0FDF4",
      borderWidth: 2,
      borderColor: "#7C3AED",
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

test.describe("Paragraph Visual Parity: Designer vs Rendered Email", () => {
  test.skip(
    !COURIER_AUTH_TOKEN,
    "COURIER_AUTH_TOKEN not set – skipping paragraph visual test"
  );

  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await loadDesignerEditor(page);
    await resetEditor(page);
  });

  test("all paragraph variants visual parity", async ({
    page,
    request,
    browser,
  }) => {
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

      // Insert a divider between each paragraph variant.
      // This forces the TipTap→Elemental converter to emit separate text
      // elements (consecutive paragraphs would merge into one).
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
    console.log(`  ✓ ${VARIANTS.length} paragraphs created via UI`);

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
    const requestId = await sendNotification(request, emailElements, templateData);
    console.log(`  ✓ Sent, requestId: ${requestId}`);

    // ─── Step 4: Poll for rendered HTML ──────────────────────────────
    console.log("Step 4: Polling for rendered email...");

    const { renderedHtml } = await pollForRenderedHtml(request, requestId);
    expect(renderedHtml).toBeTruthy();

    // ─── Step 5: Email baseline snapshots ────────────────────────────
    console.log("Step 5: Checking Email baselines...");

    const emailPage = await browser.newPage({ viewport: { width: 700, height: 2400 } });
    await emailPage.setContent(renderedHtml!, { waitUntil: "networkidle" });
    await emailPage.waitForTimeout(500);

    // Normalize email chrome before screenshots
    await normalizeEmailPage(emailPage);

    for (const v of VARIANTS) {
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
      await expect(locator).toHaveScreenshot(`email-${v.name}.png`);
    }
    console.log(`  ✓ ${VARIANTS.length} Email baselines checked`);

    await emailPage.close();

    console.log("\n✅ Paragraph visual parity test complete!");
  });
});
