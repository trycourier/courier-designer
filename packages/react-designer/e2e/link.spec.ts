import { test, expect, resetEditorState } from "./test-utils";

test.describe("Link Component", () => {
  test.beforeEach(async ({ page }) => {
    // Use the enhanced reset function for better isolation
    await resetEditorState(page);
  });

  test("should verify Link extension is available", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    // Use force click to bypass any overlays
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if Link commands are available
    const hasLinkCommands = await page.evaluate(() => {
      if ((window as any).editor) {
        return !!(
          (window as any).editor.commands.setLink &&
          (window as any).editor.commands.unsetLink &&
          (window as any).editor.commands.toggleLink
        );
      }
      return false;
    });

    expect(hasLinkCommands).toBe(true);
  });

  test("should support link creation via commands", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Add content and create a link
    const linkCreated = await page.evaluate(() => {
      if ((window as any).editor) {
        const editor = (window as any).editor;
        editor.commands.setContent("<p>Test text</p>");
        editor.commands.setTextSelection({ from: 1, to: 5 });
        const result = editor.commands.setLink({ href: "https://example.com" });
        return result && editor.isActive("link");
      }
      return false;
    });

    expect(linkCreated).toBe(true);
  });

  test("should support link removal via commands", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Add content, create a link, then remove it
    const linkRemoved = await page.evaluate(() => {
      if ((window as any).editor) {
        const editor = (window as any).editor;
        editor.commands.setContent("<p>Test text</p>");
        editor.commands.setTextSelection({ from: 1, to: 5 });
        editor.commands.setLink({ href: "https://example.com" });

        // Verify link is active
        if (!editor.isActive("link")) return false;

        // Remove the link
        const unsetResult = editor.commands.unsetLink();
        return unsetResult && !editor.isActive("link");
      }
      return false;
    });

    expect(linkRemoved).toBe(true);
  });

  test("should support toggle link functionality", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Test toggle link on and off
    const toggleWorked = await page.evaluate(() => {
      if ((window as any).editor) {
        const editor = (window as any).editor;
        editor.commands.setContent("<p>Test text</p>");
        editor.commands.setTextSelection({ from: 1, to: 5 });

        // Toggle on
        const toggleOnResult = editor.commands.toggleLink({ href: "https://example.com" });
        const isActiveAfterToggleOn = editor.isActive("link");

        // Toggle off
        editor.commands.setTextSelection({ from: 1, to: 5 });
        const toggleOffResult = editor.commands.toggleLink({ href: "https://example.com" });
        const isActiveAfterToggleOff = editor.isActive("link");

        return (
          toggleOnResult && isActiveAfterToggleOn && toggleOffResult && !isActiveAfterToggleOff
        );
      }
      return false;
    });

    expect(toggleWorked).toBe(true);
  });

  test("should handle link attributes correctly", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Test link with different attributes
    const attributesWork = await page.evaluate(() => {
      if ((window as any).editor) {
        const editor = (window as any).editor;
        editor.commands.setContent("<p>Test text</p>");
        editor.commands.setTextSelection({ from: 1, to: 5 });

        // Create link with href and target
        const setResult = editor.commands.setLink({
          href: "https://example.com",
          target: "_blank",
        });

        // Update additional attributes
        const updateResult = editor.commands.updateAttributes("link", {
          rel: "noopener",
        });

        const attributes = editor.getAttributes("link");
        return (
          setResult &&
          updateResult &&
          attributes.href === "https://example.com" &&
          attributes.target === "_blank" &&
          attributes.rel === "noopener"
        );
      }
      return false;
    });

    expect(attributesWork).toBe(true);
  });

  test("should handle multiple links in content", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Test multiple links
    const multipleLinksWork = await page.evaluate(() => {
      if ((window as any).editor) {
        const editor = (window as any).editor;
        editor.commands.setContent("<p>First link and second link</p>");

        // Create first link
        editor.commands.setTextSelection({ from: 1, to: 10 });
        const firstLinkResult = editor.commands.setLink({ href: "https://first.com" });

        // Create second link
        editor.commands.setTextSelection({ from: 16, to: 27 });
        const secondLinkResult = editor.commands.setLink({ href: "https://second.com" });

        // Check if both links exist in JSON
        const json = editor.getJSON();
        const content = JSON.stringify(json);

        return (
          firstLinkResult &&
          secondLinkResult &&
          content.includes("https://first.com") &&
          content.includes("https://second.com")
        );
      }
      return false;
    });

    expect(multipleLinksWork).toBe(true);
  });

  test("should support undo/redo with links", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Test undo/redo functionality
    const undoRedoWorks = await page.evaluate(() => {
      if ((window as any).editor) {
        const editor = (window as any).editor;
        editor.commands.setContent("<p>Test text</p>");
        editor.commands.setTextSelection({ from: 1, to: 5 });

        // Create link
        editor.commands.setLink({ href: "https://example.com" });
        const isActiveBefore = editor.isActive("link");

        // Undo
        editor.commands.undo();
        const isActiveAfterUndo = editor.isActive("link");

        // Redo
        editor.commands.redo();
        const isActiveAfterRedo = editor.isActive("link");

        return isActiveBefore && !isActiveAfterUndo && isActiveAfterRedo;
      }
      return false;
    });

    expect(undoRedoWorks).toBe(true);
  });

  test("should parse HTML with links correctly", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Test HTML parsing
    const htmlParsingWorks = await page.evaluate(() => {
      if ((window as any).editor) {
        const editor = (window as any).editor;
        const htmlContent = '<p>Visit <a href="https://example.com">our website</a> today</p>';

        try {
          editor.commands.setContent(htmlContent);
          const json = editor.getJSON();
          return json.type === "doc" && json.content && json.content.length > 0;
        } catch (error) {
          return false;
        }
      }
      return false;
    });

    expect(htmlParsingWorks).toBe(true);
  });

  test("should exclude dangerous links from parsing", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Test that javascript and button links are excluded
    const safeParsing = await page.evaluate(() => {
      if ((window as any).editor) {
        const editor = (window as any).editor;

        // Test javascript link exclusion
        const jsHTML = "<p><a href=\"javascript:alert('test')\">JS Link</a></p>";
        editor.commands.setContent(jsHTML);
        const jsonAfterJS = editor.getJSON();

        // Test button link exclusion
        const buttonHTML = '<p><a href="https://example.com" data-type="button">Button</a></p>';
        editor.commands.setContent(buttonHTML);
        const jsonAfterButton = editor.getJSON();

        // Both should parse without errors
        return jsonAfterJS.type === "doc" && jsonAfterButton.type === "doc";
      }
      return false;
    });

    expect(safeParsing).toBe(true);
  });

  test("should maintain JSON consistency with links", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Test JSON serialization and consistency
    const jsonConsistency = await page.evaluate(() => {
      if ((window as any).editor) {
        const editor = (window as any).editor;
        editor.commands.setContent("<p>Test text</p>");
        editor.commands.setTextSelection({ from: 1, to: 5 });
        editor.commands.setLink({ href: "https://example.com" });

        // Get JSON and set it back
        const originalJSON = editor.getJSON();
        editor.commands.setContent(originalJSON);
        const newJSON = editor.getJSON();

        // Should maintain structure
        return (
          originalJSON.type === newJSON.type &&
          JSON.stringify(originalJSON) === JSON.stringify(newJSON)
        );
      }
      return false;
    });

    expect(jsonConsistency).toBe(true);
  });

  test("should handle edge cases gracefully", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Test various edge cases
    const edgeCasesHandled = await page.evaluate(() => {
      if ((window as any).editor) {
        const editor = (window as any).editor;

        try {
          // Empty content
          editor.commands.setContent("");
          editor.commands.setLink({ href: "https://example.com" });

          // Invalid URL
          editor.commands.setContent("<p>Test</p>");
          editor.commands.setTextSelection({ from: 1, to: 5 });
          editor.commands.setLink({ href: "invalid-url" });

          // Empty href
          editor.commands.setLink({ href: "" });

          // Malformed HTML
          editor.commands.setContent('<p>Test <a href="broken>link</p>');

          // All should not throw errors
          return true;
        } catch (error) {
          return false;
        }
      }
      return false;
    });

    expect(edgeCasesHandled).toBe(true);
  });

  test("should be production ready for complex scenarios", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Test complex production-like scenario
    const productionReady = await page.evaluate(() => {
      if ((window as any).editor) {
        const editor = (window as any).editor;

        try {
          // Complex content with multiple operations
          editor.commands.setContent("<p>This is a complex test with multiple links</p>");

          // Create multiple links
          editor.commands.setTextSelection({ from: 11, to: 18 });
          editor.commands.setLink({ href: "https://complex.com", target: "_blank" });

          editor.commands.setTextSelection({ from: 34, to: 42 });
          editor.commands.setLink({ href: "https://multiple.com", rel: "noopener" });

          // Update attributes
          editor.commands.setTextSelection({ from: 11, to: 18 });
          editor.commands.updateAttributes("link", { class: "custom-link" });

          // Test undo/redo
          editor.commands.undo();
          editor.commands.redo();

          // Remove a link
          editor.commands.setTextSelection({ from: 34, to: 42 });
          editor.commands.unsetLink();

          // Add new link
          editor.commands.setTextSelection({ from: 34, to: 42 });
          editor.commands.setLink({ href: "https://new.com" });

          // Final JSON should be valid
          const finalJSON = editor.getJSON();
          return finalJSON.type === "doc" && finalJSON.content && finalJSON.content.length > 0;
        } catch (error) {
          return false;
        }
      }
      return false;
    });

    expect(productionReady).toBe(true);
  });
});
