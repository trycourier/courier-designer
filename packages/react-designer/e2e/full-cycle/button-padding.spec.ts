import { test, expect } from "@playwright/test";
import {
  COURIER_AUTH_TOKEN,
  loadDesignerEditor,
  resetEditor,
  captureElementalContent,
  sendNotification,
  pollForRenderedHtml,
} from "./full-cycle-utils";

/**
 * Full-Cycle E2E: Button Padding Discrepancy
 *
 * Bug report: The padding on a button in Courier Create doesn't match what's
 * rendered in the actual email. The Designer adds hidden offsets (+2 vertical,
 * +10 horizontal) on top of the Frame "padding" value, but exports only the
 * raw number to Elemental — so the rendered email ends up with different
 * padding than what the user sees while editing.
 *
 * This test verifies that the padding the user sees in the Designer matches
 * the padding in the final rendered email.
 */

test.describe("Full Cycle: Button Padding Consistency", () => {
  test.skip(!COURIER_AUTH_TOKEN, "COURIER_AUTH_TOKEN not set – skipping full-cycle test");
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    await loadDesignerEditor(page);
    await resetEditor(page);
  });

  test("button padding in Designer must match rendered email", async ({
    page,
    request,
  }) => {
    // ─── Step 1: Insert a button and set padding to 8 ───────────────
    console.log("Step 1: Inserting button with padding = 8...");

    const PADDING_VALUE = 8;
    await page.evaluate((padding) => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (ed) {
        ed.commands.clearContent();
        ed.commands.setButton({
          label: "Go Somewhere",
          link: "https://example.com",
          backgroundColor: "#4B024F",
          textColor: "#ffffff",
          alignment: "center",
          padding: padding,
          borderRadius: 4,
        });
      }
    }, PADDING_VALUE);

    await page.waitForTimeout(500);

    // Verify the button exists
    const buttonNode = await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!ed) return null;
      const json = ed.getJSON();
      return json.content?.find((n: any) => n.type === "button");
    });
    expect(buttonNode).toBeTruthy();
    expect(buttonNode.attrs.padding).toBe(PADDING_VALUE);
    console.log(`  ✓ Button inserted with padding attr = ${buttonNode.attrs.padding}`);

    // ─── Step 2: Measure the actual visual padding in the Designer ──
    console.log("Step 2: Measuring visual padding in Designer...");

    const designerPadding = await page.evaluate(() => {
      const selectors = [
        '[data-node-type="button"] .courier-inline-flex',
        '[data-type="button"] .courier-inline-flex',
        '.node-element .courier-inline-flex',
      ];
      let styledDiv: HTMLElement | null = null;
      for (const sel of selectors) {
        styledDiv = document.querySelector(sel) as HTMLElement;
        if (styledDiv) break;
      }
      if (!styledDiv) {
        const allInlineFlex = document.querySelectorAll('.courier-inline-flex');
        for (const el of allInlineFlex) {
          if ((el as HTMLElement).style.padding) {
            styledDiv = el as HTMLElement;
            break;
          }
        }
      }
      if (!styledDiv) return null;
      const computed = window.getComputedStyle(styledDiv);
      return {
        paddingTop: computed.paddingTop,
        paddingRight: computed.paddingRight,
        paddingBottom: computed.paddingBottom,
        paddingLeft: computed.paddingLeft,
        inlineStyle: styledDiv.style.padding,
      };
    });

    console.log(`  Designer visual padding: ${JSON.stringify(designerPadding)}`);
    expect(designerPadding).toBeTruthy();

    const designerPaddingTop = parseInt(designerPadding!.paddingTop);
    const designerPaddingRight = parseInt(designerPadding!.paddingRight);
    console.log(
      `  Designer renders: ${designerPaddingTop}px ${designerPaddingRight}px ` +
      `(Frame shows: ${PADDING_VALUE})`
    );

    // ─── Step 3: Capture Elemental and verify intermediate format ────
    console.log("Step 3: Capturing Elemental content...");

    const { emailElements } = await captureElementalContent(page);

    const actionElement = emailElements.find((el: any) => el.type === "action");
    console.log(`  Elemental action node: ${JSON.stringify(actionElement, null, 2)}`);
    expect(actionElement).toBeTruthy();

    const elementalPadding = actionElement.padding;
    console.log(`  Elemental padding value: "${elementalPadding}"`);

    // The Elemental export must match what the Designer displays
    const expectedPaddingStr = `${designerPaddingTop}px ${designerPaddingRight}px`;
    expect(
      elementalPadding,
      `Elemental padding "${elementalPadding}" doesn't match Designer visual "${expectedPaddingStr}". ` +
      `The Designer adds hidden offsets (+2 vertical, +10 horizontal) that aren't exported.`
    ).toBe(expectedPaddingStr);

    // ─── Step 4: Send notification ──────────────────────────────────
    console.log("Step 4: Sending notification...");

    const requestId = await sendNotification(request, emailElements);
    console.log(`  ✓ Notification sent, requestId: ${requestId}`);

    // ─── Step 5: Poll for rendered email ────────────────────────────
    console.log("Step 5: Polling for rendered email content...");

    const { renderedHtml } = await pollForRenderedHtml(request, requestId);

    // ─── Step 6: Verify button padding in rendered email ────────────
    console.log("Step 6: Verifying button padding in rendered email...");
    expect(renderedHtml).toBeTruthy();

    // Log a snippet around the button for debugging
    const buttonIdx = renderedHtml!.toLowerCase().indexOf("go somewhere");
    if (buttonIdx !== -1) {
      const start = Math.max(0, buttonIdx - 500);
      const end = Math.min(renderedHtml!.length, buttonIdx + 500);
      console.log(`  HTML around button:\n${renderedHtml!.substring(start, end)}`);
    }

    const renderedPaddingInfo = extractButtonPadding(renderedHtml!);
    console.log(`  Rendered button padding: ${JSON.stringify(renderedPaddingInfo)}`);

    // Summary
    console.log(`\n  ╔══════════════════════════════════════════════════╗`);
    console.log(`  ║  PADDING COMPARISON                              ║`);
    console.log(`  ╠══════════════════════════════════════════════════╣`);
    console.log(`  ║  Frame sidebar value:  ${PADDING_VALUE}                       ║`);
    console.log(`  ║  Designer visual:      ${designerPaddingTop}px ${designerPaddingRight}px              ║`);
    console.log(`  ║  Elemental export:     ${elementalPadding}                     ║`);
    console.log(`  ║  Rendered email:        ${renderedPaddingInfo?.summary || "unknown"}  ║`);
    console.log(`  ╚══════════════════════════════════════════════════╝\n`);

    // Assert rendered email padding matches Designer visual
    if (renderedPaddingInfo) {
      const renderedVertical = renderedPaddingInfo.paddingVertical;
      const renderedHorizontal = renderedPaddingInfo.paddingHorizontal;
      const verticalMatches = renderedVertical === designerPaddingTop;
      const horizontalMatches = renderedHorizontal === designerPaddingRight;

      console.log(
        `  ${verticalMatches ? "✓" : "✗"} Vertical padding: ` +
        `Designer=${designerPaddingTop}px, Email=${renderedVertical}px`
      );
      console.log(
        `  ${horizontalMatches ? "✓" : "✗"} Horizontal padding: ` +
        `Designer=${designerPaddingRight}px, Email=${renderedHorizontal}px`
      );

      expect(
        verticalMatches && horizontalMatches,
        `Button padding mismatch! Designer shows ${designerPaddingTop}px ${designerPaddingRight}px ` +
        `but rendered email has ${renderedVertical}px ${renderedHorizontal}px. ` +
        `The Frame sidebar value is ${PADDING_VALUE}.`
      ).toBe(true);
    }

    console.log("\n✅ Button padding test complete!");
  });
});

