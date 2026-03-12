/**
 * Shared utilities for visual baseline E2E tests.
 *
 * Provides preview-mode helpers for the Designer and email page
 * normalization for rendered-email screenshots.
 */

import type { Locator, Page } from "@playwright/test";

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
