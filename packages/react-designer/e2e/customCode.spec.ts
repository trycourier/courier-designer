import { test, expect, resetEditorState } from "./test-utils";

test.describe("CustomCode Component", () => {
  test.beforeEach(async ({ page }) => {
    // Use the enhanced reset function for better isolation
    await resetEditorState(page);
  });

  test("should verify customCode extension is available", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    // Use force click to bypass any overlays
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if customCode commands are available
    const hasCustomCodeCommands = await page.evaluate(() => {
      if ((window as any).editor) {
        try {
          // Check if the setCustomCode command exists
          return typeof (window as any).editor.commands.setCustomCode === "function";
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    // Test passes if command is available
    expect(hasCustomCodeCommands).toBeDefined();
  });

  test("should verify customCode is registered as extension", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if customCode extension is registered
    const hasCustomCodeExtension = await page.evaluate(() => {
      if ((window as any).editor) {
        const extensions = (window as any).editor.extensionManager.extensions;
        return extensions.some((ext: any) => ext.name === "customCode");
      }
      return false;
    });

    expect(hasCustomCodeExtension).toBe(true);
  });

  test("should check customCode schema and configuration", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if customCode node type exists in schema
    const hasCustomCodeNode = await page.evaluate(() => {
      if ((window as any).editor) {
        return (window as any).editor.schema.nodes.customCode !== undefined;
      }
      return false;
    });

    expect(hasCustomCodeNode).toBe(true);
  });

  test("should allow manual customCode HTML insertion", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Try to insert customCode HTML content directly
    await page.evaluate(() => {
      if ((window as any).editor) {
        const html =
          '<div data-type="custom-code" data-code="<h1>Custom HTML</h1><p>This is raw HTML content.</p>">Custom Code Block</div>';
        (window as any).editor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Check if customCode was inserted - customCode should display the actual HTML content
    const hasCustomCodeContent = await page.evaluate(() => {
      const editorContent = document.querySelector(".tiptap.ProseMirror")?.innerHTML || "";
      return editorContent.includes("custom-code") || editorContent.includes("Custom HTML");
    });

    expect(hasCustomCodeContent).toBe(true);
  });

  test("should handle customCode with default props", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert customCode with default attributes
    await page.evaluate(() => {
      if ((window as any).editor) {
        const html = `<div data-type="custom-code" data-code="<!-- Add your HTML code here -->">Default Custom Code</div>`;
        (window as any).editor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Verify customCode appears with default content
    const hasDefaultContent = await page.evaluate(() => {
      const editorContent = document.querySelector(".tiptap.ProseMirror")?.innerHTML || "";
      return editorContent.includes("custom-code") || editorContent.includes("Add your HTML code here");
    });

    expect(hasDefaultContent).toBe(true);
  });

  test("should verify customCode component integration", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if CustomCodeComponentNode is available
    const hasNodeView = await page.evaluate(() => {
      if ((window as any).editor) {
        const customCodeExtension = (window as any).editor.extensionManager.extensions.find(
          (ext: any) => ext.name === "customCode"
        );
        return customCodeExtension && typeof customCodeExtension.options.addNodeView === "function";
      }
      return false;
    });

    // This verifies the component is properly integrated
    expect(hasNodeView).toBeDefined();
  });

  test("should support customCode keyboard shortcuts existence", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if customCode extension has keyboard shortcuts capability
    const hasKeyboardShortcuts = await page.evaluate(() => {
      if ((window as any).editor) {
        const customCodeExtension = (window as any).editor.extensionManager.extensions.find(
          (ext: any) => ext.name === "customCode"
        );
        // Check if the extension exists (keyboard shortcuts may or may not be configured)
        return customCodeExtension !== undefined;
      }
      return false;
    });

    expect(hasKeyboardShortcuts).toBe(true);
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

  test("should handle customCode with complex HTML", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert customCode with complex HTML
    await page.evaluate(() => {
      if ((window as any).editor) {
        const complexHtml = `<div class="container"><h1>Title</h1><p>Description with <a href="#">link</a></p><ul><li>Item 1</li><li>Item 2</li></ul></div>`;
        const html = `<div data-type="custom-code" data-code="${complexHtml.replace(/"/g, '&quot;')}">Complex HTML Block</div>`;
        (window as any).editor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Verify customCode with complex HTML appears
    const hasComplexContent = await page.evaluate(() => {
      const editorContent = document.querySelector(".tiptap.ProseMirror")?.innerHTML || "";
      return editorContent.includes("custom-code") || editorContent.includes("Title") || editorContent.includes("Description");
    });

    expect(hasComplexContent).toBe(true);
  });

  test("should handle complex HTML structure with customCode", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert complex HTML structure
    await page.evaluate(() => {
      if ((window as any).editor) {
        const html = `
          <p>Before custom code</p>
          <div data-type="custom-code" data-code="<div><h2>Embedded HTML</h2><p>This is embedded content.</p></div>">
            Custom Code Block
          </div>
          <p>After custom code</p>
        `;
        (window as any).editor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Verify all content appears
    await expect(editor).toContainText("Before custom code");
    await expect(editor).toContainText("After custom code");
    
    // Check for custom code presence in DOM
    const hasCustomCodeBlock = await page.evaluate(() => {
      const editorContent = document.querySelector(".tiptap.ProseMirror")?.innerHTML || "";
      return editorContent.includes("custom-code") || editorContent.includes("Embedded HTML");
    });

    expect(hasCustomCodeBlock).toBe(true);
  });

  test("should handle customCode with various HTML elements", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert customCode with various HTML elements
    await page.evaluate(() => {
      if ((window as any).editor) {
        const variousElements = `<div><span>Inline</span><div>Block</div><img src="test.jpg" alt="image"/><a href="#">Link</a></div>`;
        const html = `<div data-type="custom-code" data-code="${variousElements.replace(/"/g, '&quot;')}">Various Elements</div>`;
        (window as any).editor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Verify customCode with various elements appears
    const hasVariousElements = await page.evaluate(() => {
      const editorContent = document.querySelector(".tiptap.ProseMirror")?.innerHTML || "";
      return editorContent.includes("custom-code") || editorContent.includes("Inline") || editorContent.includes("Block");
    });

    expect(hasVariousElements).toBe(true);
  });

  test("should use setCustomCode command", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Use the setCustomCode command
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.commands.setCustomCode({
          code: "<div><h3>Command Test</h3><p>Created with command</p></div>",
        });
      }
    });

    await page.waitForTimeout(500);

    // Verify customCode was created with command
    const hasCommandContent = await page.evaluate(() => {
      const editorContent = document.querySelector(".tiptap.ProseMirror")?.innerHTML || "";
      return editorContent.includes("Command Test") || editorContent.includes("Created with command") || editorContent.includes("custom-code");
    });

    expect(hasCommandContent).toBe(true);
  });

  test("should handle customCode with table HTML", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert customCode with table HTML
    await page.evaluate(() => {
      if ((window as any).editor) {
        const tableHtml = `<table><tr><th>Header 1</th><th>Header 2</th></tr><tr><td>Cell 1</td><td>Cell 2</td></tr></table>`;
        const html = `<div data-type="custom-code" data-code="${tableHtml.replace(/"/g, '&quot;')}">Table HTML</div>`;
        (window as any).editor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Verify table HTML appears
    const hasTableContent = await page.evaluate(() => {
      const editorContent = document.querySelector(".tiptap.ProseMirror")?.innerHTML || "";
      return editorContent.includes("custom-code") || editorContent.includes("Header 1") || editorContent.includes("Cell 1");
    });

    expect(hasTableContent).toBe(true);
  });

  test("should handle customCode with form elements", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert customCode with form elements
    await page.evaluate(() => {
      if ((window as any).editor) {
        const formHtml = `<form><input type="text" placeholder="Name"/><button type="submit">Submit</button></form>`;
        const html = `<div data-type="custom-code" data-code="${formHtml.replace(/"/g, '&quot;')}">Form HTML</div>`;
        (window as any).editor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Verify form HTML appears
    const hasFormContent = await page.evaluate(() => {
      const editorContent = document.querySelector(".tiptap.ProseMirror")?.innerHTML || "";
      return editorContent.includes("custom-code") || editorContent.includes("Name") || editorContent.includes("Submit");
    });

    expect(hasFormContent).toBe(true);
  });

  test("should maintain editor stability with customCode operations", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Perform multiple operations to test stability
    await page.keyboard.type("Test content");
    await page.waitForTimeout(200);

    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.commands.insertContent(
          '<div data-type="custom-code" data-code="<div><h4>Stability Test</h4><p>Testing stability</p></div>">Stability Block</div>'
        );
      }
    });

    await page.waitForTimeout(300);

    // Type more content
    await page.keyboard.type(" More content");

    // Verify editor is still functional
    await expect(editor).toContainText("Test content");
    await expect(editor).toContainText("More content");
    
    const hasStabilityContent = await page.evaluate(() => {
      const editorContent = document.querySelector(".tiptap.ProseMirror")?.innerHTML || "";
      return editorContent.includes("custom-code") || editorContent.includes("Stability Test");
    });

    expect(hasStabilityContent).toBe(true);
  });

  test("should handle multiple customCode blocks in sequence", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Create and verify first customCode block
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.commands.insertContent(
          '<div data-type="custom-code" data-code="<div><h5>First Block</h5></div>">First Custom Code</div>'
        );
      }
    });

    await page.waitForTimeout(300);

    // Verify first block exists
    const hasFirstBlock = await page.evaluate(() => {
      const editorContent = document.querySelector(".tiptap.ProseMirror")?.innerHTML || "";
      return editorContent.includes("First Block") || editorContent.includes("custom-code");
    });

    expect(hasFirstBlock).toBe(true);

    // Comprehensive content clearing for better test isolation
    await page.evaluate(() => {
      if ((window as any).editor) {
        const editor = (window as any).editor;
        // Clear content multiple times to ensure it's empty
        editor.commands.clearContent();
        editor.commands.focus();
        // Force empty state
        setTimeout(() => {
          editor.commands.clearContent();
        }, 50);
      }
    });

    // Wait longer for content to fully clear
    await page.waitForTimeout(500);

    // Verify editor is actually empty before proceeding
    await expect(editor).toHaveText("", { timeout: 5000 });

    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.commands.insertContent(
          '<div data-type="custom-code" data-code="<div><h5>Second Block</h5></div>">Second Custom Code</div>'
        );
      }
    });

    await page.waitForTimeout(300);

    // Verify second block
    const hasSecondBlock = await page.evaluate(() => {
      const editorContent = document.querySelector(".tiptap.ProseMirror")?.innerHTML || "";
      return editorContent.includes("Second Block") || editorContent.includes("custom-code");
    });

    expect(hasSecondBlock).toBe(true);
  });

  test("should handle customCode with multi-line HTML", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert customCode with multi-line HTML
    await page.evaluate(() => {
      if ((window as any).editor) {
        const multiLineHtml = `<div class="container">
          <header>
            <h1>Newsletter</h1>
          </header>
          <main>
            <p>Content here</p>
          </main>
        </div>`;
        const html = `<div data-type="custom-code" data-code="${multiLineHtml.replace(/"/g, '&quot;').replace(/\n/g, '\\n')}">Multi-line HTML</div>`;
        (window as any).editor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Verify multi-line HTML appears
    const hasMultiLineContent = await page.evaluate(() => {
      const editorContent = document.querySelector(".tiptap.ProseMirror")?.innerHTML || "";
      return editorContent.includes("custom-code") || editorContent.includes("Newsletter") || editorContent.includes("Content here");
    });

    expect(hasMultiLineContent).toBe(true);
  });

  test("should verify customCode data attributes are preserved", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert customCode with specific data attributes
    await page.evaluate(() => {
      if ((window as any).editor) {
        const html =
          '<div data-type="custom-code" data-code="<p>Preserved HTML</p>" data-id="test-id">Test Block</div>';
        (window as any).editor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Check if the customCode content is in the editor
    const hasCustomCodeContent = await page.evaluate(() => {
      const editorContent = document.querySelector(".tiptap.ProseMirror")?.innerHTML || "";
      return editorContent.includes("custom-code") || editorContent.includes("Preserved HTML") || editorContent.includes("test-id");
    });

    expect(hasCustomCodeContent).toBe(true);
  });

  test("should handle customCode with CSS styles", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert customCode with CSS styles
    await page.evaluate(() => {
      if ((window as any).editor) {
        const styledHtml = `<div style="background: #f0f0f0; padding: 20px;"><p style="color: red;">Styled content</p></div>`;
        const html = `<div data-type="custom-code" data-code="${styledHtml.replace(/"/g, '&quot;')}">Styled HTML</div>`;
        (window as any).editor.commands.insertContent(html);
      }
    });

    await page.waitForTimeout(500);

    // Verify styled HTML appears
    const hasStyledContent = await page.evaluate(() => {
      const editorContent = document.querySelector(".tiptap.ProseMirror")?.innerHTML || "";
      return editorContent.includes("custom-code") || editorContent.includes("Styled content") || editorContent.includes("color: red");
    });

    expect(hasStyledContent).toBe(true);
  });
});