/**
 * Extract button padding from the rendered HTML's <a> tag.
 */
function extractButtonPadding(html: string): {
  paddingVertical: number;
  paddingHorizontal: number;
  summary: string;
  raw: string;
} | null {
  const lowerHtml = html.toLowerCase();
  const buttonTextIdx = lowerHtml.indexOf("go somewhere");
  if (buttonTextIdx === -1) return null;

  const beforeButton = html.substring(0, buttonTextIdx);
  const lastAnchorIdx = beforeButton.lastIndexOf("<a ");
  if (lastAnchorIdx === -1) return null;

  const anchorEndIdx = html.indexOf(">", lastAnchorIdx);
  if (anchorEndIdx === -1) return null;
  const anchorTag = html.substring(lastAnchorIdx, anchorEndIdx + 1);

  console.log(`  Anchor tag: ${anchorTag.substring(0, 300)}`);

  const paddingMatch = anchorTag.match(/(?<![-\w])padding\s*:\s*([^;"}]+)/i);
  if (!paddingMatch) return null;

  const paddingValue = paddingMatch[1].trim();
  console.log(`  Extracted padding value from <a>: "${paddingValue}"`);

  const parts = paddingValue.split(/\s+/).map((p) => parseInt(p, 10));

  let vertical: number, horizontal: number;
  if (parts.length === 1) {
    vertical = parts[0];
    horizontal = parts[0];
  } else if (parts.length === 2) {
    vertical = parts[0];
    horizontal = parts[1];
  } else if (parts.length === 4) {
    vertical = parts[0];
    horizontal = parts[1];
  } else {
    return null;
  }

  return {
    paddingVertical: vertical,
    paddingHorizontal: horizontal,
    summary: `${vertical}px ${horizontal}px`,
    raw: paddingValue,
  };
}
