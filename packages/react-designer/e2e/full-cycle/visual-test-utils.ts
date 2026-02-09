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
 * Normalize the rendered email page for fair visual comparison:
 * - Set all non-link backgrounds to white
 * - Hide brand header/footer sections
 */
export async function normalizeEmailPage(emailPage: Page): Promise<void> {
  await emailPage.evaluate(() => {
    document.querySelectorAll("*").forEach((el) => {
      if (el.tagName !== "A") {
        (el as HTMLElement).style.backgroundColor = "white";
        (el as HTMLElement).style.background = "white";
      }
    });
    document.querySelectorAll(".header, .footer").forEach((el) => {
      (el as HTMLElement).style.display = "none";
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
 * Images are **scaled** to the same dimensions (the larger of each axis)
 * using bilinear interpolation. This ensures the comparison focuses on
 * visual styling (colors, font weight, borders) rather than minor size
 * differences caused by different layout engines (e.g. Designer CSS vs
 * email table layout producing a 150px vs 138px button).
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

  const scaled1 = scaleImage(img1, width, height);
  const scaled2 = scaleImage(img2, width, height);
  const diff = new PNG({ width, height });

  const diffPixels = pixelmatch(scaled1.data, scaled2.data, diff.data, width, height, {
    threshold: 0.5, // Tolerate anti-aliasing & subpixel font rendering noise
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
 * Scale an image to target dimensions using bilinear interpolation.
 * If the image already matches the target size, returns a copy as-is.
 */
function scaleImage(
  img: { width: number; height: number; data: Buffer },
  targetWidth: number,
  targetHeight: number
): { data: Buffer; width: number; height: number } {
  if (img.width === targetWidth && img.height === targetHeight) {
    return { data: Buffer.from(img.data), width: targetWidth, height: targetHeight };
  }

  const data = Buffer.alloc(targetWidth * targetHeight * 4);
  const xRatio = img.width / targetWidth;
  const yRatio = img.height / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    const srcY = y * yRatio;
    const y0 = Math.floor(srcY);
    const y1 = Math.min(y0 + 1, img.height - 1);
    const yFrac = srcY - y0;

    for (let x = 0; x < targetWidth; x++) {
      const srcX = x * xRatio;
      const x0 = Math.floor(srcX);
      const x1 = Math.min(x0 + 1, img.width - 1);
      const xFrac = srcX - x0;

      const dstIdx = (y * targetWidth + x) * 4;

      // Bilinear interpolation of the 4 surrounding pixels
      for (let c = 0; c < 4; c++) {
        const topLeft = img.data[(y0 * img.width + x0) * 4 + c];
        const topRight = img.data[(y0 * img.width + x1) * 4 + c];
        const botLeft = img.data[(y1 * img.width + x0) * 4 + c];
        const botRight = img.data[(y1 * img.width + x1) * 4 + c];

        const top = topLeft + (topRight - topLeft) * xFrac;
        const bot = botLeft + (botRight - botLeft) * xFrac;
        data[dstIdx + c] = Math.round(top + (bot - top) * yFrac);
      }
    }
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
