import { test, expect } from "@playwright/test";
import {
  COURIER_AUTH_TOKEN,
  loadDesignerEditor,
  resetEditor,
  saveTemplate,
  publishTemplate,
  sendAndGetRenderedHtml,
} from "./full-cycle-utils";

/**
 * Full-Cycle E2E: Link rendering
 *
 * Creates a paragraph with a hyperlink via the editor's link command,
 * sends through the Courier backend, and verifies the rendered email
 * contains an <a> tag with the correct href.
 */

test.describe("Full Cycle: Link → Backend → Email Render", () => {
  test.skip(!COURIER_AUTH_TOKEN, "COURIER_AUTH_TOKEN not set – skipping full-cycle test");
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    await loadDesignerEditor(page);
    await resetEditor(page);
  });

  test("create link, send notification, verify rendered email contains anchor tag", async ({
    page,
    request,
  }) => {
    const editor = page.locator(
      '[data-testid="email-editor"] .tiptap.ProseMirror[contenteditable="true"]'
    );

    // ─── Step 1: Type text and create a link using commands ───────────
    console.log("Step 1: Creating content with a link...");

    await editor.click();
    await page.waitForTimeout(300);

    await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (ed) {
        ed.commands.setContent("<p>Visit our website for more info</p>");
        // Select "our website"
        ed.commands.setTextSelection({ from: 7, to: 18 });
        ed.commands.setLink({ href: "https://example.com/test-link", target: "_blank" });
      }
    });
    await page.waitForTimeout(300);

    // Verify the link exists in the editor
    const hasLinkInEditor = await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!ed) return false;
      let found = false;
      ed.state.doc.descendants((node: any) => {
        if (
          node.isText &&
          node.text?.includes("our website") &&
          node.marks?.some(
            (m: any) => m.type.name === "link" && m.attrs.href === "https://example.com/test-link"
          )
        ) {
          found = true;
          return false;
        }
      });
      return found;
    });
    expect(hasLinkInEditor).toBe(true);
    console.log("  ✓ Link created in editor");

    // ─── Step 2: Save ────────────────────────────────────────────────
    console.log("Step 2: Saving template...");
    await saveTemplate(page);
    console.log("  ✓ Template saved");

    // ─── Step 3: Publish ─────────────────────────────────────────────
    console.log("Step 3: Publishing template...");
    await publishTemplate(page);
    console.log("  ✓ Template published");

    // ─── Step 4: Send and get rendered HTML ──────────────────────────
    console.log("Step 4: Sending notification and polling for render...");
    const { emailElements, renderedHtml, messageStatus } = await sendAndGetRenderedHtml(
      page,
      request
    );

    console.log(`  Message status: ${messageStatus}`);

    // ─── Step 5: Verify Elemental content ────────────────────────────
    console.log("Step 5: Verifying Elemental content...");

    const textElement = emailElements.find((el: any) => el.type === "text");
    expect(textElement, "Elemental should contain a text element").toBeTruthy();

    // The text element should have elements with a link node
    const elements = textElement.elements as Array<{
      type: string;
      content?: string;
      href?: string;
    }>;
    const linkEl = elements?.find(
      (el) =>
        el.type === "link" &&
        el.href === "https://example.com/test-link" &&
        el.content === "our website"
    );
    expect(
      linkEl,
      `Elemental should contain a link element with href "https://example.com/test-link", got: ${JSON.stringify(elements)}`
    ).toBeTruthy();
    console.log("  ✓ Elemental contains link element with correct href");

    // ─── Step 6: Verify rendered email ───────────────────────────────
    console.log("Step 6: Verifying rendered HTML...");

    expect(renderedHtml).toContain("https://example.com/test-link");
    console.log("  ✓ Rendered HTML contains the link href");

    const hasAnchorTag =
      renderedHtml!.includes('href="https://example.com/test-link"') ||
      renderedHtml!.includes("href='https://example.com/test-link'") ||
      renderedHtml!.includes("href=https://example.com/test-link");
    expect(hasAnchorTag).toBe(true);
    console.log("  ✓ Rendered HTML contains an anchor tag with correct href");

    expect(renderedHtml).toContain("our website");
    console.log("  ✓ Rendered HTML contains link text");

    console.log("\n✅ Link full-cycle test complete!");
  });
});
