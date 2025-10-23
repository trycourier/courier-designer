import type { Page } from "@playwright/test";
import { test as base, expect } from "@playwright/test";

// Extended test with isolated storage state
export const test = base;

export { expect } from "@playwright/test";

// Import mockTemplateResponse for proper API mocking
import { mockTemplateResponse, mockTemplateDataSamples } from "./template-test-utils";

/**
 * Setup function for component E2E tests
 * Properly mocks template API and ensures editor is ready
 */
export async function setupComponentTest(page: Page) {
  // Mock the template API response with a simple template
  await mockTemplateResponse(page, mockTemplateDataSamples.emptyTemplate, {
    delay: 100,
    requireAuth: false,
  });

  // Navigate to the app
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  // Ensure editor is ready (skip navigation since we already navigated)
  const editor = await ensureEditorReady(page, { skipNavigation: true });

  // Clear any existing content
  await setEditorContent(page, "");

  return editor;
}

/**
 * Ensures the TipTap editor is ready and available for testing
 */
export async function ensureEditorReady(page: Page, options?: { skipNavigation?: boolean }) {
  // Navigate with stable loading unless skipped
  if (!options?.skipNavigation) {
    // Force a full reload to clear any previous state
    // Use domcontentloaded to avoid hanging on CI
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const waitTime = process.env.CI ? 5000 : 2000;
    await page.waitForTimeout(waitTime);
  }

  // Wait for editor to be visible
  const editor = page.locator(".tiptap.ProseMirror").first();
  await expect(editor).toBeVisible({ timeout: 10000 });

  // Wait for the editor to be available in the window object
  // Try to wait for it but don't fail if it takes too long - just wait a bit more
  try {
    await page.waitForFunction(
      () => {
        const testObj = (window as any).__COURIER_CREATE_TEST__;
        return testObj && testObj.currentEditor !== null && testObj.currentEditor !== undefined;
      },
      { timeout: 5000, polling: 100 }
    );
  } catch (e) {
    // If it times out, wait a bit more for the editor to initialize
    await page.waitForTimeout(2000);
  }

  // Additional wait to ensure extensions are loaded
  await page.waitForTimeout(500);

  return editor;
}

/**
 * Clears the editor content and inserts new text using TipTap commands
 */
export async function setEditorContent(page: Page, content: string) {
  await page.evaluate((text: string) => {
    const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
    if (editor) {
      // Clear content multiple times to ensure it's truly cleared
      editor.commands.clearContent();
      editor.commands.setContent({ type: "doc", content: [] });

      // Only insert content if text is not empty
      if (text) {
        editor.commands.insertContent(text);
      }
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
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {

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

// Helper function to ensure clean editor state
export async function resetEditorState(page: Page, options?: { clearStorage?: boolean }) {
  // Navigate to the app first
  await page.goto("/", { waitUntil: "domcontentloaded" });

  // Optionally clear storage (disabled by default as it can break editor initialization)
  if (options?.clearStorage) {
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // Ignore storage errors in case storage is not available
        console.warn("Storage clearing failed:", e);
      }
    });
  }

  // Wait for the app to be fully loaded
  await page.waitForSelector(".tiptap.ProseMirror", { timeout: 30000 });
  await page.waitForFunction(
    () => {
      const editor = document.querySelector(".tiptap.ProseMirror");
      return editor && editor.getAttribute("contenteditable") === "true";
    },
    { timeout: 30000 }
  );

  // Close any open tooltips/overlays that might interfere
  await page.evaluate(() => {
    // Remove any tippy/tooltip overlays
    const tippyElements = document.querySelectorAll('[id^="tippy-"]');
    tippyElements.forEach((el) => el.remove());

    // Close any open menus or overlays
    const overlays = document.querySelectorAll('[role="tooltip"], [role="menu"], .tippy-box');
    overlays.forEach((el) => el.remove());
  });

  // Wait a bit for UI to settle
  await page.waitForTimeout(500);

  const editor = page.locator(".tiptap.ProseMirror").first();

  // Clear subject input
  const subjectInput = page.locator('input[placeholder="Write subject..."]');
  if ((await subjectInput.count()) > 0) {
    await subjectInput.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await page.keyboard.press("Escape");
  }

  // Use force click to bypass any overlays and clear editor content
  await editor.click({ force: true });
  await page.waitForTimeout(200);

  // Multiple rounds of clearing with generous timeouts
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(300);
  }

  // Ensure editor is completely empty by using TipTap commands if available
  await page.evaluate(() => {
    const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
    if (editor) {
      editor.commands.clearContent();
      editor.commands.focus();
    }
  });

  // Final comprehensive clearing
  await page.evaluate(() => {
    // Remove all existing paragraph elements
    const paragraphs = document.querySelectorAll(".react-renderer.node-paragraph");
    paragraphs.forEach((p) => {
      if (p.textContent && p.textContent.trim()) {
        p.textContent = "";
      }
    });

    // Ensure editor is completely empty
    const editor = document.querySelector(".tiptap.ProseMirror");
    if (editor) {
      editor.innerHTML = "";
    }
  });

  // Final wait for content to stabilize
  await page.waitForTimeout(500);

  // Ensure the editor is ready after reset
  await ensureEditorReady(page, { skipNavigation: true });
}
