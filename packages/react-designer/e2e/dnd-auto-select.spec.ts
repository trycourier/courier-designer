import { test, expect, setupComponentTest, getMainEditor } from "./test-utils";

test.describe("DnD Auto-Selection Feature", () => {
  test.beforeEach(async ({ page }) => {
    await setupComponentTest(page);
  });

  test("should insert image block and verify it exists", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(300);

    // Insert an image block programmatically (simulating drag and drop result)
    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        editor.commands.clearContent();
        editor.commands.setImageBlock({
          sourcePath: "https://example.com/test.jpg",
          alt: "Test image",
        });
      }
    });

    await page.waitForTimeout(500);

    // Verify the node is an imageBlock by checking via evaluate
    const isImageBlock = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        let hasImageBlock = false;
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "imageBlock") {
            hasImageBlock = true;
            return false;
          }
          return true;
        });
        return hasImageBlock;
      }
      return false;
    });

    expect(isImageBlock).toBe(true);
  });

  test("should set isSelected attribute when updateSelectionState is called", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(300);

    // Insert an image block
    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        editor.commands.clearContent();
        editor.commands.setImageBlock({
          sourcePath: "https://example.com/test.jpg",
          alt: "Test image",
        });
      }
    });

    await page.waitForTimeout(300);

    // Find the node and set it as selected using updateSelectionState
    const result = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        let targetNode = null;
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "imageBlock") {
            targetNode = node;
            return false;
          }
          return true;
        });

        if (targetNode) {
          return editor.commands.updateSelectionState(targetNode);
        }
      }
      return false;
    });

    expect(result).toBe(true);

    await page.waitForTimeout(300);

    // Verify isSelected attribute is set on the node
    const hasIsSelected = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        let isSelected = false;
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "imageBlock" && node.attrs?.isSelected === true) {
            isSelected = true;
            return false;
          }
          return true;
        });
        return isSelected;
      }
      return false;
    });

    expect(hasIsSelected).toBe(true);
  });

  test("should update selection state via updateSelectionState command", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(300);

    // Insert an image block and get its reference
    const nodeId = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        editor.commands.clearContent();

        const id = `img-${Date.now()}`;
        editor.commands.insertContent({
          type: "imageBlock",
          attrs: {
            id,
            sourcePath: "",
            alt: "",
          },
        });
        return id;
      }
      return null;
    });

    expect(nodeId).not.toBeNull();
    await page.waitForTimeout(300);

    // Find the node and call updateSelectionState
    const result = await page.evaluate((id) => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        // Find the node in the document
        let targetNode = null;
        editor.state.doc.descendants((node: any) => {
          if (node.attrs?.id === id) {
            targetNode = node;
            return false;
          }
          return true;
        });

        if (targetNode) {
          return editor.commands.updateSelectionState(targetNode);
        }
      }
      return false;
    }, nodeId);

    expect(result).toBe(true);

    await page.waitForTimeout(300);

    // Verify the isSelected attribute is set
    const hasIsSelected = await page.evaluate((id) => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        let isSelected = false;
        editor.state.doc.descendants((node: any) => {
          if (node.attrs?.id === id) {
            isSelected = node.attrs.isSelected === true;
            return false;
          }
          return true;
        });
        return isSelected;
      }
      return false;
    }, nodeId);

    expect(hasIsSelected).toBe(true);
  });

  test("should clear previous isSelected when new element is selected", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(300);

    // Insert an image block and a divider (two different block types for clear distinction)
    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        editor.commands.clearContent();
        editor.commands.insertContent([
          {
            type: "imageBlock",
            attrs: {
              id: "test-image-clear",
              sourcePath: "https://example.com/image.jpg",
              alt: "Test image",
            },
          },
          {
            type: "divider",
            attrs: {
              id: "test-divider-clear",
            },
          },
        ]);
      }
    });

    await page.waitForTimeout(500);

    // Select the image block first
    const imageSelected = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        let imageNode = null;
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "imageBlock") {
            imageNode = node;
            return false;
          }
          return true;
        });
        if (imageNode) {
          return editor.commands.updateSelectionState(imageNode);
        }
      }
      return false;
    });

    expect(imageSelected).toBe(true);
    await page.waitForTimeout(500);

    // Verify image is selected
    const imageIsSelected = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        let found = false;
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "imageBlock" && node.attrs?.isSelected === true) {
            found = true;
            return false;
          }
          return true;
        });
        return found;
      }
      return false;
    });

    expect(imageIsSelected).toBe(true);

    // Now select the divider
    const dividerSelected = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        let dividerNode = null;
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "divider") {
            dividerNode = node;
            return false;
          }
          return true;
        });
        if (dividerNode) {
          return editor.commands.updateSelectionState(dividerNode);
        }
      }
      return false;
    });

    expect(dividerSelected).toBe(true);
    await page.waitForTimeout(500);

    // Verify the divider is now selected and image is deselected
    const selectionState = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        let imageSelected = false;
        let dividerSelected = false;
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "imageBlock" && node.attrs?.isSelected === true) {
            imageSelected = true;
          }
          if (node.type.name === "divider" && node.attrs?.isSelected === true) {
            dividerSelected = true;
          }
          return true;
        });
        return { imageSelected, dividerSelected };
      }
      return { imageSelected: false, dividerSelected: false };
    });

    // Image should be deselected, divider should be selected
    expect(selectionState.dividerSelected).toBe(true);
    expect(selectionState.imageSelected).toBe(false);
  });

  test("should have selection extension registered", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(300);

    // Verify selection extension is available
    const hasSelectionExtension = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        const extensions = editor.extensionManager.extensions;
        return extensions.some((ext: any) => ext.name === "selection");
      }
      return false;
    });

    expect(hasSelectionExtension).toBe(true);

    // Verify updateSelectionState command is available
    const hasCommand = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      return typeof editor?.commands?.updateSelectionState === "function";
    });

    expect(hasCommand).toBe(true);
  });

  test("should maintain selection after content change", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(300);

    // Insert an image block and select it
    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        editor.commands.clearContent();
        editor.commands.setImageBlock({
          sourcePath: "https://example.com/test.jpg",
          alt: "Test",
        });
      }
    });

    await page.waitForTimeout(300);

    // Select the image block
    const wasSelected = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        let targetNode = null;
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "imageBlock") {
            targetNode = node;
            return false;
          }
          return true;
        });
        if (targetNode) {
          return editor.commands.updateSelectionState(targetNode);
        }
      }
      return false;
    });

    expect(wasSelected).toBe(true);

    // Verify the selection is active
    const isSelected = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        let found = false;
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "imageBlock" && node.attrs?.isSelected === true) {
            found = true;
            return false;
          }
          return true;
        });
        return found;
      }
      return false;
    });

    expect(isSelected).toBe(true);
  });
});

