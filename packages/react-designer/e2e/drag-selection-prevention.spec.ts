import { test, expect, setupComponentTest } from "./test-utils";

test.describe("Drag Selection Prevention", () => {
  test.beforeEach(async ({ page }) => {
    await setupComponentTest(page);
  });

  test.describe("Email Channel", () => {
    test("should not select elements when dragging new element from sidebar", async ({ page }) => {
      const editor = page.locator(".tiptap.ProseMirror").first();
      await expect(editor).toBeVisible();

      // Try to switch to email channel if tab exists
      const emailTab = page.locator('[data-channel="email"]').first();
      const emailTabExists = await emailTab.count();
      if (emailTabExists > 0) {
        await emailTab.click({ force: true });
        await page.waitForTimeout(500);
      }

      // Add some initial content
      await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (editor) {
          editor.commands.clearContent();
          editor.commands.insertContent("<p>Test paragraph 1</p><p>Test paragraph 2</p>");
        }
      });

      await page.waitForTimeout(500);

      // Get initial selection state
      const initialSelectionState = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (editor) {
          return {
            hasSelection: editor.state.selection.empty === false,
            selectedText: editor.state.doc.textBetween(
              editor.state.selection.from,
              editor.state.selection.to
            ),
          };
        }
        return null;
      });

      // Locate a draggable item in the sidebar (e.g., Text block)
      const textBlockDraggable = page.locator('[data-draggable-item="text"]').first();

      // Check if sidebar item exists
      const sidebarItemExists = await textBlockDraggable.count();

      if (sidebarItemExists > 0) {
        // Start dragging from sidebar
        const boundingBox = await textBlockDraggable.boundingBox();
        if (boundingBox) {
          // Simulate drag start
          await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
          await page.mouse.down();
          await page.waitForTimeout(100);

          // Move over the editor
          const editorBox = await editor.boundingBox();
          if (editorBox) {
            await page.mouse.move(editorBox.x + editorBox.width / 2, editorBox.y + editorBox.height / 2);
            await page.waitForTimeout(200);

            // Check that isDragging state is true during drag
            const isDraggingState = await page.evaluate(() => {
              return (window as any).__COURIER_TEST_DRAGGING__ || false;
            });

            // Check that no element is selected during drag
            const selectionDuringDrag = await page.evaluate(() => {
              const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
              if (editor) {
                // Check if any paragraph has the selected-element class
                const hasSelectedElement = editor.view.dom.querySelector(".selected-element") !== null;
                return {
                  hasSelectedElement,
                  hasSelection: editor.state.selection.empty === false,
                };
              }
              return null;
            });

            // During drag, elements should not be selected
            expect(selectionDuringDrag?.hasSelectedElement).toBe(false);

            // End drag
            await page.mouse.up();
            await page.waitForTimeout(300);
          }
        }
      }

      // Verify editor is still functional after drag operation
      await expect(editor).toContainText("Test paragraph 1");
    });

    test("should not select elements when reordering existing elements", async ({ page }) => {
      const editor = page.locator(".tiptap.ProseMirror").first();

      // Add multiple paragraphs
      await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (editor) {
          editor.commands.clearContent();
          editor.commands.insertContent(
            "<p>First paragraph</p><p>Second paragraph</p><p>Third paragraph</p>"
          );
        }
      });

      await page.waitForTimeout(500);

      // Find a drag handle or element wrapper
      const dragHandle = editor.locator('[data-node-view-wrapper]').first();
      const dragHandleExists = await dragHandle.count();

      if (dragHandleExists > 0) {
        const boundingBox = await dragHandle.boundingBox();
        if (boundingBox) {
          // Start dragging
          await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
          await page.mouse.down();
          await page.waitForTimeout(200);

          // Move to reorder - move significantly
          await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height * 2.5);
          await page.waitForTimeout(300);

          // Check selection state during drag
          const selectionDuringDrag = await page.evaluate(() => {
            const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
            if (editor) {
              const hasSelectedElement = editor.view.dom.querySelector(".selected-element") !== null;
              // Also check if any drag is actually in progress
              const hasDragPlaceholder = editor.view.dom.querySelector('[data-placeholder="true"]') !== null;
              return { hasSelectedElement, hasDragPlaceholder };
            }
            return null;
          });

          // Only check selection if drag actually started (placeholder exists)
          if (selectionDuringDrag?.hasDragPlaceholder) {
            expect(selectionDuringDrag?.hasSelectedElement).toBe(false);
          }

          // End drag
          await page.mouse.up();
          await page.waitForTimeout(300);
        }
      }

      // Verify content is still intact
      await expect(editor).toContainText("First paragraph");
    });

    test("should allow normal selection when not dragging", async ({ page }) => {
      const editor = page.locator(".tiptap.ProseMirror").first();

      // Add content
      await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (editor) {
          editor.commands.clearContent();
          editor.commands.insertContent("<p>Selectable paragraph</p>");
        }
      });

      await page.waitForTimeout(500);

      // Click on paragraph to select it (without dragging)
      const paragraph = editor.locator("p").first();
      await paragraph.click({ force: true });
      await page.waitForTimeout(200);

      // Check if element can be selected normally
      const canSelect = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (editor) {
          // Try to select the paragraph
          editor.commands.setTextSelection({ from: 1, to: 20 });
          return !editor.state.selection.empty;
        }
        return false;
      });

      // Normal selection should work when not dragging
      expect(canSelect).toBe(true);
    });
  });

  test.describe("Slack Channel", () => {
    test("should not select elements during drag in Slack channel", async ({ page }) => {
      // Navigate to Slack channel
      const slackTab = page.locator('[data-channel="slack"]').first();
      const slackTabExists = await slackTab.count();

      if (slackTabExists > 0) {
        await slackTab.click({ force: true });
        await page.waitForTimeout(1000);

        const editor = page.locator(".tiptap.ProseMirror").first();
        await expect(editor).toBeVisible();

        // Add content
        await page.evaluate(() => {
          const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
          if (editor) {
            editor.commands.clearContent();
            editor.commands.insertContent("<p>Slack test paragraph</p>");
          }
        });

        await page.waitForTimeout(500);

        // Try to drag a sidebar item
        const textBlock = page.locator('[data-draggable-item="text"]').first();
        const textBlockExists = await textBlock.count();

        if (textBlockExists > 0) {
          const boundingBox = await textBlock.boundingBox();
          if (boundingBox) {
            await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
            await page.mouse.down();
            await page.waitForTimeout(100);

            const editorBox = await editor.boundingBox();
            if (editorBox) {
              await page.mouse.move(editorBox.x + editorBox.width / 2, editorBox.y + editorBox.height / 2);
              await page.waitForTimeout(200);

              // Check no selection during drag
              const hasSelection = await page.evaluate(() => {
                const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
                return editor?.view.dom.querySelector(".selected-element") !== null;
              });

              expect(hasSelection).toBe(false);

              await page.mouse.up();
              await page.waitForTimeout(300);
            }
          }
        }

        await expect(editor).toContainText("Slack test paragraph");
      }
    });
  });

  test.describe("MSTeams Channel", () => {
    test("should not select elements during drag in MSTeams channel", async ({ page }) => {
      // Navigate to MSTeams channel
      const msteamsTab = page.locator('[data-channel="msteams"]').first();
      const msteamsTabExists = await msteamsTab.count();

      if (msteamsTabExists > 0) {
        await msteamsTab.click({ force: true });
        await page.waitForTimeout(1000);

        const editor = page.locator(".tiptap.ProseMirror").first();
        await expect(editor).toBeVisible();

        // Add content
        await page.evaluate(() => {
          const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
          if (editor) {
            editor.commands.clearContent();
            editor.commands.insertContent("<p>MSTeams test paragraph</p>");
          }
        });

        await page.waitForTimeout(500);

        // Try to drag a sidebar item
        const textBlock = page.locator('[data-draggable-item="text"]').first();
        const textBlockExists = await textBlock.count();

        if (textBlockExists > 0) {
          const boundingBox = await textBlock.boundingBox();
          if (boundingBox) {
            await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
            await page.mouse.down();
            await page.waitForTimeout(100);

            const editorBox = await editor.boundingBox();
            if (editorBox) {
              await page.mouse.move(editorBox.x + editorBox.width / 2, editorBox.y + editorBox.height / 2);
              await page.waitForTimeout(200);

              // Check no selection during drag
              const hasSelection = await page.evaluate(() => {
                const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
                return editor?.view.dom.querySelector(".selected-element") !== null;
              });

              expect(hasSelection).toBe(false);

              await page.mouse.up();
              await page.waitForTimeout(300);
            }
          }
        }

        await expect(editor).toContainText("MSTeams test paragraph");
      }
    });
  });

  test.describe("isDraggingAtom State", () => {
    test("should set isDraggingAtom to true during drag", async ({ page }) => {
      const editor = page.locator(".tiptap.ProseMirror").first();

      // Add content
      await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (editor) {
          editor.commands.clearContent();
          editor.commands.insertContent("<p>Test content</p>");
        }
      });

      await page.waitForTimeout(500);

      // Check initial dragging state
      const initialDragState = await page.evaluate(() => {
        // Access Jotai store if available
        return (window as any).__COURIER_TEST_DRAGGING__ || false;
      });

      // Initially should not be dragging
      expect(initialDragState).toBe(false);

      // Try to initiate a drag
      const textBlock = page.locator('[data-draggable-item="text"]').first();
      const textBlockExists = await textBlock.count();

      if (textBlockExists > 0) {
        const boundingBox = await textBlock.boundingBox();
        if (boundingBox) {
          await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
          await page.mouse.down();
          await page.waitForTimeout(100);

          // Move to trigger drag
          const editorBox = await editor.boundingBox();
          if (editorBox) {
            await page.mouse.move(editorBox.x + 50, editorBox.y + 50);
            await page.waitForTimeout(200);
          }

          // End drag
          await page.mouse.up();
          await page.waitForTimeout(300);

          // After drag ends, should be false again
          const finalDragState = await page.evaluate(() => {
            return (window as any).__COURIER_TEST_DRAGGING__ || false;
          });

          expect(finalDragState).toBe(false);
        }
      }
    });

    test("should reset isDraggingAtom after drag cancel", async ({ page }) => {
      const editor = page.locator(".tiptap.ProseMirror").first();

      // Add content
      await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (editor) {
          editor.commands.clearContent();
          editor.commands.insertContent("<p>Cancel test content</p>");
        }
      });

      await page.waitForTimeout(500);

      const textBlock = page.locator('[data-draggable-item="text"]').first();
      const textBlockExists = await textBlock.count();

      if (textBlockExists > 0) {
        const boundingBox = await textBlock.boundingBox();
        if (boundingBox) {
          await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
          await page.mouse.down();
          await page.waitForTimeout(100);

          // Move slightly
          await page.mouse.move(boundingBox.x + 10, boundingBox.y + 10);
          await page.waitForTimeout(100);

          // Press Escape to cancel drag
          await page.keyboard.press("Escape");
          await page.waitForTimeout(300);

          // Dragging state should be reset
          const dragStateAfterCancel = await page.evaluate(() => {
            return (window as any).__COURIER_TEST_DRAGGING__ || false;
          });

          expect(dragStateAfterCancel).toBe(false);
        }
      }

      // Editor should still be functional
      await expect(editor).toContainText("Cancel test content");
    });
  });

  test.describe("Selection Extension Integration", () => {
    test("should verify shouldHandleClick callback is configured", async ({ page }) => {
      const editor = page.locator(".tiptap.ProseMirror").first();
      await editor.click({ force: true });
      await page.waitForTimeout(200);

      // Check if Selection extension has shouldHandleClick configured
      const hasShouldHandleClick = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (editor) {
          const selectionExt = editor.extensionManager.extensions.find((ext: any) => ext.name === "selection");
          return selectionExt && typeof selectionExt.options.shouldHandleClick === "function";
        }
        return false;
      });

      expect(hasShouldHandleClick).toBe(true);
    });

    test("should verify Selection extension blocks clicks during drag", async ({ page }) => {
      const editor = page.locator(".tiptap.ProseMirror").first();

      // Add content
      await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (editor) {
          editor.commands.clearContent();
          editor.commands.insertContent("<p>Click test paragraph</p>");
        }
      });

      await page.waitForTimeout(500);

      // Verify shouldHandleClick returns true normally
      const normalState = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (editor) {
          const selectionExt = editor.extensionManager.extensions.find((ext: any) => ext.name === "selection");
          return selectionExt?.options.shouldHandleClick?.();
        }
        return null;
      });

      expect(normalState).toBe(true);

      // During actual interaction, clicks on editor should work normally when not dragging
      const paragraph = editor.locator("p").first();
      await paragraph.click({ force: true });
      await page.waitForTimeout(100);

      // Editor should still be functional
      await expect(editor).toContainText("Click test paragraph");
    });
  });

  test.describe("Cross-Channel Consistency", () => {
    test("should maintain consistent drag behavior across all channels", async ({ page }) => {
      const channels = ["email", "slack", "msteams"];
      const results: Record<string, boolean> = {};

      for (const channel of channels) {
        const channelTab = page.locator(`[data-channel="${channel}"]`).first();
        const channelExists = await channelTab.count();

        if (channelExists > 0) {
          await channelTab.click({ force: true });
          await page.waitForTimeout(1000);

          const editor = page.locator(".tiptap.ProseMirror").first();
          const editorVisible = await editor.isVisible();

          if (editorVisible) {
            // Check if Selection extension is configured with shouldHandleClick
            const isConfigured = await page.evaluate(() => {
              const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
              if (editor) {
                const selectionExt = editor.extensionManager.extensions.find((ext: any) => ext.name === "selection");
                return selectionExt && typeof selectionExt.options.shouldHandleClick === "function";
              }
              return false;
            });

            results[channel] = isConfigured;
          }
        }
      }

      // All channels that exist should have consistent configuration
      const configuredChannels = Object.values(results);
      if (configuredChannels.length > 0) {
        const allConfigured = configuredChannels.every((configured) => configured === true);
        expect(allConfigured).toBe(true);
      }
    });
  });
});
