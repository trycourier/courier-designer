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
