import { test, expect } from "@playwright/test";
import { resetEditorState } from "./test-utils";

test.describe("Selection Extension E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await resetEditorState(page);
  });

  test("should have selection extension available", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror");
    await expect(editor).toBeVisible();

    await editor.click();
    await page.keyboard.type("Test paragraph for selection");

    await expect(editor).toContainText("Test paragraph for selection");
  });

  test("should handle basic selection operations", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror");
    await editor.click();

    await page.keyboard.type("Test paragraph");

    await editor.locator("p").click();

    await expect(editor.locator("p")).toContainText("Test paragraph");
  });

  test("should handle click events on paragraphs", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror");
    await editor.click();

    await page.keyboard.type("First paragraph");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Second paragraph");

    const firstParagraph = editor.locator("p").first();
    const secondParagraph = editor.locator("p").last();

    await firstParagraph.click();
    await expect(firstParagraph).toContainText("First paragraph");

    await secondParagraph.click();
    await expect(secondParagraph).toContainText("Second paragraph");
  });

  test("should handle selection with headings", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror");
    await editor.click();

    await page.keyboard.type("# Main Heading");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Regular paragraph");

    await expect(editor.locator("h1")).toContainText("Main Heading");
    await expect(editor.locator("p")).toContainText("Regular paragraph");

    await editor.locator("h1").click();
    await expect(editor.locator("h1")).toContainText("Main Heading");
  });

  test("should handle selection with blockquotes", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror");
    await editor.click();

    await page.keyboard.type("> This is a quote");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Regular text");

    await expect(editor.locator("blockquote")).toContainText("This is a quote");
    await expect(editor.locator("p")).toContainText("Regular text");

    await editor.locator("blockquote").click();
    await expect(editor.locator("blockquote")).toContainText("This is a quote");
  });

  test("should handle production-level selection scenarios", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror");
    await editor.click();

    await page.keyboard.type("# Document Title");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Introduction paragraph.");
    await page.keyboard.press("Enter");
    await page.keyboard.type("## Section 1");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Content for section 1.");
    await page.keyboard.press("Enter");
    await page.keyboard.type("> Important note");

    await editor.locator("h1").click();
    await expect(editor.locator("h1")).toContainText("Document Title");

    await editor.locator("h2").click();
    await expect(editor.locator("h2")).toContainText("Section 1");

    await editor.locator("blockquote").click();
    await expect(editor.locator("blockquote")).toContainText("Important note");
  });
});
