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
 * Enter the Designer's actual Preview mode by clicking "View Preview".
 *
 * This activates the real preview rendering (non-editable, no sidebar,
 * editing chrome hidden via `.courier-editor-preview-mode` CSS) which
 * gives a much more faithful comparison to the rendered email than
 * manually disabling editing and injecting CSS overrides.
 *
 * Returns a locator for the preview editor root.
 */
export async function enterPreviewMode(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "View Preview" }).click();
  await page.waitForTimeout(500);

  // Hide the floating PreviewPanel so it doesn't overlap screenshot areas
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
 * Exit the Designer's Preview mode by clicking "Exit Preview".
 */
export async function exitPreviewMode(page: Page): Promise<void> {
  // Re-show the PreviewPanel so the Exit button is clickable
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
