/**
 * Shared utilities for visual baseline E2E tests.
 *
 * Provides preview-mode helpers for the Designer and email page
 * normalization for rendered-email screenshots.
 */

import type { Locator, Page } from "@playwright/test";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

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

  await page.addStyleTag({
    content: `
      .node-actions, .sortable-handle, [data-drag-handle],
      .courier-dnd-handle, .block-actions, .action-overlay,
      [class*="action-button"], [class*="drag-handle"] {
        display: none !important;
      }
      .ProseMirror .node-element { outline: none !important; box-shadow: none !important; }
      .ProseMirror .node-element { padding: 1px 0 !important; }
      .ProseMirror .node-element::before,
      .ProseMirror .node-element > div::before,
      .ProseMirror .node-element > hr::before,
      .ProseMirror .draggable-item::before {
        display: none !important;
      }
      .ProseMirror .selected-element { outline: none !important; box-shadow: none !important; }
      [data-tippy-root], .tippy-box, [data-testid="bubble-text-menu"] {
        display: none !important;
      }
      .ProseMirror .courier-inline-flex { margin: 0 !important; }
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

/**
 * Enter the Designer's actual Preview mode by clicking "View Preview".
 *
 * This activates the real preview rendering (non-editable, no sidebar,
 * editing chrome hidden via `.courier-editor-preview-mode` CSS) which
 * gives a more faithful comparison to the rendered email than the
 * CSS-injection approach used by `enterPreviewMode`.
 *
 * Returns a locator for the preview editor root.
 */
export async function enterRealPreviewMode(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "View Preview" }).click();
  await page.waitForTimeout(500);

  await page.evaluate(() => {
    document
      .querySelectorAll(".courier-sticky.courier-bottom-0")
      .forEach((el) => {
        (el as HTMLElement).style.display = "none";
      });
  });
  await page.waitForTimeout(200);

  return page.locator('[data-testid="email-editor"] .tiptap.ProseMirror');
}

/**
 * Exit the Designer's real Preview mode by clicking "Exit Preview".
 */
export async function exitRealPreviewMode(page: Page): Promise<void> {
  await page.evaluate(() => {
    document
      .querySelectorAll(".courier-sticky.courier-bottom-0")
      .forEach((el) => {
        (el as HTMLElement).style.display = "";
      });
  });
  await page.waitForTimeout(200);

  await page.getByRole("button", { name: "Exit Preview" }).click();
  await page.waitForTimeout(300);
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
 * borders, and formatting so screenshots capture real differences.
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
    //    Skip column wrappers — their backgrounds are user-set content
    //    styling (border simulation and column background), not chrome.
    document.querySelectorAll(".c--block").forEach((block) => {
      if (
        block.classList.contains("c--block-columns-outer") ||
        block.classList.contains("c--block-columns")
      ) {
        return;
      }
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
// Screenshot Comparison
// ═══════════════════════════════════════════════════════════════════════

/**
 * Pixel-level comparison of two PNG screenshot buffers.
 *
 * Uses pixelmatch (the same library Playwright uses internally for
 * `toHaveScreenshot()`) to compare decoded pixel data rather than raw
 * PNG bytes, eliminating false positives from PNG encoding non-determinism.
 *
 * @param actual   - The screenshot just captured
 * @param baseline - The stored baseline screenshot
 * @param options.threshold    - Per-pixel colour-distance threshold (0–1, default 0.1)
 * @param options.maxDiffRatio - Max fraction of differing pixels to still count as a match (default 0.001 = 0.1%)
 */
export function compareScreenshots(
  actual: Buffer,
  baseline: Buffer,
  options: { threshold?: number; maxDiffRatio?: number } = {}
): { match: boolean; diffPixelCount: number; diffRatio: number } {
  const { threshold = 0.1, maxDiffRatio = 0.001 } = options;

  const img1 = PNG.sync.read(actual);
  const img2 = PNG.sync.read(baseline);

  if (img1.width !== img2.width || img1.height !== img2.height) {
    return { match: false, diffPixelCount: -1, diffRatio: 1 };
  }

  const totalPixels = img1.width * img1.height;
  const diffPixelCount = pixelmatch(
    img1.data,
    img2.data,
    null,
    img1.width,
    img1.height,
    { threshold }
  );
  const diffRatio = diffPixelCount / totalPixels;

  return {
    match: diffRatio <= maxDiffRatio,
    diffPixelCount,
    diffRatio,
  };
}
