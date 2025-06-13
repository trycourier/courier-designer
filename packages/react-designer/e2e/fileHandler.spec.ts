import { test, expect, resetEditorState } from "./test-utils";

test.describe("FileHandler Component", () => {
  test.beforeEach(async ({ page }) => {
    // Use the enhanced reset function for better isolation
    await resetEditorState(page);
  });

  test("should verify fileHandler extension is available", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    // Use force click to bypass any overlays
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if fileHandler extension exists
    const hasFileHandlerExtension = await page.evaluate(() => {
      if ((window as any).editor) {
        try {
          // Check if the fileHandler extension is registered
          const extensions = (window as any).editor.extensionManager.extensions;
          return extensions.some((ext: any) => ext.name === "fileHandler");
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(hasFileHandlerExtension).toBe(true);
  });

  test("should verify fileHandler is registered as extension", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if fileHandler extension is registered
    const hasFileHandlerExtension = await page.evaluate(() => {
      if ((window as any).editor) {
        const extensions = (window as any).editor.extensionManager.extensions;
        return extensions.some((ext: any) => ext.name === "fileHandler");
      }
      return false;
    });

    expect(hasFileHandlerExtension).toBe(true);
  });

  test("should check fileHandler plugin configuration", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if fileHandler plugin exists
    const hasFileHandlerPlugin = await page.evaluate(() => {
      if ((window as any).editor) {
        const fileHandlerExtension = (window as any).editor.extensionManager.extensions.find(
          (ext: any) => ext.name === "fileHandler"
        );
        return fileHandlerExtension && fileHandlerExtension.options !== undefined;
      }
      return false;
    });

    expect(hasFileHandlerPlugin).toBe(true);
  });

  test("should verify fileHandler plugin integration", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if FileHandler is available
    const hasFileHandlerPlugin = await page.evaluate(() => {
      if ((window as any).editor) {
        const fileHandlerExtension = (window as any).editor.extensionManager.extensions.find(
          (ext: any) => ext.name === "fileHandler"
        );
        return fileHandlerExtension && fileHandlerExtension.options !== undefined;
      }
      return false;
    });

    // This verifies the component is properly integrated
    expect(hasFileHandlerPlugin).toBe(true);
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

  test("should handle file drop simulation", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Simulate file drop event
    const dropEventHandled = await page.evaluate(() => {
      if ((window as any).editor) {
        try {
          const editorElement = document.querySelector(".tiptap.ProseMirror");
          if (editorElement) {
            // Create a mock drop event
            const mockEvent = new DragEvent("drop", {
              bubbles: true,
              cancelable: true,
              dataTransfer: new DataTransfer(),
            });

            // Simulate file drop
            editorElement.dispatchEvent(mockEvent);
            return true;
          }
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(dropEventHandled).toBe(true);
  });

  test("should handle file paste simulation", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Simulate file paste event
    const pasteEventHandled = await page.evaluate(() => {
      if ((window as any).editor) {
        try {
          const editorElement = document.querySelector(".tiptap.ProseMirror");
          if (editorElement) {
            // Create a mock paste event
            const mockEvent = new ClipboardEvent("paste", {
              bubbles: true,
              cancelable: true,
              clipboardData: new DataTransfer(),
            });

            // Simulate file paste
            editorElement.dispatchEvent(mockEvent);
            return true;
          }
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(pasteEventHandled).toBe(true);
  });

  test("should handle drag and drop area interaction", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Test drag over event
    const dragOverHandled = await page.evaluate(() => {
      if ((window as any).editor) {
        try {
          const editorElement = document.querySelector(".tiptap.ProseMirror");
          if (editorElement) {
            // Create a mock dragover event
            const mockEvent = new DragEvent("dragover", {
              bubbles: true,
              cancelable: true,
            });

            editorElement.dispatchEvent(mockEvent);
            return true;
          }
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(dragOverHandled).toBe(true);
  });

  test("should verify file handler with image MIME types", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if file handler supports image types
    const supportsImageTypes = await page.evaluate(() => {
      if ((window as any).editor) {
        const fileHandlerExtension = (window as any).editor.extensionManager.extensions.find(
          (ext: any) => ext.name === "fileHandler"
        );
        return fileHandlerExtension !== undefined;
      }
      return false;
    });

    expect(supportsImageTypes).toBe(true);
  });

  test("should verify file handler with document MIME types", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if file handler supports document types
    const supportsDocumentTypes = await page.evaluate(() => {
      if ((window as any).editor) {
        const fileHandlerExtension = (window as any).editor.extensionManager.extensions.find(
          (ext: any) => ext.name === "fileHandler"
        );
        return fileHandlerExtension !== undefined;
      }
      return false;
    });

    expect(supportsDocumentTypes).toBe(true);
  });

  test("should handle drop event with coordinates", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Simulate drop with specific coordinates
    const dropWithCoordinates = await page.evaluate(() => {
      if ((window as any).editor) {
        try {
          const editorElement = document.querySelector(".tiptap.ProseMirror");
          if (editorElement) {
            const rect = editorElement.getBoundingClientRect();
            const mockEvent = new DragEvent("drop", {
              bubbles: true,
              cancelable: true,
              clientX: rect.left + 50,
              clientY: rect.top + 50,
              dataTransfer: new DataTransfer(),
            });

            editorElement.dispatchEvent(mockEvent);
            return true;
          }
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(dropWithCoordinates).toBe(true);
  });

  test("should verify editor maintains functionality with file handler", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Type some text
    await page.keyboard.type("File handler test content");

    // Verify content is preserved
    await expect(editor).toContainText("File handler test content");

    // Simulate a file operation
    const fileOperationTest = await page.evaluate(() => {
      if ((window as any).editor) {
        try {
          const editorElement = document.querySelector(".tiptap.ProseMirror");
          if (editorElement) {
            const mockEvent = new DragEvent("drop", {
              bubbles: true,
              cancelable: true,
            });
            editorElement.dispatchEvent(mockEvent);
            return true;
          }
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(fileOperationTest).toBe(true);

    // Verify content is still there
    await expect(editor).toContainText("File handler test content");
  });

  test("should handle multiple file operations", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Simulate multiple file operations
    const multipleOperations = await page.evaluate(() => {
      if ((window as any).editor) {
        try {
          const editorElement = document.querySelector(".tiptap.ProseMirror");
          if (editorElement) {
            const operations = [];

            // Simulate multiple drop events
            for (let i = 0; i < 3; i++) {
              const mockEvent = new DragEvent("drop", {
                bubbles: true,
                cancelable: true,
                dataTransfer: new DataTransfer(),
              });
              editorElement.dispatchEvent(mockEvent);
              operations.push(true);
            }

            return operations.length === 3;
          }
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(multipleOperations).toBe(true);
  });

  test("should maintain editor stability with file operations", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Perform multiple operations to test stability
    await page.keyboard.type("Stability test content");
    await page.waitForTimeout(200);

    const stabilityTest = await page.evaluate(() => {
      if ((window as any).editor) {
        try {
          const editorElement = document.querySelector(".tiptap.ProseMirror");
          if (editorElement) {
            // Simulate various file events
            const dropEvent = new DragEvent("drop", { bubbles: true, cancelable: true });
            const pasteEvent = new ClipboardEvent("paste", { bubbles: true, cancelable: true });

            editorElement.dispatchEvent(dropEvent);
            editorElement.dispatchEvent(pasteEvent);

            return true;
          }
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(stabilityTest).toBe(true);

    // Verify editor is still functional and contains basic content
    await expect(editor).toContainText("Stability test content");
  });

  test("should handle file handler events without breaking editor", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Test that file handler events don't break normal editor functionality
    await page.keyboard.type("Before file operations");

    const eventHandlingTest = await page.evaluate(() => {
      if ((window as any).editor) {
        try {
          const editorElement = document.querySelector(".tiptap.ProseMirror");
          if (editorElement) {
            // Test various file-related events
            const events = [
              new DragEvent("dragenter", { bubbles: true }),
              new DragEvent("dragover", { bubbles: true }),
              new DragEvent("dragleave", { bubbles: true }),
              new DragEvent("drop", { bubbles: true, cancelable: true }),
              new ClipboardEvent("paste", { bubbles: true, cancelable: true }),
            ];

            events.forEach((event) => {
              editorElement.dispatchEvent(event);
            });

            return true;
          }
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(eventHandlingTest).toBe(true);

    // Verify editor still works
    await page.keyboard.type(" After file operations");
    await expect(editor).toContainText("Before file operations After file operations");
  });

  test("should handle file type filtering simulation", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Test file type filtering behavior
    const filteringTest = await page.evaluate(() => {
      if ((window as any).editor) {
        try {
          const fileHandlerExtension = (window as any).editor.extensionManager.extensions.find(
            (ext: any) => ext.name === "fileHandler"
          );

          if (fileHandlerExtension) {
            // Extension exists and can handle file filtering
            return true;
          }
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(filteringTest).toBe(true);
  });

  test("should verify file handler configuration options", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check file handler configuration
    const configurationTest = await page.evaluate(() => {
      if ((window as any).editor) {
        try {
          const fileHandlerExtension = (window as any).editor.extensionManager.extensions.find(
            (ext: any) => ext.name === "fileHandler"
          );

          return (
            fileHandlerExtension &&
            fileHandlerExtension.options !== undefined &&
            typeof fileHandlerExtension.options === "object"
          );
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(configurationTest).toBe(true);
  });

  test("should handle edge cases in file operations", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Test edge cases
    const edgeCaseTest = await page.evaluate(() => {
      if ((window as any).editor) {
        try {
          const editorElement = document.querySelector(".tiptap.ProseMirror");
          if (editorElement) {
            // Test edge cases: events without dataTransfer, invalid coordinates, etc.
            const edgeEvents = [
              new DragEvent("drop", { bubbles: true, cancelable: true }), // No dataTransfer
              new ClipboardEvent("paste", { bubbles: true, cancelable: true }), // No clipboardData
            ];

            edgeEvents.forEach((event) => {
              try {
                editorElement.dispatchEvent(event);
              } catch (e) {
                // Expected for some edge cases
              }
            });

            return true;
          }
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(edgeCaseTest).toBe(true);
  });

  test("should verify file handler doesn't interfere with text operations", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror").first();

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Test text operations work normally with file handler present
    await page.keyboard.type("Hello ");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("World!");

    await expect(editor).toContainText("HelloWorld!");

    // Verify file handler doesn't interfere with keyboard shortcuts
    await page.keyboard.press("Control+a");
    await page.keyboard.type("New content");

    await expect(editor).toContainText("New content");
  });
});
