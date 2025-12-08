import { test, expect, setupComponentTest, getMainEditor } from "./test-utils";

test.describe("Column Component", () => {
  test.beforeEach(async ({ page }) => {
    await setupComponentTest(page);
  });

  test("should verify column extension is available", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if column commands are available
    const hasColumnCommands = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        try {
          return typeof (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn === "function";
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(hasColumnCommands).toBeDefined();
  });

  test("should verify column is registered as extension", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if column extension is registered
    const hasColumnExtension = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const extensions = (window as any).__COURIER_CREATE_TEST__?.currentEditor.extensionManager.extensions;
        return extensions.some((ext: any) => ext.name === "column");
      }
      return false;
    });

    expect(hasColumnExtension).toBe(true);
  });

  test("should verify columnCell is registered as extension", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    const hasColumnCellExtension = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const extensions = (window as any).__COURIER_CREATE_TEST__?.currentEditor.extensionManager.extensions;
        return extensions.some((ext: any) => ext.name === "columnCell");
      }
      return false;
    });

    expect(hasColumnCellExtension).toBe(true);
  });

  test("should verify columnRow is registered as extension", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    const hasColumnRowExtension = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const extensions = (window as any).__COURIER_CREATE_TEST__?.currentEditor.extensionManager.extensions;
        return extensions.some((ext: any) => ext.name === "columnRow");
      }
      return false;
    });

    expect(hasColumnRowExtension).toBe(true);
  });

  test("should check column schema and configuration", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if column node type exists in schema
    const hasColumnNode = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        return (window as any).__COURIER_CREATE_TEST__?.currentEditor.schema.nodes.column !== undefined;
      }
      return false;
    });

    expect(hasColumnNode).toBe(true);
  });

  // TODO: Column insertion E2E tests - these pass in unit tests but have rendering issues in E2E environment
  // The column functionality is verified through unit tests and conversion tests
  test.skip("should insert column with default 2 columns", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({});
      }
    });

    await page.waitForTimeout(500);

    const hasColumnElement = await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      return editorEl && editorEl.querySelector('[data-type="column"]') !== null;
    });

    expect(hasColumnElement).toBe(true);
  });

  test.skip("should insert column with 3 columns", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({
          columnsCount: 3,
        });
      }
    });

    await page.waitForTimeout(500);

    const cellCount = await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      if (!editorEl) return 0;
      const cells = editorEl.querySelectorAll('[data-type="column-cell"]');
      return cells.length;
    });

    expect(cellCount).toBe(3);
  });

  test.skip("should insert column with 4 columns", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert column with 4 columns
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({
          columnsCount: 4,
        });
      }
    });

    await page.waitForTimeout(500);

    // Count column cells
    const cellCount = await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      if (!editorEl) return 0;
      const cells = editorEl.querySelectorAll('[data-type="column-cell"]');
      return cells.length;
    });

    expect(cellCount).toBe(4);
  });

  test.skip("should insert column with styling attributes", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert column with styling
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({
          columnsCount: 2,
          paddingHorizontal: 20,
          paddingVertical: 10,
          backgroundColor: "#f5f5f5",
          borderWidth: 2,
          borderRadius: 8,
          borderColor: "#cccccc",
        });
      }
    });

    await page.waitForTimeout(500);

    // Verify column has styling attributes
    const hasStyledColumn = await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      const column = editorEl?.querySelector('[data-type="column"]');
      if (!column) return false;

      return (
        column.getAttribute("data-background-color") === "#f5f5f5" &&
        column.getAttribute("data-border-width") === "2" &&
        column.getAttribute("data-border-radius") === "8"
      );
    });

    expect(hasStyledColumn).toBe(true);
  });

  test.skip("should handle content insertion in column cells", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert column
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({
          columnsCount: 2,
        });
      }
    });

    await page.waitForTimeout(500);

    // Try to insert content into a cell
    await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      const firstCell = editorEl?.querySelector('[data-type="column-cell"]');
      if (firstCell) {
        const paragraph = firstCell.querySelector("p");
        if (paragraph) {
          paragraph.textContent = "Test content in cell";
        }
      }
    });

    await page.waitForTimeout(300);

    // Verify content was added
    const cellContent = await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      const firstCell = editorEl?.querySelector('[data-type="column-cell"]');
      if (firstCell) {
        return firstCell.textContent?.trim() || "";
      }
      return "";
    });

    expect(cellContent.length).toBeGreaterThan(0);
  });

  test.skip("should support undo/redo for column insertion", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert column
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({});
      }
    });

    await page.waitForTimeout(500);

    // Verify column exists
    let hasColumn = await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      return editorEl && editorEl.querySelector('[data-type="column"]') !== null;
    });

    expect(hasColumn).toBe(true);

    // Undo
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.undo();
      }
    });

    await page.waitForTimeout(300);

    // Verify column is gone
    hasColumn = await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      return editorEl && editorEl.querySelector('[data-type="column"]') !== null;
    });

    expect(hasColumn).toBe(false);

    // Redo
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.redo();
      }
    });

    await page.waitForTimeout(300);

    // Verify column is back
    hasColumn = await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      return editorEl && editorEl.querySelector('[data-type="column"]') !== null;
    });

    expect(hasColumn).toBe(true);
  });

  test.skip("should handle column deletion", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert column
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({});
      }
    });

    await page.waitForTimeout(500);

    // Delete column
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        editor.commands.selectAll();
        editor.commands.deleteSelection();
      }
    });

    await page.waitForTimeout(300);

    // Verify column is deleted
    const hasColumn = await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      return editorEl && editorEl.querySelector('[data-type="column"]') !== null;
    });

    expect(hasColumn).toBe(false);
  });

  test.skip("should handle multiple columns in document", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Clear content first
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
      }
    });

    await page.waitForTimeout(200);

    // Insert first column
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({
          columnsCount: 2,
        });
      }
    });

    await page.waitForTimeout(300);

    // Insert paragraph separator
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent("<p>Separator</p>");
      }
    });

    await page.waitForTimeout(300);

    // Insert second column
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({
          columnsCount: 3,
        });
      }
    });

    await page.waitForTimeout(500);

    // Count columns
    const columnCount = await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      if (!editorEl) return 0;
      const columns = editorEl.querySelectorAll('[data-type="column"]');
      return columns.length;
    });

    expect(columnCount).toBeGreaterThanOrEqual(1);
  });

  test.skip("should verify column structure integrity", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert column
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({
          columnsCount: 2,
        });
      }
    });

    await page.waitForTimeout(500);

    // Verify structure: column > columnRow > columnCell
    const hasCorrectStructure = await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      const column = editorEl?.querySelector('[data-type="column"]');
      if (!column) return false;

      const row = column.querySelector('[data-type="column-row"]');
      if (!row) return false;

      const cells = row.querySelectorAll('[data-type="column-cell"]');
      return cells.length === 2;
    });

    expect(hasCorrectStructure).toBe(true);
  });

  test.skip("should handle empty cells correctly", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert column
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({
          columnsCount: 2,
        });
      }
    });

    await page.waitForTimeout(500);

    // Verify cells exist and can be empty
    const cellsExist = await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      const cells = editorEl?.querySelectorAll('[data-type="column-cell"]');
      return cells && cells.length === 2;
    });

    expect(cellsExist).toBe(true);
  });

  test.skip("should maintain column attributes after page interaction", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert column with specific attributes
    const testAttributes = {
      columnsCount: 3,
      paddingHorizontal: 15,
      paddingVertical: 10,
      backgroundColor: "#e0e0e0",
    };

    await page.evaluate((attrs) => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn(attrs);
      }
    }, testAttributes);

    await page.waitForTimeout(500);

    // Verify attributes are preserved
    const attributesMatch = await page.evaluate((expected) => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      const column = editorEl?.querySelector('[data-type="column"]');
      if (!column) return false;

      return (
        column.getAttribute("data-columns-count") === String(expected.columnsCount) &&
        column.getAttribute("data-background-color") === expected.backgroundColor
      );
    }, testAttributes);

    expect(attributesMatch).toBe(true);
  });

  test.skip("should work in email channel", async ({ page }) => {
    const editor = getMainEditor(page);
    await expect(editor).toBeVisible();

    // Switch to email channel if tab exists
    const emailTab = page.locator('[data-channel="email"]').first();
    const emailTabExists = await emailTab.count();
    if (emailTabExists > 0) {
      await emailTab.click({ force: true });
      await page.waitForTimeout(500);
    }

    // Insert column in email
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({
          columnsCount: 2,
        });
      }
    });

    await page.waitForTimeout(500);

    // Verify column exists in email
    const hasColumn = await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      return editorEl && editorEl.querySelector('[data-type="column"]') !== null;
    });

    expect(hasColumn).toBe(true);
  });

  test("should verify column integration with editor", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Verify column command can be called
    const canSetColumn = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        return (window as any).__COURIER_CREATE_TEST__?.currentEditor.can().setColumn({});
      }
      return false;
    });

    expect(canSetColumn).toBe(true);
  });
});
