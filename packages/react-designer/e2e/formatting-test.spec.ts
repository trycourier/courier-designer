import { test, expect } from "@playwright/test";
import { setupMockedTest, mockTemplateDataSamples } from "./template-test-utils";

// Force serial execution to prevent state contamination
test.describe.configure({ mode: "serial" });

async function applyFormattingToText(
  page: any,
  testText: string,
  formatType: "bold" | "italic" | "underline" | "strike",
  commandName: string
) {
  // Setup with mocked API - no navigation needed as beforeEach handles it
  await page.waitForTimeout(500);

  const editor = page.locator(".tiptap.ProseMirror").first();
  await expect(editor).toBeVisible({ timeout: 10000 });

  // Wait for the editor to be available in the window object
  await page.waitForFunction(() => (window as any).__COURIER_CREATE_TEST__?.currentEditor !== null, { timeout: 10000 });

  // Use TipTap editor commands to directly create clean content and format it
  const result = await page.evaluate(
    ({ testText, commandName }: { testText: string; commandName: string }) => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;

        // Clear editor content and insert text directly
        editor.commands.clearContent();
        editor.commands.insertContent(testText);

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

test.describe("TextMenu Formatting", () => {
  test.beforeEach(async ({ page }) => {
    await setupMockedTest(page, mockTemplateDataSamples.emptyTemplate);
  });

  test("should apply bold formatting", async ({ page }) => {
    const result = await applyFormattingToText(page, "Bold test", "bold", "toggleBold");

    expect(result.success).toBe(true);
    expect(result.beforeSelection.selectedText).toBe("Bold test");
    expect(result.beforeSelection.empty).toBe(false);
    expect(result.commandResult).toBe(true);
    expect(result.afterState.isActive).toBe(true);
    expect(result.afterState.currentMarks).toContain("bold");
  });

  test("should apply italic formatting", async ({ page }) => {
    const result = await applyFormattingToText(page, "Italic test", "italic", "toggleItalic");

    expect(result.success).toBe(true);
    expect(result.beforeSelection.selectedText).toBe("Italic test");
    expect(result.beforeSelection.empty).toBe(false);
    expect(result.commandResult).toBe(true);
    expect(result.afterState.isActive).toBe(true);
    expect(result.afterState.currentMarks).toContain("italic");
  });

  test("should apply underline formatting", async ({ page }) => {
    const result = await applyFormattingToText(
      page,
      "Underline test",
      "underline",
      "toggleUnderline"
    );

    expect(result.success).toBe(true);
    expect(result.beforeSelection.selectedText).toBe("Underline test");
    expect(result.beforeSelection.empty).toBe(false);
    expect(result.commandResult).toBe(true);
    expect(result.afterState.isActive).toBe(true);
    expect(result.afterState.currentMarks).toContain("underline");
  });

  test("should apply strikethrough formatting", async ({ page }) => {
    const result = await applyFormattingToText(page, "Strike test", "strike", "toggleStrike");

    expect(result.success).toBe(true);
    expect(result.beforeSelection.selectedText).toBe("Strike test");
    expect(result.beforeSelection.empty).toBe(false);
    expect(result.commandResult).toBe(true);
    expect(result.afterState.isActive).toBe(true);
    expect(result.afterState.currentMarks).toContain("strike");
  });
});
