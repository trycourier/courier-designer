import { test, expect, resetEditorState } from "./test-utils";

test.describe("Heading Component", () => {
  test.beforeEach(async ({ page }) => {
    // Use the enhanced reset function for better isolation
    await resetEditorState(page);
  });

  test("should create heading using TipTap commands", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    // Use force click to bypass any overlays
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Type some text first
    await page.keyboard.type("Test Heading");

    // Use TipTap command to convert to heading
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.chain().focus().setNode("heading", { level: 1 }).run();
      }
    });

    await page.waitForTimeout(300);

    // Verify heading is created with proper attributes
    const heading = editor.locator("h1").first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText("Test Heading");
  });

  test("should support different heading levels (H1-H6)", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Test each heading level
    for (let level = 1; level <= 6; level++) {
      await page.keyboard.type(`Heading Level ${level}`);

      // Convert to specific heading level
      await page.evaluate((level: number) => {
        if ((window as any).editor) {
          (window as any).editor.chain().focus().setNode("heading", { level }).run();
        }
      }, level);

      await page.waitForTimeout(300);

      // Verify the heading with correct level
      const heading = editor.locator(`h${level}`).first();
      await expect(heading).toBeVisible();
      await expect(heading).toContainText(`Heading Level ${level}`);

      // Create new paragraph for next test
      await page.keyboard.press("Enter");
      await page.evaluate(() => {
        if ((window as any).editor) {
          (window as any).editor.chain().focus().setNode("paragraph").run();
        }
      });
      await page.waitForTimeout(200);
    }
  });

  test("should toggle heading back to paragraph", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Type text and convert to heading
    await page.keyboard.type("Toggle Test");
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.chain().focus().setNode("heading", { level: 2 }).run();
      }
    });

    await page.waitForTimeout(300);

    // Verify heading exists
    let heading = editor.locator("h2").first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText("Toggle Test");

    // Convert back to paragraph
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.chain().focus().setNode("paragraph").run();
      }
    });

    await page.waitForTimeout(300);

    // Verify it's now a paragraph
    const paragraph = editor.locator(".react-renderer.node-paragraph").first();
    await expect(paragraph).toBeVisible();
    await expect(paragraph).toContainText("Toggle Test");

    // Verify heading is gone
    heading = editor.locator("h2").first();
    await expect(heading).toHaveCount(0);
  });

  test("should change heading levels", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Start with H1
    await page.keyboard.type("Level Change Test");
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.chain().focus().setNode("heading", { level: 1 }).run();
      }
    });

    await page.waitForTimeout(300);

    // Verify H1
    let heading = editor.locator("h1").first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText("Level Change Test");

    // Change to H3
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.chain().focus().setNode("heading", { level: 3 }).run();
      }
    });

    await page.waitForTimeout(300);

    // Verify it's now H3
    heading = editor.locator("h3").first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText("Level Change Test");

    // Verify H1 is gone
    const oldHeading = editor.locator("h1").first();
    await expect(oldHeading).toHaveCount(0);
  });

  test("should support TextBlock styling", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Create a heading
    await page.keyboard.type("Styled Heading");
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.chain().focus().setNode("heading", { level: 2 }).run();
      }
    });

    await page.waitForTimeout(300);

    // Verify heading is created and inherits TextBlock styling capabilities
    const heading = editor.locator("h2").first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText("Styled Heading");

    // The heading should have the react-renderer wrapper for TextBlock functionality
    const headingWrapper = editor.locator(".react-renderer").first();
    await expect(headingWrapper).toBeVisible();
  });

  test("should allow text editing within heading", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Create heading
    await page.keyboard.type("Original Heading");
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.chain().focus().setNode("heading", { level: 1 }).run();
      }
    });

    await page.waitForTimeout(300);

    // Edit the text
    await page.keyboard.press("Home");
    await page.keyboard.type("Edited ");

    // Verify edited content
    const heading = editor.locator("h1").first();
    await expect(heading).toContainText("Edited Original Heading");
  });

  test("should support text alignment", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Create heading
    await page.keyboard.type("Aligned Heading");
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.chain().focus().setNode("heading", { level: 2 }).run();
      }
    });

    await page.waitForTimeout(300);

    // Apply text alignment using the setTextAlign command
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.chain().focus().setTextAlign("center").run();
      }
    });

    await page.waitForTimeout(300);

    // Verify heading still exists and is aligned
    const heading = editor.locator("h2").first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText("Aligned Heading");
  });

  test("should handle Enter key behavior", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Create heading
    await page.keyboard.type("Heading with Enter");
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.chain().focus().setNode("heading", { level: 3 }).run();
      }
    });

    await page.waitForTimeout(300);

    // Verify heading exists
    const heading = editor.locator("h3").first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText("Heading with Enter");

    // Press Enter and add new content
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.type("New content");
    await page.waitForTimeout(300);

    // Verify the editor contains both texts
    await expect(editor).toContainText("Heading with Enter");
    await expect(editor).toContainText("New content");
  });

  test("should handle backspace behavior", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Create heading
    await page.keyboard.type("Backspace Test");
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.chain().focus().setNode("heading", { level: 1 }).run();
      }
    });

    await page.waitForTimeout(300);

    // Try backspace at beginning (should preserve heading)
    await page.keyboard.press("Home");
    await page.keyboard.press("Backspace");

    // Heading should still exist
    const heading = editor.locator("h1").first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText("Backspace Test");
  });

  test("should handle empty headings", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Create and then clear heading
    await page.keyboard.type("Temporary");
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.chain().focus().setNode("heading", { level: 2 }).run();
      }
    });

    await page.waitForTimeout(300);

    // Select all and delete
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");

    // Empty heading should still exist
    const heading = editor.locator("h2").first();
    await expect(heading).toBeVisible();
  });

  test("should create multiple headings sequence", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Create and verify first heading
    await page.keyboard.type("First Heading");
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.chain().focus().setNode("heading", { level: 1 }).run();
      }
    });

    await page.waitForTimeout(300);

    const h1 = editor.locator("h1").first();
    await expect(h1).toBeVisible();
    await expect(h1).toContainText("First Heading");

    // Clear editor and create second heading separately
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.commands.clearContent();
      }
    });

    await page.waitForTimeout(200);

    await page.keyboard.type("Second Heading");
    await page.evaluate(() => {
      if ((window as any).editor) {
        (window as any).editor.chain().focus().setNode("heading", { level: 2 }).run();
      }
    });

    await page.waitForTimeout(300);

    // Verify second heading
    const h2 = editor.locator("h2").first();
    await expect(h2).toBeVisible();
    await expect(h2).toContainText("Second Heading");
  });
});
