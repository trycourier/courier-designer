/**
 * Shared utilities for visual snapshot E2E tests.
 *
 * Provides image comparison helpers (pixelmatch), element screenshotting,
 * and email page normalization. Used by visual-snapshot.spec.ts and
 * paragraph-visual.spec.ts.
 */

import type { Locator, Page, TestInfo } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════

/** Per-element diff threshold (% of differing pixels allowed) */
export const MAX_DIFF_PERCENT = 25;

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

  // Hide action-overlay icons via CSS injection
  await page.addStyleTag({
    content: `
      .node-actions, .sortable-handle, [data-drag-handle],
      .courier-dnd-handle, .block-actions, .action-overlay,
      [class*="action-button"], [class*="drag-handle"] {
        display: none !important;
      }
      .ProseMirror .node-element { outline: none !important; box-shadow: none !important; }
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
 * Images are padded to the same size before comparison.
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

  const padded1 = createPaddedCanvas(img1, width, height);
  const padded2 = createPaddedCanvas(img2, width, height);
  const diff = new PNG({ width, height });

  const diffPixels = pixelmatch(padded1.data, padded2.data, diff.data, width, height, {
    threshold: 0.3,
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

function createPaddedCanvas(
  img: { width: number; height: number; data: Buffer },
  targetWidth: number,
  targetHeight: number
): { data: Buffer; width: number; height: number } {
  const data = Buffer.alloc(targetWidth * targetHeight * 4, 255);
  const xOffset = Math.floor((targetWidth - img.width) / 2);

  for (let y = 0; y < img.height && y < targetHeight; y++) {
    for (let x = 0; x < img.width && x + xOffset < targetWidth; x++) {
      const srcIdx = (y * img.width + x) * 4;
      const dstIdx = (y * targetWidth + (x + xOffset)) * 4;
      data[dstIdx] = img.data[srcIdx];
      data[dstIdx + 1] = img.data[srcIdx + 1];
      data[dstIdx + 2] = img.data[srcIdx + 2];
      data[dstIdx + 3] = img.data[srcIdx + 3];
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
