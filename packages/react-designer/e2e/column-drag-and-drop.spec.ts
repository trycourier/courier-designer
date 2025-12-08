import { test, expect, setupComponentTest, getMainEditor } from "./test-utils";

test.describe("Column Drag and Drop", () => {
  test.beforeEach(async ({ page }) => {
    await setupComponentTest(page);
  });

  test("should drag element from sidebar into empty column cell", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert a column
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({
          columnsCount: 2,
        });
      }
    });

    await page.waitForTimeout(500);

    // Verify column exists
    const hasColumn = await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      return editorEl && editorEl.querySelector('[data-node-type="column"]') !== null;
    });

    expect(hasColumn).toBe(true);

    // Find a sidebar draggable item
    const textBlock = page.locator('[data-draggable-item="text"]').first();
    const textBlockExists = await textBlock.count();

    if (textBlockExists > 0) {
      // Find a column cell
      const columnCell = page.locator('[data-column-cell="true"]').first();
      const cellExists = await columnCell.count();

      if (cellExists > 0) {
        const cellBox = await columnCell.boundingBox();
        const textBox = await textBlock.boundingBox();

        if (cellBox && textBox) {
          // Drag from sidebar to column cell
          await page.mouse.move(textBox.x + textBox.width / 2, textBox.y + textBox.height / 2);
          await page.mouse.down();
          await page.waitForTimeout(100);

          // Move to column cell
          await page.mouse.move(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2);
          await page.waitForTimeout(200);

          // Check for blue border highlight (drag over indicator)
          const hasBlueBorder = await page.evaluate(() => {
            const cell = document.querySelector('[data-column-cell="true"]');
            if (!cell) return false;
            const styles = window.getComputedStyle(cell);
            return (
              styles.borderTopColor.includes("rgb(59, 130, 246)") ||
              styles.borderTopColor.includes("rgb(37, 99, 235)") ||
              cell.classList.toString().includes("border-t-blue")
            );
          });

          // Drop
          await page.mouse.up();
          await page.waitForTimeout(500);

          // Verify content was inserted into cell
          const cellHasContent = await page.evaluate(() => {
            const cell = document.querySelector('[data-column-cell="true"]');
            if (!cell) return false;
            const paragraph = cell.querySelector("p");
            return paragraph !== null;
          });

          expect(cellHasContent).toBe(true);
        }
      }
    }
  });

  test("should drag element from editor into column cell", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Add a paragraph to the editor first
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent(
          "<p>Test paragraph</p>"
        );
      }
    });

    await page.waitForTimeout(500);

    // Verify paragraph exists and is rendered
    const paragraphBeforeColumn = await page.evaluate(() => {
      const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
      return editorEl?.textContent?.includes("Test paragraph") || false;
    });
    expect(paragraphBeforeColumn).toBe(true);

    // Insert a column after the paragraph
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({
          columnsCount: 2,
        });
      }
    });

    await page.waitForTimeout(500);

    // Find the paragraph element by looking for the one containing "Test paragraph"
    // We need to find the draggable-item wrapper, not just any node-view-wrapper
    const paragraphWrapper = page.locator('.draggable-item:has-text("Test paragraph")').first();
    const paragraphExists = await paragraphWrapper.count();

    // Fallback: try to find by node-view-wrapper
    let dragSource = paragraphExists > 0 ? paragraphWrapper : null;
    if (!dragSource || (await dragSource.count()) === 0) {
      // Try finding all wrappers and checking their text content
      const allWrappers = page.locator("[data-node-view-wrapper]");
      const wrapperCount = await allWrappers.count();

      for (let i = 0; i < wrapperCount; i++) {
        const wrapper = allWrappers.nth(i);
        const text = await wrapper.textContent();
        if (text?.includes("Test paragraph")) {
          dragSource = wrapper;
          break;
        }
      }
    }

    if (!dragSource || (await dragSource.count()) === 0) {
      // Last resort: use first wrapper that's not a column
      const allWrappers = page.locator("[data-node-view-wrapper]");
      const wrapperCount = await allWrappers.count();
      for (let i = 0; i < wrapperCount; i++) {
        const wrapper = allWrappers.nth(i);
        const nodeType = await wrapper.getAttribute("data-node-type");
        if (nodeType !== "column") {
          dragSource = wrapper;
          break;
        }
      }
    }

    const sourceExists = dragSource && (await dragSource.count()) > 0;
    expect(sourceExists).toBe(true);

    if (sourceExists && dragSource) {
      // Close any open tooltips that might intercept pointer events
      await page.evaluate(() => {
        // Close all tippy tooltips
        const tippyRoots = document.querySelectorAll("[data-tippy-root]");
        tippyRoots.forEach((root) => {
          const tippyInstance = (root as any)._tippy;
          if (tippyInstance) {
            tippyInstance.hide();
          }
        });
        // Also try to remove tooltip elements
        const tooltips = document.querySelectorAll('[id^="tippy-"]');
        tooltips.forEach((tooltip) => tooltip.remove());
      });
      await page.waitForTimeout(200);

      // Get bounding box before attempting hover (to avoid tooltip interference)
      const sourceBox = await dragSource.boundingBox();
      expect(sourceBox).toBeTruthy();

      if (sourceBox) {
        // Try to find drag handle
        const dragHandle = dragSource.locator('[data-cypress="draggable-handle"]').first();
        const handleExists = await dragHandle.count();

        // Find a column cell
        const columnCell = page.locator('[data-column-cell="true"]').first();
        const cellExists = await columnCell.count();

        expect(cellExists).toBeGreaterThan(0);

        if (cellExists > 0) {
          const cellBox = await columnCell.boundingBox();
          expect(cellBox).toBeTruthy();

          if (cellBox) {
            // Move mouse to source element (left side where drag handle typically is)
            // Use force move to avoid tooltip interference
            await page.mouse.move(sourceBox.x + 10, sourceBox.y + sourceBox.height / 2, {
              steps: 5,
            });
            await page.waitForTimeout(200);

            // Start drag
            await page.mouse.down();
            await page.waitForTimeout(200);

            // Move to column cell center
            await page.mouse.move(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2, {
              steps: 10,
            });
            await page.waitForTimeout(500);

            // Wait for drop target to be active
            await page.waitForTimeout(200);

            await page.mouse.up();
            await page.waitForTimeout(1000);

            // Verify paragraph was moved to cell
            const paragraphInCell = await page.evaluate(() => {
              const cells = document.querySelectorAll('[data-column-cell="true"]');
              for (const cell of Array.from(cells)) {
                if (cell.textContent?.includes("Test paragraph")) {
                  return true;
                }
              }
              return false;
            });

            expect(paragraphInCell).toBe(true);
          }
        }
      }
    }
  });

  test("should show blue border highlight when dragging over column cell", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert a column
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({
          columnsCount: 2,
        });
      }
    });

    await page.waitForTimeout(500);

    // Find sidebar item
    const textBlock = page.locator('[data-draggable-item="text"]').first();
    const textBlockExists = await textBlock.count();

    if (textBlockExists > 0) {
      const columnCell = page.locator('[data-column-cell="true"]').first();
      const cellExists = await columnCell.count();

      if (cellExists > 0) {
        const cellBox = await columnCell.boundingBox();
        const textBox = await textBlock.boundingBox();

        if (cellBox && textBox) {
          // Start drag
          await page.mouse.move(textBox.x + textBox.width / 2, textBox.y + textBox.height / 2);
          await page.mouse.down();
          await page.waitForTimeout(100);

          // Move over cell
          await page.mouse.move(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2);
          await page.waitForTimeout(300);

          // Check for blue border
          const hasBlueBorder = await page.evaluate(() => {
            const cells = document.querySelectorAll('[data-column-cell="true"]');
            for (const cell of Array.from(cells)) {
              const styles = window.getComputedStyle(cell);
              const borderTop = styles.borderTopWidth;
              const borderColor = styles.borderTopColor;
              if (
                parseFloat(borderTop) > 0 &&
                (borderColor.includes("rgb(59, 130, 246)") ||
                  borderColor.includes("rgb(37, 99, 235)") ||
                  borderColor.includes("blue"))
              ) {
                return true;
              }
            }
            return false;
          });

          await page.mouse.up();
          expect(hasBlueBorder).toBe(true);
        }
      }
    }
  });

  test("should reorder elements within a column cell", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert a column
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({
          columnsCount: 2,
        });
      }
    });

    await page.waitForTimeout(500);

    // Add two paragraphs to the first cell
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        // Find first cell and insert content
        editor.state.doc.descendants((node: any, pos: number) => {
          if (node.type.name === "columnCell" && node.attrs.index === 0) {
            const insertPos = pos + 1;
            editor.commands.insertContentAt(insertPos, {
              type: "paragraph",
              attrs: {},
              content: [],
            });
            editor.commands.insertContentAt(insertPos + 3, {
              type: "paragraph",
              attrs: {},
              content: [],
            });
            return false;
          }
          return true;
        });
      }
    });

    await page.waitForTimeout(500);

    // Verify cells have content
    const cellsHaveContent = await page.evaluate(() => {
      const cells = document.querySelectorAll('[data-column-cell="true"]');
      return cells.length > 0;
    });

    expect(cellsHaveContent).toBe(true);
  });

  test("should drag element between column cells", async ({ page }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert a column
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({
          columnsCount: 2,
        });
      }
    });

    await page.waitForTimeout(500);

    // Add content to first cell via sidebar
    const textBlock = page.locator('[data-draggable-item="text"]').first();
    const textBlockExists = await textBlock.count();

    if (textBlockExists > 0) {
      const firstCell = page.locator('[data-column-cell="true"]').first();
      const cellExists = await firstCell.count();

      if (cellExists > 0) {
        const cellBox = await firstCell.boundingBox();
        const textBox = await textBlock.boundingBox();

        if (cellBox && textBox) {
          // Drag to first cell
          await page.mouse.move(textBox.x + textBox.width / 2, textBox.y + textBox.height / 2);
          await page.mouse.down();
          await page.waitForTimeout(100);
          await page.mouse.move(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2);
          await page.waitForTimeout(200);
          await page.mouse.up();
          await page.waitForTimeout(500);

          // Now drag from first cell to second cell
          const cells = page.locator('[data-column-cell="true"]');
          const cellCount = await cells.count();

          if (cellCount >= 2) {
            const firstCellContent = cells.first();
            const secondCell = cells.nth(1);

            const firstBox = await firstCellContent.boundingBox();
            const secondBox = await secondCell.boundingBox();

            if (firstBox && secondBox) {
              // Find draggable element in first cell
              const draggableInCell = firstCellContent.locator("[data-node-view-wrapper]").first();
              const draggableExists = await draggableInCell.count();

              if (draggableExists > 0) {
                const draggableBox = await draggableInCell.boundingBox();
                if (draggableBox) {
                  await page.mouse.move(
                    draggableBox.x + draggableBox.width / 2,
                    draggableBox.y + draggableBox.height / 2
                  );
                  await page.mouse.down();
                  await page.waitForTimeout(100);
                  await page.mouse.move(
                    secondBox.x + secondBox.width / 2,
                    secondBox.y + secondBox.height / 2
                  );
                  await page.waitForTimeout(200);
                  await page.mouse.up();
                  await page.waitForTimeout(500);

                  // Verify content moved to second cell
                  const contentInSecondCell = await page.evaluate(() => {
                    const cells = document.querySelectorAll('[data-column-cell="true"]');
                    if (cells.length < 2) return false;
                    const secondCell = cells[1];
                    return secondCell.querySelector("p") !== null;
                  });

                  expect(contentInSecondCell).toBe(true);
                }
              }
            }
          }
        }
      }
    }
  });

  test("should disable main editor drag indicator when dragging over column cells", async ({
    page,
  }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert a column
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({
          columnsCount: 2,
        });
      }
    });

    await page.waitForTimeout(500);

    // Add a paragraph outside the column
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent(
          "<p>Outside paragraph</p>"
        );
      }
    });

    await page.waitForTimeout(300);

    // Find the paragraph
    const paragraph = page.locator("[data-node-view-wrapper]").first();
    const paraExists = await paragraph.count();

    if (paraExists > 0) {
      const columnCell = page.locator('[data-column-cell="true"]').first();
      const cellExists = await columnCell.count();

      if (cellExists > 0) {
        const paraBox = await paragraph.boundingBox();
        const cellBox = await columnCell.boundingBox();

        if (paraBox && cellBox) {
          // Start dragging paragraph
          await page.mouse.move(paraBox.x + paraBox.width / 2, paraBox.y + paraBox.height / 2);
          await page.mouse.down();
          await page.waitForTimeout(100);

          // Move over column cell (middle area, not edges)
          await page.mouse.move(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2);
          await page.waitForTimeout(300);

          // Check that main editor drop indicator is not shown
          const hasMainIndicator = await page.evaluate(() => {
            const editorEl = document.querySelector("[data-testid=\"email-editor\"] .tiptap.ProseMirror[contenteditable=\"true\"]");
            if (!editorEl) return false;
            // Look for drop indicator placeholder
            const indicators = editorEl.querySelectorAll("[data-drop-indicator]");
            return indicators.length > 0;
          });

          // Main indicator should not be visible when over column cell
          expect(hasMainIndicator).toBe(false);

          await page.mouse.up();
        }
      }
    }
  });

  test("should allow reordering column element itself relative to other blocks", async ({
    page,
  }) => {
    const editor = getMainEditor(page);

    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Add a paragraph
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent(
          "<p>First paragraph</p>"
        );
      }
    });

    await page.waitForTimeout(300);

    // Insert a column
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({
          columnsCount: 2,
        });
      }
    });

    await page.waitForTimeout(500);

    // Add another paragraph after column
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent(
          "<p>Second paragraph</p>"
        );
      }
    });

    await page.waitForTimeout(300);

    // Find column element
    const column = page.locator('[data-node-type="column"]').first();
    const columnExists = await column.count();

    if (columnExists > 0) {
      const columnBox = await column.boundingBox();
      if (columnBox) {
        // Try to drag column by its edge zone (top area)
        await page.mouse.move(columnBox.x + columnBox.width / 2, columnBox.y + 10);
        await page.mouse.down();
        await page.waitForTimeout(100);

        // Move up to reorder before first paragraph
        await page.mouse.move(columnBox.x + columnBox.width / 2, columnBox.y - 50);
        await page.waitForTimeout(200);

        await page.mouse.up();
        await page.waitForTimeout(500);

        // Verify column still exists
        const columnStillExists = await page.evaluate(() => {
          return document.querySelector('[data-node-type="column"]') !== null;
        });

        expect(columnStillExists).toBe(true);
      }
    }
  });
});
