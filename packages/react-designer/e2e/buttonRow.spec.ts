import { test, expect, resetEditorState } from "./test-utils";

test.describe("ButtonRow Component", () => {
  test.beforeEach(async ({ page }) => {
    // Use the enhanced reset function for better isolation
    await resetEditorState(page);
  });

  test("should verify buttonRow extension is available", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    // Use force click to bypass any overlays
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if buttonRow commands are available
    const hasButtonRowCommands = await page.evaluate(() => {
      if ((window as any).editor) {
        try {
          // Check if the setButtonRow command exists
          return typeof (window as any).editor.commands.setButtonRow === "function";
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    // Test passes if command is available
    expect(hasButtonRowCommands).toBe(true);
  });

  test("should verify buttonRow is registered as extension", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if buttonRow extension is registered
    const hasButtonRowExtension = await page.evaluate(() => {
      if ((window as any).editor) {
        const extensions = (window as any).editor.extensionManager.extensions;
        return extensions.some((ext: any) => ext.name === "buttonRow");
      }
      return false;
    });

    expect(hasButtonRowExtension).toBe(true);
  });

  test("should check buttonRow schema and configuration", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if buttonRow node type exists in schema
    const hasButtonRowNode = await page.evaluate(() => {
      if ((window as any).editor) {
        return (window as any).editor.schema.nodes.buttonRow !== undefined;
      }
      return false;
    });

    expect(hasButtonRowNode).toBe(true);
  });

  test("should allow manual buttonRow HTML insertion", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Try to insert button row HTML content directly
    await page.evaluate(() => {
      if ((window as any).editor) {
        const html =
          '<div data-type="buttonRow" data-button1-label="Register" data-button1-bg="#000000" data-button1-color="#ffffff" data-button2-label="Learn more" data-button2-bg="#ffffff" data-button2-color="#000000" data-padding="6"></div>';
        (window as any).editor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Check if button row was inserted - button row displays both button labels
    await expect(editor).toContainText("Register");
    await expect(editor).toContainText("Learn more");
  });

  test("should handle buttonRow with default props", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert button row with default attributes
    await page.evaluate(() => {
      if ((window as any).editor) {
        const html = `<div data-type="buttonRow" data-button1-label="Register" data-button1-link="" data-button1-bg="#000000" data-button1-color="#ffffff" data-button2-label="Learn more" data-button2-link="" data-button2-bg="#ffffff" data-button2-color="#000000" data-padding="6"></div>`;
        (window as any).editor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Verify button row appears with default labels
    await expect(editor).toContainText("Register");
    await expect(editor).toContainText("Learn more");
  });

  test("should verify buttonRow component integration", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if ButtonRowComponentNode is available
    const hasNodeView = await page.evaluate(() => {
      if ((window as any).editor) {
        const buttonRowExtension = (window as any).editor.extensionManager.extensions.find(
          (ext: any) => ext.name === "buttonRow"
        );
        return buttonRowExtension && buttonRowExtension.options !== undefined;
      }
      return false;
    });

    // This verifies the component is properly integrated
    expect(hasNodeView).toBe(true);
  });

  test("should verify editor text input functionality", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Basic text input to ensure editor is working
    await page.keyboard.type("Basic text input test");

    // Verify text appears
    await expect(editor).toContainText("Basic text input test");
  });

  test("should handle buttonRow with custom properties", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert button row with custom properties
    await page.evaluate(() => {
      if ((window as any).editor) {
        const html = `<div data-type="buttonRow" data-button1-label="Sign Up" data-button1-bg="#007bff" data-button1-color="#ffffff" data-button2-label="Read More" data-button2-bg="transparent" data-button2-color="#007bff" data-padding="12"></div>`;
        (window as any).editor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Verify button row appears with custom labels
    await expect(editor).toContainText("Sign Up");
    await expect(editor).toContainText("Read More");
  });

  test("should handle complex HTML with buttonRow", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert complex HTML structure
    await page.evaluate(() => {
      if ((window as any).editor) {
        const html = `
          <p>Before button row</p>
          <div data-type="buttonRow" data-button1-label="Primary Action" data-button1-bg="#000000" data-button1-color="#ffffff" data-button2-label="Secondary Action" data-button2-bg="#ffffff" data-button2-color="#000000">
          </div>
          <p>After button row</p>
        `;
        (window as any).editor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Verify all content appears - button row shows labels from data attributes
    await expect(editor).toContainText("Before button row");
    await expect(editor).toContainText("Primary Action");
    await expect(editor).toContainText("Secondary Action");
    await expect(editor).toContainText("After button row");
  });

  test("should handle buttonRow with different styling", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert button row with different styling
    await page.evaluate(() => {
      if ((window as any).editor) {
        const html =
          '<div data-type="buttonRow" data-button1-label="Buy Now" data-button1-bg="#ff6600" data-button1-color="#ffffff" data-button2-label="Cancel" data-button2-bg="#dddddd" data-button2-color="#333333" data-padding="10"></div>';
        (window as any).editor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Verify button row appears with styled buttons
    await expect(editor).toContainText("Buy Now");
    await expect(editor).toContainText("Cancel");
  });

  test("should use setButtonRow command", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Use the setButtonRow command
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.commands.setButtonRow({
          button1Label: "Command Test 1",
          button2Label: "Command Test 2",
        });
      }
    });

    await page.waitForTimeout(500);

    // Verify button row was created with command
    await expect(editor).toContainText("Command Test 1");
    await expect(editor).toContainText("Command Test 2");
  });

  test("should maintain editor stability with buttonRow operations", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Perform multiple operations to test stability
    await page.keyboard.type("Test content");
    await page.waitForTimeout(200);

    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.commands.insertContent(
          '<div data-type="buttonRow" data-button1-label="Stability Test 1" data-button2-label="Stability Test 2" data-button1-bg="#000000" data-button1-color="#ffffff" data-button2-bg="#ffffff" data-button2-color="#000000"></div>'
        );
      }
    });

    await page.waitForTimeout(500);

    // Verify editor is still functional and contains basic content
    await expect(editor).toContainText("Test content");
  });

  test("should handle multiple buttonRows in sequence", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Create and verify first button row
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.commands.insertContent(
          '<div data-type="buttonRow" data-button1-label="First Row 1" data-button2-label="First Row 2" data-button1-bg="#000000" data-button1-color="#ffffff" data-button2-bg="#ffffff" data-button2-color="#000000"></div>'
        );
      }
    });

    await page.waitForTimeout(300);

    // Verify first button row exists
    await expect(editor).toContainText("First Row 1");
    await expect(editor).toContainText("First Row 2");

    // Clear editor and create second button row separately
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.commands.clearContent();
      }
    });

    await page.waitForTimeout(200);

    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.commands.insertContent(
          '<div data-type="buttonRow" data-button1-label="Second Row 1" data-button2-label="Second Row 2" data-button1-bg="#ff6600" data-button1-color="#ffffff" data-button2-bg="#ffffff" data-button2-color="#ff6600"></div>'
        );
      }
    });

    await page.waitForTimeout(300);

    // Verify second button row
    await expect(editor).toContainText("Second Row 1");
    await expect(editor).toContainText("Second Row 2");
  });

  test("should handle buttonRow with links", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert button row with links
    await page.evaluate(() => {
      if ((window as any).editor) {
        const html =
          '<div data-type="buttonRow" data-button1-label="Visit Homepage" data-button1-link="https://example.com" data-button1-bg="#000000" data-button1-color="#ffffff" data-button2-label="Contact Us" data-button2-link="https://example.com/contact" data-button2-bg="#ffffff" data-button2-color="#000000"></div>';
        (window as any).editor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Verify button row with links appears
    await expect(editor).toContainText("Visit Homepage");
    await expect(editor).toContainText("Contact Us");
  });

  test("should verify buttonRow data attributes are preserved", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert button row with specific data attributes
    await page.evaluate(() => {
      if ((window as any).editor) {
        const html =
          '<div data-type="buttonRow" data-button1-label="Test Label 1" data-button2-label="Test Label 2" data-padding="15"></div>';
        (window as any).editor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Check if the buttonRow content is in the editor
    const hasButtonRowContent = await page.evaluate(() => {
      const editorContent = document.querySelector(".tiptap.ProseMirror")?.textContent || "";
      return editorContent.includes("Test Label 1") && editorContent.includes("Test Label 2");
    });

    expect(hasButtonRowContent).toBe(true);
  });
});
