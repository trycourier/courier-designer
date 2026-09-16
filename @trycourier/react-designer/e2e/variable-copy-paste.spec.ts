import { setupMockedTest, mockTemplateDataSamples } from "./template-test-utils";
import { test, expect } from "@playwright/test";
import { MAIN_EDITOR_SELECTOR } from "./test-utils";

test.describe("Variable Copy/Paste E2E", () => {
  test.beforeEach(async ({ page }) => {
    await setupMockedTest(page, mockTemplateDataSamples.emptyTemplate);

    // Wait for the editor to be visible and fully loaded
    const editor = await page.locator(MAIN_EDITOR_SELECTOR);
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Wait for the editor to be available in the window object
    await page.waitForFunction(() => (window as any).__COURIER_CREATE_TEST__?.currentEditor !== null, { timeout: 10000 });
  });

  test("should copy and paste variables correctly", async ({ page }) => {
    const editor = page.locator(MAIN_EDITOR_SELECTOR);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Clear content first
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
      }
    });

    // Insert content with variables
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent([
          { type: "text", text: "Hello " },
          { type: "variable", attrs: { id: "user.firstName" } },
          { type: "text", text: " " },
          { type: "variable", attrs: { id: "user.lastName" } },
          { type: "text", text: "!" },
        ]);
      }
    });

    await page.waitForTimeout(300);

    // Verify content is present
    await expect(editor).toContainText("Hello");
    await expect(editor).toContainText("user.firstName");
    await expect(editor).toContainText("user.lastName");

    // Verify initial variables are present
    const initialVariables = editor.locator(".courier-variable-node");
    await expect(initialVariables).toHaveCount(2);

    // Copy content using TipTap commands
    const originalContent = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        return editor.getJSON();
      }
      return null;
    });

    await page.waitForTimeout(100);

    // Simulate paste by duplicating the content
    await page.evaluate((content) => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor && content) {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;

        // Move to end of document
        editor.commands.focus("end");

        // Add line breaks using proper commands
        editor.commands.createParagraphNear();
        editor.commands.createParagraphNear();

        // Insert the copied content
        if (content.content && content.content.length > 0) {
          const firstParagraph = content.content[0];
          if (firstParagraph && firstParagraph.content) {
            editor.commands.insertContent(firstParagraph.content);
          }
        }
      }
    }, originalContent);
    await page.waitForTimeout(300);

    // Verify the pasted content maintains variable structure
    const variableElements = editor.locator(".courier-variable-node");
    await expect(variableElements).toHaveCount(4); // 2 original + 2 pasted

    // Check that the content was duplicated correctly
    const editorText = await editor.textContent();
    expect(editorText).toContain("Hello user.firstName user.lastName!");

    // Should appear twice after copy/paste
    const firstNameCount = (editorText?.match(/user\.firstName/g) || []).length;
    const lastNameCount = (editorText?.match(/user\.lastName/g) || []).length;
    expect(firstNameCount).toBe(2);
    expect(lastNameCount).toBe(2);
  });

  test("should handle partial variable copy/paste", async ({ page }) => {
    const editor = page.locator(MAIN_EDITOR_SELECTOR);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Clear and insert test content
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent([
          { type: "text", text: "Welcome " },
          { type: "variable", attrs: { id: "user.name" } },
          { type: "text", text: " to our " },
          { type: "variable", attrs: { id: "company.name" } },
          { type: "text", text: " platform!" },
        ]);
      }
    });

    await page.waitForTimeout(300);

    // Simulate copying partial content (first variable and some text)
    const partialContent = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const _editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        // Simulate selecting "Welcome user.name" by creating that content structure
        return [
          { type: "text", text: "Welcome " },
          { type: "variable", attrs: { id: "user.name" } },
        ];
      }
      return null;
    });

    // Add the partial content at the end
    await page.evaluate((content) => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor && content) {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        editor.commands.focus("end");
        editor.commands.createParagraphNear();
        editor.commands.insertContent(content);
      }
    }, partialContent);

    await page.waitForTimeout(300);

    // Verify variables are maintained in partial copy
    const variableElements = editor.locator(".courier-variable-node");
    await expect(variableElements).toHaveCount(3); // 2 original + 1 pasted

    // Check content structure
    const editorText = await editor.textContent();
    expect(editorText).toContain("Welcome user.name to our company.name platform!");
    expect(editorText).toContain("Welcome user.name"); // This should appear twice
  });

  test("should handle mixed content copy/paste", async ({ page }) => {
    const editor = page.locator(MAIN_EDITOR_SELECTOR);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Clear and insert mixed content with formatting
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent([
          { type: "text", text: "Dear " },
          { type: "variable", attrs: { id: "user.title" } },
          { type: "text", text: " " },
          { type: "text", text: "Smith", marks: [{ type: "bold" }] },
          { type: "text", text: ", your order " },
          { type: "variable", attrs: { id: "order.id" } },
          { type: "text", text: " is ready!" },
        ]);
      }
    });

    await page.waitForTimeout(300);

    // Copy all content and paste it
    const allContent = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        const content = editor.getJSON();
        return content.content && content.content.length > 0 ? content.content[0].content : null;
      }
      return null;
    });

    // Clear and paste the content back
    await page.evaluate((content) => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor && content) {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        editor.commands.clearContent();
        editor.commands.insertContent(content);
      }
    }, allContent);

    await page.waitForTimeout(300);

    // Verify all content was preserved
    await expect(editor).toContainText("Dear");
    await expect(editor).toContainText("user.title");
    await expect(editor).toContainText("Smith");
    await expect(editor).toContainText("order.id");
    await expect(editor).toContainText("is ready!");

    // Check that variables are still interactive
    const variableElements = editor.locator(".courier-variable-node");
    await expect(variableElements).toHaveCount(2);

    // Check that bold formatting is preserved
    const boldElements = editor.locator("strong");
    await expect(boldElements).toHaveCount(1);
    await expect(boldElements.first()).toContainText("Smith");
  });

  test("should handle cross-paragraph variable copy/paste", async ({ page }) => {
    const editor = page.locator(MAIN_EDITOR_SELECTOR);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert multi-paragraph content with variables
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Hello " },
                { type: "variable", attrs: { id: "user.name" } },
                { type: "text", text: "!" },
              ],
            },
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Your email is " },
                { type: "variable", attrs: { id: "user.email" } },
                { type: "text", text: "." },
              ],
            },
          ],
        });
      }
    });

    await page.waitForTimeout(300);

    // Copy all content across paragraphs
    const allContent = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        return editor.getJSON();
      }
      return null;
    });

    // Add the copied content after existing content
    await page.evaluate((content) => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor && content) {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        editor.commands.focus("end");
        editor.commands.createParagraphNear();
        editor.commands.insertContent("Copied content:");
        editor.commands.createParagraphNear();

        // Insert each paragraph from the copied content
        if (content.content) {
          content.content.forEach((paragraph: any) => {
            if (paragraph.content) {
              editor.commands.insertContent(paragraph.content);
              editor.commands.createParagraphNear();
            }
          });
        }
      }
    }, allContent);
    await page.waitForTimeout(300);

    // Verify variables work across paragraph boundaries
    const variableElements = editor.locator(".courier-variable-node");
    await expect(variableElements).toHaveCount(4); // 2 original + 2 pasted

    // Check content structure is maintained
    const editorText = await editor.textContent();
    expect(editorText).toContain("Hello user.name!");
    expect(editorText).toContain("Your email is user.email.");
    expect(editorText).toContain("Copied content:");

    // Variables should appear twice after copy/paste
    const nameCount = (editorText?.match(/user\.name/g) || []).length;
    const emailCount = (editorText?.match(/user\.email/g) || []).length;
    expect(nameCount).toBe(2);
    expect(emailCount).toBe(2);
  });
});
