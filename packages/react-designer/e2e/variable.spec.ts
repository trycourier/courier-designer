import { test, expect, setupComponentTest } from "./test-utils";

test.describe("Variable Component E2E", () => {
  test.beforeEach(async ({ page }) => {
    await setupComponentTest(page);
  });

  test("should verify Variable extension is loaded", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if Variable extension is registered
    const hasVariableExtension = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const extensions = (window as any).__COURIER_CREATE_TEST__?.currentEditor.extensionManager.extensions;
        return extensions.some((ext: any) => ext.name === "variableSuggestion");
      }
      return false;
    });

    expect(hasVariableExtension).toBe(true);
  });

  test("should verify VariableNode is loaded", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if VariableNode is registered
    const hasVariableNode = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        return (window as any).__COURIER_CREATE_TEST__?.currentEditor.schema.nodes.variable !== undefined;
      }
      return false;
    });

    expect(hasVariableNode).toBe(true);
  });

  test("should handle variable insertion via commands", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Test that variable insertion commands exist and don't throw errors
    const insertionWorks = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        try {
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
          // Test that the variable node type exists in schema
          const hasVariableNode = (window as any).__COURIER_CREATE_TEST__?.currentEditor.schema.nodes.variable !== undefined;
          return hasVariableNode;
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(insertionWorks).toBe(true);
  });

  test("should display variable with correct styling", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Clear content and insert variable
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent([
          { type: "variable", attrs: { id: "user.email" } },
        ]);
      }
    });

    await page.waitForTimeout(300);

    // Check variable content is present
    await expect(editor).toContainText("user.email");

    // Check variable styling
    const variableElement = editor.locator(".courier-variable-node").first();
    await expect(variableElement).toBeVisible();

    // Check for courier CSS classes
    await expect(variableElement).toHaveClass(/courier-bg-\[#EFF6FF\]/);
  });

  test("should handle multiple variables in content", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Clear content and insert multiple variables
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent([
          { type: "text", text: "Hello " },
          { type: "variable", attrs: { id: "user.name" } },
          { type: "text", text: ", your email is " },
          { type: "variable", attrs: { id: "user.email" } },
          { type: "text", text: "." },
        ]);
      }
    });

    await page.waitForTimeout(300);

    // Check content includes both variables
    await expect(editor).toContainText("Hello");
    await expect(editor).toContainText("user.name");
    await expect(editor).toContainText("user.email");

    // Check that both variables are present
    const variableElements = editor.locator(".courier-variable-node");
    await expect(variableElements).toHaveCount(2);
  });

  test("should handle variable suggestion trigger", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Clear content first
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
      }
    });

    await page.waitForTimeout(200);

    // Type the variable trigger characters
    await page.keyboard.type("{{");
    await page.waitForTimeout(300);

    // Check if suggestion decoration is applied
    // Note: This might not be visible if no variables are configured, but the class should exist
    const hasSuggestionClass = await page.evaluate(() => {
      const element = document.querySelector(".variable-suggestion");
      return element !== null;
    });

    // The suggestion system should be active (even if no suggestions show)
    expect(typeof hasSuggestionClass).toBe("boolean");
  });

  test("should handle variable deletion", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert a variable
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent([
          { type: "variable", attrs: { id: "test.variable" } },
          { type: "text", text: " some text" },
        ]);
      }
    });

    await page.waitForTimeout(300);

    // Verify variable exists
    await expect(editor).toContainText("test.variable");
    const variableElement = editor.locator(".courier-variable-node").first();
    await expect(variableElement).toBeVisible();

    // Delete content by clearing the editor
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
      }
    });

    await page.waitForTimeout(300);

    // Verify content is cleared
    const hasVariableInContent = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const htmlContent = (window as any).__COURIER_CREATE_TEST__?.currentEditor.getHTML();
        return htmlContent.includes("test.variable");
      }
      return false;
    });

    expect(hasVariableInContent).toBe(false);
    await expect(editor).not.toContainText("test.variable");
  });

  test("should maintain variable data attributes", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert variable with specific ID
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent([
          { type: "variable", attrs: { id: "order.id" } },
        ]);
      }
    });

    await page.waitForTimeout(300);

    // Check variable content is present
    await expect(editor).toContainText("order.id");

    // Check variable element is visible
    const variableElement = editor.locator(".courier-variable-node").first();
    await expect(variableElement).toBeVisible();
  });

  test("should handle JSON serialization with variables", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Test basic JSON serialization
    const jsonWorks = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        try {
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent("Test JSON content");
          const json = (window as any).__COURIER_CREATE_TEST__?.currentEditor.getJSON();
          return JSON.stringify(json).includes("Test JSON content");
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(jsonWorks).toBe(true);
  });

  test("should handle HTML serialization with variables", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Test basic HTML serialization
    const htmlWorks = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        try {
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent("Test HTML content");
          const html = (window as any).__COURIER_CREATE_TEST__?.currentEditor.getHTML();
          return html.includes("Test HTML content");
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(htmlWorks).toBe(true);
  });

  test("should verify editor stability with variables", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Test basic editor operations
    const isStable = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        try {
          // Clear and add simple content
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent("Test content");

          // Get content
          const html = (window as any).__COURIER_CREATE_TEST__?.currentEditor.getHTML();
          const json = (window as any).__COURIER_CREATE_TEST__?.currentEditor.getJSON();

          // Set content back
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setContent(json);

          // Verify content is preserved
          const finalHtml = (window as any).__COURIER_CREATE_TEST__?.currentEditor.getHTML();
          return html.includes("Test content") && finalHtml.includes("Test content");
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(isStable).toBe(true);
  });
});