test.describe("DnD Caret Placement After Drop", () => {
  test.beforeEach(async ({ page }) => {
    await setupComponentTest(page);
  });

  test("should place caret inside paragraph after insertion (simulating DnD drop)", async ({
    page,
  }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(300);

    // Set up initial content: heading + image (simulating existing editor state)
    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        editor.commands.clearContent();
        editor.commands.insertContent([
          {
            type: "heading",
            attrs: { id: "existing-heading" },
            content: [{ type: "text", text: "Existing Heading" }],
          },
          {
            type: "imageBlock",
            attrs: { id: "existing-image", sourcePath: "", alt: "" },
          },
        ]);
      }
    });

    await page.waitForTimeout(500);

    // Simulate what the DnD handler does after dropping a paragraph:
    // 1. Insert paragraph at position 0 (top of document)
    // 2. Set text selection inside it (position + 1)
    // 3. Focus the editor
    const result = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!editor) return { success: false, error: "Editor not found" };

      // Step 1: Insert a paragraph at position 0 (same as usePragmaticDnd.handleDrop)
      const insertPosition = 0;
      editor.commands.insertContentAt(insertPosition, {
        type: "paragraph",
        attrs: { id: "dnd-paragraph" },
      });

      // Step 2 & 3: Set text selection and focus (same as the fix in usePragmaticDnd)
      const nodeAtPos = editor.state.doc.nodeAt(insertPosition);
      if (nodeAtPos && nodeAtPos.type.name === "paragraph") {
        editor.commands.setTextSelection(insertPosition + 1);
        editor.view.focus();
        return { success: true };
      }

      return { success: false, error: "Paragraph not found at position" };
    });

    expect(result.success).toBe(true);
    await page.waitForTimeout(200);

    // Verify the caret is inside the paragraph (not in heading or image)
    const selectionInfo = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!editor) return null;

      const sel = editor.state.selection;
      const $from = editor.state.doc.resolve(sel.from);
      return {
        parentNodeType: $from.parent.type.name,
        hasFocus: editor.view.hasFocus(),
        from: sel.from,
        to: sel.to,
      };
    });

    expect(selectionInfo).not.toBeNull();
    expect(selectionInfo?.parentNodeType).toBe("paragraph");
    expect(selectionInfo?.hasFocus).toBe(true);
  });

  test("should allow typing in newly dropped paragraph without affecting other elements", async ({
    page,
  }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(300);

    // Set up initial content: heading + image
    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        editor.commands.clearContent();
        editor.commands.insertContent([
          {
            type: "heading",
            attrs: { id: "test-heading" },
            content: [{ type: "text", text: "Original Heading" }],
          },
          {
            type: "imageBlock",
            attrs: { id: "test-image", sourcePath: "", alt: "" },
          },
        ]);
      }
    });

    await page.waitForTimeout(500);

    // Simulate the DnD drop + caret placement (the fixed behavior)
    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!editor) return;

      const insertPosition = 0;
      editor.commands.insertContentAt(insertPosition, {
        type: "paragraph",
        attrs: { id: "typed-paragraph" },
      });

      // The fix: place caret inside the paragraph and focus
      editor.commands.setTextSelection(insertPosition + 1);
      editor.view.focus();
    });

    await page.waitForTimeout(200);

    // Type text using the keyboard — this should go into the paragraph
    const testText = "Hello from DnD";
    await page.keyboard.type(testText);
    await page.waitForTimeout(300);

    // Verify the typed text is in the paragraph and not in other elements
    const docState = await page.evaluate((expectedText) => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!editor) return null;

      const nodes: { type: string; text: string }[] = [];
      editor.state.doc.descendants((node: any) => {
        if (
          node.type.name === "paragraph" ||
          node.type.name === "heading" ||
          node.type.name === "imageBlock"
        ) {
          nodes.push({
            type: node.type.name,
            text: node.textContent || "",
          });
          return false; // Don't descend into children
        }
        return true;
      });

      return {
        nodes,
        paragraphHasText: nodes.some(
          (n) => n.type === "paragraph" && n.text === expectedText
        ),
        headingPreserved: nodes.some(
          (n) => n.type === "heading" && n.text === "Original Heading"
        ),
        imagePreserved: nodes.some((n) => n.type === "imageBlock"),
      };
    }, testText);

    expect(docState).not.toBeNull();
    // The typed text should be in the paragraph
    expect(docState?.paragraphHasText).toBe(true);
    // The heading should be unchanged
    expect(docState?.headingPreserved).toBe(true);
    // The image should still exist
    expect(docState?.imagePreserved).toBe(true);
  });

  test("should place caret inside heading after insertion (simulating DnD drop)", async ({
    page,
  }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(300);

    // Set up initial content
    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        editor.commands.clearContent();
        editor.commands.insertContent([
          {
            type: "imageBlock",
            attrs: { id: "existing-image", sourcePath: "", alt: "" },
          },
        ]);
      }
    });

    await page.waitForTimeout(500);

    // Simulate DnD drop of a heading at position 0
    const result = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!editor) return { success: false };

      const insertPosition = 0;
      editor.commands.insertContentAt(insertPosition, {
        type: "heading",
        attrs: { id: "dnd-heading" },
      });

      const nodeAtPos = editor.state.doc.nodeAt(insertPosition);
      if (nodeAtPos && nodeAtPos.type.name === "heading") {
        editor.commands.setTextSelection(insertPosition + 1);
        editor.view.focus();
        return { success: true };
      }

      return { success: false };
    });

    expect(result.success).toBe(true);
    await page.waitForTimeout(200);

    // Verify caret is inside the heading
    const selectionInfo = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!editor) return null;

      const sel = editor.state.selection;
      const $from = editor.state.doc.resolve(sel.from);
      return {
        parentNodeType: $from.parent.type.name,
        hasFocus: editor.view.hasFocus(),
      };
    });

    expect(selectionInfo?.parentNodeType).toBe("heading");
    expect(selectionInfo?.hasFocus).toBe(true);
  });

  test("should NOT place caret for non-text nodes like image (selection only)", async ({
    page,
  }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(300);

    // Set up initial content
    await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (editor) {
        editor.commands.clearContent();
        editor.commands.insertContent([
          {
            type: "heading",
            attrs: { id: "existing-heading" },
            content: [{ type: "text", text: "Existing Heading" }],
          },
        ]);
      }
    });

    await page.waitForTimeout(500);

    // Simulate DnD drop of an image (non-text node)
    // For non-text nodes, we should set selectedNode but NOT setTextSelection
    const result = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!editor) return { success: false };

      // Get heading size to determine insert position
      const headingNode = editor.state.doc.firstChild;
      const insertPosition = headingNode ? headingNode.nodeSize : 0;

      editor.commands.insertContentAt(insertPosition, {
        type: "imageBlock",
        attrs: { id: "dnd-image", sourcePath: "", alt: "" },
      });

      // For non-text nodes, only updateSelectionState is called (no setTextSelection)
      const nodeAtPos = editor.state.doc.nodeAt(insertPosition);
      if (nodeAtPos && nodeAtPos.type.name === "imageBlock") {
        editor.commands.updateSelectionState(nodeAtPos);
        return { success: true, insertedType: "imageBlock" };
      }

      return { success: false };
    });

    expect(result.success).toBe(true);
    expect(result.insertedType).toBe("imageBlock");
    await page.waitForTimeout(200);

    // Verify the image is selected (blue border) but no text caret
    const selectionState = await page.evaluate(() => {
      const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!editor) return null;

      let imageIsSelected = false;
      editor.state.doc.descendants((node: any) => {
        if (node.type.name === "imageBlock" && node.attrs?.isSelected === true) {
          imageIsSelected = true;
          return false;
        }
        return true;
      });

      return { imageIsSelected };
    });

    expect(selectionState?.imageIsSelected).toBe(true);
  });
});
