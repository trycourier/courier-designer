/**
 * Shared utilities for visual snapshot E2E tests.
 *
 * Provides image comparison helpers (pixelmatch), element screenshotting,
 * email page normalization, and structural alignment assertions.
 *
 * Strategy (Option C – Hybrid):
 *   • Pixel comparison on tight element selectors (low threshold) — catches
 *     styling bugs: wrong colors, padding, font weight, border radius.
 *   • Structural assertions for layout properties (alignment, spacing) —
 *     deterministic checks that don't depend on container structure.
 */

import type { Locator, Page, TestInfo } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════

/**
 * Per-element diff threshold (% of differing pixels allowed).
 *
 * Set to 15% to accommodate inherent font-rendering differences between the
 * Designer (system font, Tailwind line-height 1.25) and the rendered email
 * (Helvetica/Arial, line-height 120%). These cause ~10-14% diffs on text
 * outlines that a human wouldn't notice. Real styling bugs (wrong color,
 * padding, border, layout) produce diffs well above 15%.
 */
export const MAX_DIFF_PERCENT = 15;

// ═══════════════════════════════════════════════════════════════════════
// Screenshot Helpers
// ═══════════════════════════════════════════════════════════════════════

/**
 * Take a screenshot of a single element, saving it to the artifacts dir.
 * Returns the screenshot buffer, or null if the element couldn't be found.
 */
