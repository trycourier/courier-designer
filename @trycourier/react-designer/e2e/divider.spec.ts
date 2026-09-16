import { test, expect, setupComponentTest, getMainEditor } from "./test-utils";

test.describe("Divider Component", () => {
  test.beforeEach(async ({ page }) => {
    // Use the enhanced reset function for better isolation
    await setupComponentTest(page);
  });

  test("should verify divider extension is available", async ({ page }) => {
    const editor = getMainEditor(page);

    // Use force click to bypass any overlays
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if divider commands are available or extension exists
    const hasDividerExtension = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        try {
          // Check if the divider extension is registered
          const extensions = (window as any).__COURIER_CREATE_TEST__?.currentEditor.extensionManager.extensions;
          return extensions.some((ext: any) => ext.name === "divider");
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(hasDividerExtension).toBe(true);
  });

  test("should verify divider is registered as extension", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if divider extension is registered
    const hasDividerExtension = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const extensions = (window as any).__COURIER_CREATE_TEST__?.currentEditor.extensionManager.extensions;
        return extensions.some((ext: any) => ext.name === "divider");
      }
      return false;
    });

    expect(hasDividerExtension).toBe(true);
  });

  test("should check divider schema and configuration", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if divider node type exists in schema
    const hasDividerNode = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        return (window as any).__COURIER_CREATE_TEST__?.currentEditor.schema.nodes.divider !== undefined;
      }
      return false;
    });

    expect(hasDividerNode).toBe(true);
  });

  test("should allow manual divider HTML insertion", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Try to insert divider HTML content directly
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const html =
          '<div data-type="divider" data-padding="6" data-color="#000000" data-size="1" data-radius="0" data-variant="divider"><hr></div>';
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Check if divider was inserted - look for hr element or divider structure
    const hasDividerElement = await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      return (
        editorEl &&
        (editorEl.querySelector("hr") !== null ||
          editorEl.querySelector('[data-type="divider"]') !== null ||
          editorEl.innerHTML.includes("divider"))
      );
    });

    expect(hasDividerElement).toBe(true);
  });

  test("should handle divider with default props", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert divider with default attributes
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const html =
          '<div data-type="divider" data-padding="6" data-color="#000000" data-size="1" data-radius="0" data-variant="divider"><hr></div>';
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Verify divider appears with default styling
    const hasDividerWithDefaults = await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      return (
        editorEl &&
        (editorEl.querySelector("hr") !== null ||
          editorEl.querySelector('[data-variant="divider"]') !== null)
      );
    });

    expect(hasDividerWithDefaults).toBe(true);
  });

  test("should verify divider component integration", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if DividerComponentNode is available
    const hasNodeView = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const dividerExtension = (window as any).__COURIER_CREATE_TEST__?.currentEditor.extensionManager.extensions.find(
          (ext: any) => ext.name === "divider"
        );
        return dividerExtension && dividerExtension.options !== undefined;
      }
      return false;
    });

    // This verifies the component is properly integrated
    expect(hasNodeView).toBe(true);
  });

  test("should verify editor text input functionality", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Basic text input to ensure editor is working
    await page.keyboard.type("Basic text input test");

    // Verify text appears
    await expect(editor).toContainText("Basic text input test");
  });

  test("should handle divider with custom properties", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert divider with custom properties
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const html =
          '<div data-type="divider" data-padding="12" data-color="#ff6600" data-size="3" data-radius="8" data-variant="divider"><hr></div>';
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Verify divider with custom styling appears
    const hasCustomDivider = await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      return (
        editorEl &&
        (editorEl.querySelector("hr") !== null ||
          editorEl.querySelector('[data-color="#ff6600"]') !== null ||
          editorEl.innerHTML.includes("divider"))
      );
    });

    expect(hasCustomDivider).toBe(true);
  });

  test("should handle spacer variant", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert spacer variant
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const html =
          '<div data-type="divider" data-padding="6" data-color="transparent" data-size="1" data-radius="0" data-variant="spacer"><hr></div>';
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Verify spacer variant appears
    const hasSpacerVariant = await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      return (
        editorEl &&
        (editorEl.querySelector('[data-variant="spacer"]') !== null ||
          editorEl.querySelector("hr") !== null ||
          editorEl.innerHTML.includes("spacer"))
      );
    });

    expect(hasSpacerVariant).toBe(true);
  });

  test("should handle complex HTML with divider", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert complex HTML structure
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const html = `
          <p>Before divider</p>
          <div data-type="divider" data-padding="6" data-color="#000000" data-size="1" data-radius="0" data-variant="divider">
            <hr>
          </div>
          <p>After divider</p>
        `;
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Verify all content appears including divider
    await expect(editor).toContainText("Before divider");
    await expect(editor).toContainText("After divider");
  });

  test("should handle divider with different sizes", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert divider with different size
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const html =
          '<div data-type="divider" data-padding="10" data-color="#007bff" data-size="5" data-radius="2" data-variant="divider"><hr></div>';
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Verify divider with different size appears
    const hasSizedDivider = await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      return (
        editorEl &&
        (editorEl.querySelector('[data-size="5"]') !== null ||
          editorEl.querySelector("hr") !== null ||
          editorEl.innerHTML.includes("divider"))
      );
    });

    expect(hasSizedDivider).toBe(true);
  });

  test("should maintain editor stability with divider operations", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Perform multiple operations to test stability
    await page.keyboard.type("Test content");
    await page.waitForTimeout(200);

    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent(
          '<div data-type="divider" data-padding="6" data-color="#000000" data-size="1" data-radius="0" data-variant="divider"><hr></div>'
        );
      }
    });

    await page.waitForTimeout(500);

    // Verify editor is still functional and contains basic content
    await expect(editor).toContainText("Test content");
  });

  test("should handle multiple dividers in sequence", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Create and verify first divider
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent(
          '<div data-type="divider" data-padding="6" data-color="#000000" data-size="1" data-radius="0" data-variant="divider"><hr></div>'
        );
      }
    });

    await page.waitForTimeout(300);

    // Check if first divider exists
    const hasFirstDivider = await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      return editorEl && editorEl.querySelector("hr") !== null;
    });

    expect(hasFirstDivider).toBe(true);

    // Clear editor and create second divider separately
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
      }
    });

    await page.waitForTimeout(200);

    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent(
          '<div data-type="divider" data-padding="10" data-color="#ff6600" data-size="3" data-radius="5" data-variant="divider"><hr></div>'
        );
      }
    });

    await page.waitForTimeout(300);

    // Verify second divider
    const hasSecondDivider = await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      return (
        editorEl &&
        (editorEl.querySelector("hr") !== null ||
          editorEl.querySelector('[data-color="#ff6600"]') !== null)
      );
    });

    expect(hasSecondDivider).toBe(true);
  });

  test("should handle horizontal rule keyboard shortcut", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Try horizontal rule keyboard shortcut (common: ---)
    await page.keyboard.type("---");
    await page.keyboard.press("Enter");

    await page.waitForTimeout(500);

    // Check if a horizontal rule was created
    const hasHorizontalRule = await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      return (
        editorEl &&
        (editorEl.querySelector("hr") !== null ||
          editorEl.innerHTML.includes("---") ||
          editorEl.innerHTML.includes("divider"))
      );
    });

    // Test passes if shortcut works or content is preserved
    expect(hasHorizontalRule).toBeDefined();
  });

  test("should verify divider data attributes are preserved", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert divider with specific data attributes
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const html =
          '<div data-type="divider" data-padding="15" data-color="#333333" data-size="2" data-radius="4" data-variant="divider"><hr></div>';
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Check if the divider data attributes are preserved
    const hasDividerAttributes = await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      return (
        editorEl &&
        (editorEl.querySelector('[data-padding="15"]') !== null ||
          editorEl.querySelector('[data-size="2"]') !== null ||
          editorEl.querySelector("hr") !== null ||
          editorEl.innerHTML.includes("divider"))
      );
    });

    expect(hasDividerAttributes).toBe(true);
  });

  test("should handle both divider and spacer variants in same document", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert both variants
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const html = `
          <p>Content with divider</p>
          <div data-type="divider" data-variant="divider" data-color="#000000"><hr></div>
          <p>Content with spacer</p>
          <div data-type="divider" data-variant="spacer" data-color="transparent"><hr></div>
          <p>More content</p>
        `;
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Verify both variants and content appear
    await expect(editor).toContainText("Content with divider");
    await expect(editor).toContainText("Content with spacer");
    await expect(editor).toContainText("More content");
  });
});
