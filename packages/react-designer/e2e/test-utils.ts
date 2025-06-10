import { expect, type Page } from "@playwright/test";

/**
 * Ensures the TipTap editor is ready and available for testing
 */
export async function ensureEditorReady(page: Page) {
  // Navigate with stable loading
  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // Wait for editor to be visible
  const editor = page.locator(".tiptap.ProseMirror").first();
  await expect(editor).toBeVisible({ timeout: 10000 });

  // Wait for the editor to be available in the window object
  await page.waitForFunction(() => (window as any).editor !== null, { timeout: 10000 });

  return editor;
}

/**
 * Clears the editor content and inserts new text using TipTap commands
 */
export async function setEditorContent(page: Page, content: string) {
  await page.evaluate((text: string) => {
    if ((window as any).editor) {
      const editor = (window as any).editor;
      editor.commands.clearContent();
      editor.commands.insertContent(text);
    }
  }, content);

  // Wait for content to be processed
  await page.waitForTimeout(500);
}

/**
 * Applies formatting to text in the editor using TipTap commands
 */
export async function applyFormattingToText(
  page: Page,
  testText: string,
  formatType: "bold" | "italic" | "underline" | "strike",
  commandName: string
) {
  // Ensure editor is ready
  await ensureEditorReady(page);

  // Set clean content
  await setEditorContent(page, testText);

  // Apply formatting using TipTap commands
  const result = await page.evaluate(
    ({ testText, commandName }: { testText: string; commandName: string }) => {
      if ((window as any).editor) {
        const editor = (window as any).editor;

        // Find the paragraph with our test text
        let targetPos = -1;
        editor.state.doc.descendants((node: any, pos: any) => {
          if (node.type.name === "paragraph") {
            if (node.textContent === testText) {
              targetPos = pos + 1; // Position inside the paragraph
              return false; // Stop searching
            }
          }
        });

        if (targetPos >= 0) {
          // Select all text in the paragraph
          const textLength = testText.length;
          editor.commands.setTextSelection({ from: targetPos, to: targetPos + textLength });

          // Check selection before formatting
          const beforeSelection = {
            from: editor.state.selection.from,
            to: editor.state.selection.to,
            empty: editor.state.selection.empty,
            selectedText: editor.state.doc.textBetween(
              editor.state.selection.from,
              editor.state.selection.to
            ),
          };

          // Apply the specific formatting command
          const commandResult = editor.commands[commandName]();

          // Get the final state
          const formatName = commandName.replace("toggle", "").toLowerCase();
          const afterState = {
            json: editor.getJSON(),
            isActive: editor.isActive(formatName),
            selection: {
              from: editor.state.selection.from,
              to: editor.state.selection.to,
              empty: editor.state.selection.empty,
            },
            currentMarks: editor.state.selection.$head.marks().map((mark: any) => mark.type.name),
          };

          return {
            success: true,
            beforeSelection,
            commandResult,
            afterState,
            error: null,
          };
        }

        return {
          success: false,
          error: "Could not find paragraph with text: " + testText,
        };
      }
      return {
        success: false,
        error: "Editor not found",
      };
    },
    { testText, commandName }
  );

  return result;
}

/**
 * Types text safely into the editor with proper clearing
 */
export async function typeTextSafely(page: Page, text: string) {
  await ensureEditorReady(page);
  await setEditorContent(page, text);
}