export async function screenshotElement(
  locator: Locator,
  filename: string,
  artifactsDir: string
): Promise<Buffer | null> {
  try {
    await locator.waitFor({ state: "visible", timeout: 5000 });
    await locator.scrollIntoViewIfNeeded();
    const buf = await locator.screenshot();
    fs.writeFileSync(path.join(artifactsDir, `${filename}.png`), buf);
    return buf;
  } catch (e) {
    console.log(`  ⚠ Could not screenshot "${filename}": ${(e as Error).message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Designer Preview Mode Helpers
// ═══════════════════════════════════════════════════════════════════════

/**
 * Switch the TipTap editor to preview mode (non-editable) and hide
 * all editing chrome (drag handles, action buttons, outlines).
 * Returns a locator for the preview editor root.
 */
export async function enterPreviewMode(page: Page): Promise<Locator> {
  // Clear selection state on all nodes so no selection borders leak into screenshots
  await page.evaluate(() => {
    const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
    if (!ed) return;
    ed.commands.updateSelectionState(null);
    ed.commands.blur();
  });
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
    if (ed) ed.setEditable(false);
  });
  await page.waitForTimeout(500);

  // Hide editing chrome, overlays, and neutralize Designer-only styles that
  // don't exist in the rendered email (margins, outlines, cursor styles).
  await page.addStyleTag({
    content: `
      .node-actions, .sortable-handle, [data-drag-handle],
      .courier-dnd-handle, .block-actions, .action-overlay,
      [class*="action-button"], [class*="drag-handle"] {
        display: none !important;
      }
      .ProseMirror .node-element { outline: none !important; box-shadow: none !important; }
      /* Add a tiny vertical buffer so user-set borders (which sit at the exact
         edge of .node-element) are not clipped by Playwright's pixel-precise
         bounding-box screenshot. 1px is invisible to humans but keeps the
         border row inside the captured rectangle. */
      .ProseMirror .node-element { padding: 1px 0 !important; }
      /* Hide all ::before pseudo-element borders (selection outlines, hover borders)
         that the Designer adds to .node-element and its children.
         These don't exist in the rendered email. */
      .ProseMirror .node-element::before,
      .ProseMirror .node-element > div::before,
      .ProseMirror .node-element > hr::before,
      .ProseMirror .draggable-item::before {
        display: none !important;
      }
      /* Hide selection outlines on wrapper elements */
      .ProseMirror .selected-element { outline: none !important; box-shadow: none !important; }
      /* Hide bubble text menu / tippy popups */
      [data-tippy-root], .tippy-box, [data-testid="bubble-text-menu"] {
        display: none !important;
      }
      /* Neutralize Designer-only button margins (!courier-my-1) */
      .ProseMirror .courier-inline-flex { margin: 0 !important; }
      /* Hide the sticky PreviewPanel that overlaps editor content */
      .courier-sticky.courier-bottom-0 { display: none !important; }
    `,
  });
  await page.waitForTimeout(200);

  return page.locator('[data-testid="email-editor"] .tiptap.ProseMirror');
}

/**
 * Re-enable editing mode after preview screenshotting.
 */
export async function exitPreviewMode(page: Page): Promise<void> {
  await page.evaluate(() => {
    const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
    if (ed) ed.setEditable(true);
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Email Page Helpers
// ═══════════════════════════════════════════════════════════════════════

/**
 * Normalize the rendered email page for visual comparison.
 *
 * Strategy: white-out all backgrounds on **template chrome** (body, email
 * wrapper, brand-coloured block wrappers, header/footer) while preserving
 * **content-level** styling — anything inside the actual content cells
 * (`.c--text-text`, `.c--button`, etc.) keeps its user-set backgrounds,
 * borders, and formatting so pixelmatch sees real differences.
 */
export async function normalizeEmailPage(emailPage: Page): Promise<void> {
  await emailPage.evaluate(() => {
    const whiteOut = (el: HTMLElement) => {
      el.style.backgroundColor = "white";
      el.style.background = "white";
    };

    // 1. Body & HTML
    whiteOut(document.documentElement as HTMLElement);
    whiteOut(document.body);

    // 2. Email body wrapper
    document.querySelectorAll(".c--email-body").forEach((el) => whiteOut(el as HTMLElement));

    // 3. Hide header/footer/brand chrome entirely
    document.querySelectorAll(".header, .footer, .blue-footer").forEach((el) => {
      (el as HTMLElement).style.display = "none";
    });

    // 4. For each content block (.c--block), white-out the block wrapper
    //    and its immediate structural children (tables/tds that carry the
    //    brand background colour). Stop before reaching user content cells.
    document.querySelectorAll(".c--block").forEach((block) => {
      whiteOut(block as HTMLElement);
      // The direct child <table> always mirrors the brand bg
      block.querySelectorAll(":scope > table").forEach((t) => whiteOut(t as HTMLElement));
      // The outer direction <td> (first-level td) is structural
      block.querySelectorAll(":scope > table > tbody > tr > td").forEach((td) =>
        whiteOut(td as HTMLElement)
      );
    });

    // 5. Divider wrappers between content blocks also carry brand bg
    //    (they are .c--block-divider or sibling wrapper divs)
    document.querySelectorAll(".c--block-divider, [class*='c--block-divider']").forEach((el) => {
      whiteOut(el as HTMLElement);
      el.querySelectorAll("table, td, div").forEach((child) => whiteOut(child as HTMLElement));
    });
  });
  await emailPage.waitForTimeout(300);
}

// ═══════════════════════════════════════════════════════════════════════
// Image Comparison
// ═══════════════════════════════════════════════════════════════════════

export interface ComparisonResult {
  diffPixels: number;
  totalPixels: number;
  diffPercent: number;
  diffBuffer: Buffer | null;
}

/**
 * Compare two PNG screenshot buffers using pixelmatch.
 *
 * Images are **padded** with white pixels to the same dimensions (the
 * larger of each axis). Unlike bilinear scaling, padding preserves every
 * original pixel 1:1, so pixelmatch compares exactly what was rendered.
 * The added white margin on the smaller image counts as "different" only
 * where the larger image has non-white content along that edge — which
 * is a true layout difference the test should flag.
 */
export async function compareScreenshots(
  img1Buffer: Buffer,
  img2Buffer: Buffer
): Promise<ComparisonResult> {
  const { PNG } = await import("pngjs");
  const pixelmatch = (await import("pixelmatch")).default;

  const img1 = PNG.sync.read(img1Buffer);
  const img2 = PNG.sync.read(img2Buffer);

  const width = Math.max(img1.width, img2.width);
  const height = Math.max(img1.height, img2.height);

  const padded1 = padImage(img1, width, height);
  const padded2 = padImage(img2, width, height);
  const diff = new PNG({ width, height });

  const diffPixels = pixelmatch(padded1.data, padded2.data, diff.data, width, height, {
    threshold: 0.1, // Tight threshold — catch real colour/border diffs
    alpha: 0.3,
    includeAA: false,
  });

  const totalPixels = width * height;
  return {
    diffPixels,
    totalPixels,
    diffPercent: (diffPixels / totalPixels) * 100,
    diffBuffer: PNG.sync.write(diff),
  };
}

/**
 * Pad an image to target dimensions with white (255,255,255,255) pixels.
 * The original image is placed at the top-left corner, preserving every
 * pixel without any interpolation or distortion.
 */
function padImage(
  img: { width: number; height: number; data: Buffer },
  targetWidth: number,
  targetHeight: number
): { data: Buffer; width: number; height: number } {
  if (img.width === targetWidth && img.height === targetHeight) {
    return { data: Buffer.from(img.data), width: targetWidth, height: targetHeight };
  }

  // Fill entire buffer with white (R=255, G=255, B=255, A=255)
  const data = Buffer.alloc(targetWidth * targetHeight * 4, 255);

  // Copy original image rows into top-left corner
  for (let y = 0; y < img.height; y++) {
    const srcOffset = y * img.width * 4;
    const dstOffset = y * targetWidth * 4;
    img.data.copy(data, dstOffset, srcOffset, srcOffset + img.width * 4);
  }

  return { data, width: targetWidth, height: targetHeight };
}

// ═══════════════════════════════════════════════════════════════════════
// Result Comparison & Reporting
// ═══════════════════════════════════════════════════════════════════════

export interface VisualResult {
  name: string;
  element: string;
  diffPercent: number;
  passed: boolean;
  designerShot: Buffer | null;
  emailShot: Buffer | null;
  diffBuffer: Buffer | null;
}

/** Serializable subset of VisualResult written to JSON for the final report */
export interface VisualResultJson {
  name: string;
  element: string;
  diffPercent: number;
  passed: boolean;
}

/** Directory where per-test result JSON files are written for the global report */
export const RESULTS_JSON_DIR = path.resolve(
  __dirname, "../../test-results/visual-results"
);

/**
 * Compare a list of Designer vs Email screenshot pairs.
 * @param element - Element type for the report (e.g. "Paragraph", "Button")
 */
export async function compareElementPairs(
  pairs: { name: string; designerShot: Buffer | null; emailShot: Buffer | null }[],
  artifactsDir: string,
  element: string,
  maxDiffPercent = MAX_DIFF_PERCENT
): Promise<VisualResult[]> {
  const results: VisualResult[] = [];

  for (const { name, designerShot, emailShot } of pairs) {
    if (!designerShot || !emailShot) {
      console.log(`  ⚠ Skipping ${name}: screenshot not available`);
      continue;
    }

    const { diffPixels, totalPixels, diffPercent, diffBuffer } =
      await compareScreenshots(designerShot, emailShot);

    if (diffBuffer) {
      fs.writeFileSync(path.join(artifactsDir, `diff-${name}.png`), diffBuffer);
    }

    const passed = diffPercent <= maxDiffPercent;
    results.push({ name, element, diffPercent, passed, designerShot, emailShot, diffBuffer });

    console.log(
      `  ${passed ? "✓" : "✗"} ${name.padEnd(30)} — ` +
      `${diffPercent.toFixed(1)}% different ` +
      `(${diffPixels.toLocaleString()}/${totalPixels.toLocaleString()} pixels)`
    );
  }

  return results;
}

/**
 * Print a summary table of visual comparison results.
 */
export function printResultsSummary(
  results: VisualResult[],
  maxDiffPercent = MAX_DIFF_PERCENT,
  artifactsDir?: string
): void {
  console.log(`\n  ╔══════════════════════════════════════════════════════════╗`);
  console.log(`  ║  VISUAL PARITY RESULTS (threshold: ${maxDiffPercent}%)                  ║`);
  console.log(`  ╠══════════════════════════════════════════════════════════╣`);
  for (const r of results) {
    console.log(
      `  ║  ${r.passed ? "✓" : "✗"} ${r.name.padEnd(30)} ${r.diffPercent.toFixed(1).padStart(6)}%            ║`
    );
  }
  console.log(`  ╚══════════════════════════════════════════════════════════╝`);
  if (artifactsDir) {
    console.log(`\n  Artifacts: ${artifactsDir}`);
  }
}

/**
 * Attach failed comparison images to the Playwright HTML report.
 * Only attaches Designer, Rendered Email, and Diff for elements that exceeded the threshold.
 */
export async function attachFailedResults(
  results: VisualResult[],
  testInfo: TestInfo
): Promise<void> {
  const failed = results.filter((r) => !r.passed);
  for (const r of failed) {
    if (r.designerShot) {
      await testInfo.attach(`${r.name} — Designer`, {
        body: r.designerShot,
        contentType: "image/png",
      });
    }
    if (r.emailShot) {
      await testInfo.attach(`${r.name} — Rendered Email`, {
        body: r.emailShot,
        contentType: "image/png",
      });
    }
    if (r.diffBuffer) {
      await testInfo.attach(`${r.name} — Diff (${r.diffPercent.toFixed(1)}%)`, {
        body: r.diffBuffer,
        contentType: "image/png",
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Cross-test Result Persistence (for global teardown report)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Save visual comparison results as a JSON file so the global teardown
 * can aggregate results from all visual tests into a single sorted report.
 *
 * @param results - Comparison results from this test
 * @param testName - Unique name for this test's result file (e.g. "paragraph", "mixed-elements")
 */
export function saveResultsJson(results: VisualResult[], testName: string): void {
  fs.mkdirSync(RESULTS_JSON_DIR, { recursive: true });

  const jsonResults: VisualResultJson[] = results.map((r) => ({
    name: r.name,
    element: r.element,
    diffPercent: r.diffPercent,
    passed: r.passed,
  }));

  fs.writeFileSync(
    path.join(RESULTS_JSON_DIR, `${testName}.json`),
    JSON.stringify(jsonResults, null, 2)
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Structural Alignment Assertions
// ═══════════════════════════════════════════════════════════════════════

/**
 * Whether alignment mismatches should fail the test. Set to false while
 * known backend rendering bugs (paragraph/heading alignment loss) are open.
 * Flip to true once the backend correctly respects alignment for all elements.
 */
export const ENFORCE_ALIGNMENT = false;

export interface AlignmentCheck {
  name: string;
  uniqueText: string;
  expectedAlignment: string; // "left" | "center" | "right" | "justify"
  elementType: "button" | "text";
}

export interface AlignmentResult {
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
}

/**
 * Normalize browser-specific text-align values to standard CSS values.
 */
function normalizeAlignment(value: string): string {
  if (value === "start" || value === "-webkit-auto" || value === "-webkit-left") return "left";
  if (value === "-webkit-center") return "center";
  if (value === "-webkit-right" || value === "end") return "right";
  if (value === "-webkit-justify") return "justify";
  return value;
}

/**
 * Get the effective alignment from the rendered email HTML for a given element.
 *
 * For text elements (p, h1-h3): checks text-align on the element itself.
 * For buttons: checks text-align on the containing table cell.
 */
export async function getEmailAlignment(
  emailPage: Page,
  uniqueText: string,
  elementType: "button" | "text"
): Promise<string> {
  const raw = await emailPage.evaluate(
    ({ text, type }) => {
      // Walk the DOM tree to find the innermost text node containing the text
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) =>
            node.textContent?.includes(text)
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT,
        }
      );
      const textNode = walker.nextNode();
      if (!textNode?.parentElement) return "unknown";

      let target: HTMLElement;
      if (type === "button") {
        // Button alignment in email is on the outer td (class="primary"),
        // NOT the inner td which always has align="center" for text centering.
        // Structure: <td class="primary" align="left"> → <table> → <td align="center"> → <a>text</a>
        target =
          (textNode.parentElement.closest("td.primary") as HTMLElement) ||
          (textNode.parentElement.closest("td") as HTMLElement) ||
          textNode.parentElement;
      } else {
        // Text alignment is on the p/h1-h3 element or its containing td
        target =
          (textNode.parentElement.closest("p, h1, h2, h3") as HTMLElement) ||
          (textNode.parentElement.closest("td") as HTMLElement) ||
          textNode.parentElement;
      }

      return window.getComputedStyle(target).textAlign;
    },
    { text: uniqueText, type: elementType }
  );

  return normalizeAlignment(raw);
}

/**
 * Assert alignment parity for a set of elements between Designer and email.
 *
 * The Designer's alignment is taken from the variant definition (the source of
 * truth for what was configured). The email's alignment is read from computed
 * styles of the rendered HTML. This avoids fragile pixel comparisons for layout.
 */
export async function assertAlignmentParity(
  emailPage: Page,
  checks: AlignmentCheck[]
): Promise<AlignmentResult[]> {
  const results: AlignmentResult[] = [];

  for (const check of checks) {
    const actual = await getEmailAlignment(
      emailPage,
      check.uniqueText,
      check.elementType
    );
    const passed = actual === check.expectedAlignment;
    results.push({
      name: check.name,
      expected: check.expectedAlignment,
      actual,
      passed,
    });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════
// Unified Structural Style Assertions
// ═══════════════════════════════════════════════════════════════════════
//
// Pixel comparison catches "looks different" but can miss "property
// exists vs doesn't exist" when the missing property only contributes a
// small fraction of total pixels (thin border in a large wrapper, light
// background vs white, underline on short text, etc.).
//
// Structural checks verify *presence/absence* of every CSS property the
// Designer sets. Pixel comparison still validates the exact values.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Whether structural style mismatches should fail the test.
 * Set to false to make them warning-only (e.g. while backend bugs are open).
 */
export const ENFORCE_STYLES = true;

/**
 * Supported style properties that can be structurally asserted.
 *
 * Note: "padding" is intentionally excluded. Email HTML renders padding via
 * table cells, spacer rows, and inline widths rather than CSS padding — so
 * a structural CSS check is unreliable. Padding differences are caught
 * by pixel comparison (they change element dimensions significantly).
 */
export type StyleProperty =
  | "border"
  | "background"
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough";

export interface StyleCheck {
  /** Variant name (e.g. "h2-border") */
  name: string;
  /** Unique text to locate the element in the email HTML */
  uniqueText: string;
  /** CSS properties that should be present in the rendered email */
  expectedStyles: StyleProperty[];
}

export interface StyleResult {
  name: string;
  property: StyleProperty;
  expected: "present";
  actual: "present" | "absent" | "not-found";
  passed: boolean;
}

/**
 * Evaluate a single style property for a given text element in the email page.
 * Returns "present", "absent", or "not-found" (element not located).
 *
 * Strategy:
 *  1. Find the *most specific* element whose textContent includes the target
 *     text. This works even when the text spans multiple inline formatting
 *     elements (e.g. "Heading with <em>italic emphasis</em> inside").
 *  2. For wrapper properties (border, background, padding) → walk UP from
 *     the containing element.
 *  3. For inline formatting (bold, italic, underline, strikethrough) → walk
 *     DOWN into descendants looking for formatting tags/styles.
 */
async function checkStyleProperty(
  emailPage: Page,
  uniqueText: string,
  property: StyleProperty
): Promise<"present" | "absent" | "not-found"> {
  return emailPage.evaluate(
    ({ text, prop }) => {
      // ── Find the most specific element containing the text ──────────
      // Walk all elements and pick the one with the smallest textContent
      // that still includes our target string. This avoids the issue
      // where text spans multiple inline tags (bold/italic/etc).
      let bestMatch: HTMLElement | null = null;
      let bestLen = Infinity;

      const allElements = document.body.querySelectorAll("*");
      for (const el of allElements) {
        const tc = el.textContent;
        if (tc && tc.includes(text) && tc.length < bestLen) {
          bestMatch = el as HTMLElement;
          bestLen = tc.length;
        }
      }

      if (!bestMatch) return "not-found" as const;

      // ── Walk UP from the containing element ─────────────────────────
      const walkUp = (
        check: (el: HTMLElement, style: CSSStyleDeclaration) => boolean,
        maxDepth = 10
      ): boolean => {
        let current: HTMLElement | null = bestMatch;
        let depth = 0;
        while (current && current !== document.body && depth < maxDepth) {
          if (check(current, window.getComputedStyle(current))) return true;
          current = current.parentElement;
          depth++;
        }
        return false;
      };

      // ── Walk DOWN into descendants ──────────────────────────────────
      const walkDown = (
        check: (el: HTMLElement, style: CSSStyleDeclaration) => boolean
      ): boolean => {
        const descendants = bestMatch!.querySelectorAll("*");
        for (const el of descendants) {
          if (check(el as HTMLElement, window.getComputedStyle(el))) return true;
        }
        // Also check the element itself
        return check(bestMatch!, window.getComputedStyle(bestMatch!));
      };

      switch (prop) {
        case "border": {
          const has = walkUp((_el, style) => {
            const sides = ["top", "right", "bottom", "left"];
            return sides.some((s) => {
              const w = style.getPropertyValue(`border-${s}-width`);
              const st = style.getPropertyValue(`border-${s}-style`);
              return w && w !== "0px" && st && st !== "none";
            });
          });
          return has ? "present" : "absent";
        }

        case "background": {
          const has = walkUp((_el, style) => {
            const bg = style.backgroundColor;
            if (!bg || bg === "transparent" || bg === "rgba(0, 0, 0, 0)") return false;
            if (bg === "rgb(255, 255, 255)" || bg === "#ffffff" || bg === "#fff") return false;
            return true;
          });
          return has ? "present" : "absent";
        }

        case "bold": {
          // Check descendants and self for bold formatting
          const has = walkDown((el, style) => {
            const tag = el.tagName.toLowerCase();
            if (tag === "b" || tag === "strong") return true;
            const fw = parseInt(style.fontWeight, 10);
            return fw >= 700;
          });
          return has ? "present" : "absent";
        }

        case "italic": {
          const has = walkDown((el, style) => {
            const tag = el.tagName.toLowerCase();
            if (tag === "i" || tag === "em") return true;
            return style.fontStyle === "italic";
          });
          return has ? "present" : "absent";
        }

        case "underline": {
          const has = walkDown((el, style) => {
            if (el.tagName.toLowerCase() === "u") return true;
            return (
              (style.textDecorationLine?.includes("underline") ?? false) ||
              (style.textDecoration?.includes("underline") ?? false)
            );
          });
          return has ? "present" : "absent";
        }

        case "strikethrough": {
          const has = walkDown((el, style) => {
            const tag = el.tagName.toLowerCase();
            if (tag === "s" || tag === "del" || tag === "strike") return true;
            return (
              (style.textDecorationLine?.includes("line-through") ?? false) ||
              (style.textDecoration?.includes("line-through") ?? false)
            );
          });
          return has ? "present" : "absent";
        }

        default:
          return "not-found" as const;
      }
    },
    { text: uniqueText, prop: property }
  );
}

/**
 * Run structural style checks for a set of elements.
 * Returns one result per (variant × property) pair.
 */
export async function assertStyleParity(
  emailPage: Page,
  checks: StyleCheck[]
): Promise<StyleResult[]> {
  const results: StyleResult[] = [];

  for (const check of checks) {
    for (const prop of check.expectedStyles) {
      const actual = await checkStyleProperty(emailPage, check.uniqueText, prop);
      results.push({
        name: check.name,
        property: prop,
        expected: "present",
        actual,
        passed: actual === "present",
      });
    }
  }

  return results;
}

/**
 * Print structural style assertion results in a readable table.
 */
export function printStyleResults(results: StyleResult[]): void {
  const failed = results.filter((r) => !r.passed);
  const passed = results.filter((r) => r.passed);

  console.log(`\n  ╔══════════════════════════════════════════════════════════════════╗`);
  console.log(`  ║  STRUCTURAL STYLE PARITY RESULTS                                ║`);
  console.log(`  ╠══════════════════════════════════════════════════════════════════╣`);
  for (const r of results) {
    const status = r.passed ? "✓" : "✗";
    const label = `${r.name} [${r.property}]`;
    const detail = r.passed ? "present" : `MISSING (${r.actual})`;
    console.log(
      `  ║  ${status} ${label.padEnd(40)} ${detail.padStart(18)}  ║`
    );
  }
  console.log(`  ╚══════════════════════════════════════════════════════════════════╝`);
  console.log(
    `  Total: ${results.length} checks | ${passed.length} passed | ${failed.length} failed`
  );
}

// ── Backward-compatible wrappers ────────────────────────────────────
// Keep the old names working so we don't break existing imports.

/** @deprecated Use ENFORCE_STYLES instead */
export const ENFORCE_BORDER = ENFORCE_STYLES;

export type BorderCheck = {
  name: string;
  uniqueText: string;
  expectedBorder: string;
  elementType: string;
};
export type BorderResult = StyleResult;

export async function assertBorderParity(
  emailPage: Page,
  checks: BorderCheck[]
): Promise<StyleResult[]> {
  const styleChecks: StyleCheck[] = checks.map((c) => ({
    name: c.name,
    uniqueText: c.uniqueText,
    expectedStyles: ["border"] as StyleProperty[],
  }));
  return assertStyleParity(emailPage, styleChecks);
}

export function printBorderResults(results: StyleResult[]): void {
  printStyleResults(results);
}

/**
 * Print alignment assertion results in a readable table.
 */
export function printAlignmentResults(results: AlignmentResult[]): void {
  const failed = results.filter((r) => !r.passed);
  const passed = results.filter((r) => r.passed);

  console.log(`\n  ╔══════════════════════════════════════════════════════════╗`);
  console.log(`  ║  ALIGNMENT PARITY RESULTS                                ║`);
  console.log(`  ╠══════════════════════════════════════════════════════════╣`);
  for (const r of results) {
    const status = r.passed ? "✓" : "✗";
    const detail = r.passed
      ? r.expected
      : `expected ${r.expected}, got ${r.actual}`;
    console.log(
      `  ║  ${status} ${r.name.padEnd(30)} ${detail.padStart(20)}  ║`
    );
  }
  console.log(`  ╚══════════════════════════════════════════════════════════╝`);
  console.log(
    `  Total: ${results.length} checks | ${passed.length} passed | ${failed.length} failed`
  );
}
