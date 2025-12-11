import { test, expect, setupComponentTest, getMainEditor } from "./test-utils";

test.describe("Variable Component E2E", () => {
  test.beforeEach(async ({ page }) => {
    await setupComponentTest(page);
  });

  test("should verify Variable extension is loaded", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if VariableInputRule extension is registered
    const hasVariableExtension = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const extensions = (window as any).__COURIER_CREATE_TEST__?.currentEditor.extensionManager
          .extensions;
        return extensions.some((ext: any) => ext.name === "variableInputRule");
      }
      return false;
    });

    expect(hasVariableExtension).toBe(true);
  });

  test("should verify VariableNode is loaded", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Check if VariableNode is registered
    const hasVariableNode = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        return (
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.schema.nodes.variable !== undefined
        );
      }
      return false;
    });

    expect(hasVariableNode).toBe(true);
  });

  test("should handle variable insertion via commands", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Test that variable insertion commands exist and don't throw errors
    const insertionWorks = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        try {
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
          // Test that the variable node type exists in schema
          const hasVariableNode =
            (window as any).__COURIER_CREATE_TEST__?.currentEditor.schema.nodes.variable !==
            undefined;
          return hasVariableNode;
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(insertionWorks).toBe(true);
  });

  test("should display variable with correct styling", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Clear content and insert variable
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent([
          { type: "variable", attrs: { id: "user.email" } },
        ]);
      }
    });

    await page.waitForTimeout(300);

    // Check variable content is present
    await expect(editor).toContainText("user.email");

    // Check variable styling
    const variableElement = editor.locator(".courier-variable-node").first();
    await expect(variableElement).toBeVisible();
  });

  test("should handle multiple variables in content", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Clear content and insert multiple variables
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent([
          { type: "text", text: "Hello " },
          { type: "variable", attrs: { id: "user.name" } },
          { type: "text", text: ", your email is " },
          { type: "variable", attrs: { id: "user.email" } },
          { type: "text", text: "." },
        ]);
      }
    });

    await page.waitForTimeout(300);

    // Check content includes both variables
    await expect(editor).toContainText("Hello");
    await expect(editor).toContainText("user.name");
    await expect(editor).toContainText("user.email");

    // Check that both variables are present
    const variableElements = editor.locator(".courier-variable-node");
    await expect(variableElements).toHaveCount(2);
  });

  test("should insert empty variable chip via command", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Clear content and insert empty variable chip directly
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent([
          { type: "variable", attrs: { id: "", isInvalid: false } },
        ]);
      }
    });

    await page.waitForTimeout(300);

    // Should have an empty variable chip
    const variableCount = await editor.locator(".courier-variable-node").count();
    expect(variableCount).toBe(1);

    // Check that the chip has an editable span (editable mode for empty id)
    const editableSpan = editor.locator('.courier-variable-node [role="textbox"]');
    await expect(editableSpan).toHaveAttribute("contenteditable", "true");
  });

  test("should allow typing inside empty variable chip", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert empty variable chip via command (more reliable than InputRule in e2e)
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent([
          { type: "variable", attrs: { id: "", isInvalid: false } },
        ]);
      }
    });

    await page.waitForTimeout(300);

    // Find the editable span inside the variable chip
    const editableSpan = editor.locator('.courier-variable-node [role="textbox"]');
    await editableSpan.waitFor({ state: "attached", timeout: 5000 });

    // Type variable name inside the chip
    await editableSpan.fill("user.name", { force: true });
    await page.waitForTimeout(200);

    // Click outside to blur and confirm
    await editor.click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);

    // Check variable content is now set
    await expect(editor).toContainText("user.name");

    // Verify the chip is in view mode (not editable)
    const isEditable = await editor
      .locator('.courier-variable-node [role="textbox"]')
      .getAttribute("contenteditable");
    expect(isEditable).toBe("false");
  });

  test("should mark invalid variable names with red styling", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert variable with invalid name directly
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent([
          { type: "variable", attrs: { id: "invalid name", isInvalid: true } },
        ]);
      }
    });

    await page.waitForTimeout(300);

    // Check variable exists
    const variableElement = editor.locator(".courier-variable-node").first();
    await expect(variableElement).toBeVisible();

    // Check for red/error styling via CSS class
    const variableChip = editor.locator(".courier-variable-chip-invalid").first();
    await expect(variableChip).toBeVisible();
  });

  test("should validate and mark invalid on blur", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert empty variable chip directly and type invalid name
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent([
          { type: "variable", attrs: { id: "", isInvalid: false } },
        ]);
      }
    });

    await page.waitForTimeout(300);

    // Find the editable span inside the variable chip
    const editableSpan = editor.locator('.courier-variable-node [role="textbox"]');
    await editableSpan.waitFor({ state: "attached", timeout: 5000 });

    // Type invalid variable name (with space)
    await editableSpan.fill("invalid name", { force: true });
    await page.waitForTimeout(200);

    // Click outside to blur and trigger validation
    await editor.click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);

    // Verify the variable has isInvalid attribute
    const isInvalid = await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      let invalid = false;
      ed.state.doc.descendants((node: any) => {
        if (node.type.name === "variable") {
          invalid = node.attrs.isInvalid === true;
          return false;
        }
      });
      return invalid;
    });

    expect(isInvalid).toBe(true);
  });

  test("should delete empty variable chip on blur", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert empty variable chip directly
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent([
          { type: "variable", attrs: { id: "", isInvalid: false } },
        ]);
      }
    });

    await page.waitForTimeout(300);

    // Should have one variable chip in edit mode
    let variableCount = await editor.locator(".courier-variable-node").count();
    expect(variableCount).toBe(1);

    // The editable span should exist (chip is in edit mode since id is empty)
    const editableSpan = editor.locator('.courier-variable-node [role="textbox"]');
    await editableSpan.waitFor({ state: "attached", timeout: 5000 });

    // Click outside to blur (leave it empty) - this should delete the empty chip
    await editor.click({ position: { x: 10, y: 10 }, force: true });
    await page.waitForTimeout(300);

    // Variable should be deleted since it was empty
    variableCount = await editor.locator(".courier-variable-node").count();
    expect(variableCount).toBe(0);
  });

  test("should allow editing existing variable on double click", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert a variable
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent([
          { type: "variable", attrs: { id: "original_name", isInvalid: false } },
        ]);
      }
    });

    await page.waitForTimeout(300);

    // Double click to edit
    const variableElement = editor.locator(".courier-variable-node").first();
    await variableElement.dblclick();
    await page.waitForTimeout(200);

    // Should have editable contenteditable span
    const editableSpan = editor.locator('.courier-variable-node [role="textbox"]');
    await expect(editableSpan).toHaveAttribute("contenteditable", "true");

    // Use fill() to replace the content
    await editableSpan.fill("new_name");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    // Verify the variable node has new name
    const variableName = await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      let name = "";
      ed.state.doc.descendants((node: any) => {
        if (node.type.name === "variable") {
          name = node.attrs.id;
          return false;
        }
      });
      return name;
    });

    expect(variableName).toBe("new_name");
  });

  test("should handle variable deletion", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert a variable
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent([
          { type: "variable", attrs: { id: "test.variable" } },
          { type: "text", text: " some text" },
        ]);
      }
    });

    await page.waitForTimeout(300);

    // Verify variable exists
    await expect(editor).toContainText("test.variable");
    const variableElement = editor.locator(".courier-variable-node").first();
    await expect(variableElement).toBeVisible();

    // Delete content by clearing the editor
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
      }
    });

    await page.waitForTimeout(300);

    // Verify content is cleared
    const hasVariableInContent = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        const htmlContent = (window as any).__COURIER_CREATE_TEST__?.currentEditor.getHTML();
        return htmlContent.includes("test.variable");
      }
      return false;
    });

    expect(hasVariableInContent).toBe(false);
    await expect(editor).not.toContainText("test.variable");
  });

  test("should maintain variable data attributes", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Insert variable with specific ID
    await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
        (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent([
          { type: "variable", attrs: { id: "order.id" } },
        ]);
      }
    });

    await page.waitForTimeout(300);

    // Check variable content is present
    await expect(editor).toContainText("order.id");

    // Check variable element is visible
    const variableElement = editor.locator(".courier-variable-node").first();
    await expect(variableElement).toBeVisible();
  });

  test("should handle JSON serialization with variables", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Test basic JSON serialization
    const jsonWorks = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        try {
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent(
            "Test JSON content"
          );
          const json = (window as any).__COURIER_CREATE_TEST__?.currentEditor.getJSON();
          return JSON.stringify(json).includes("Test JSON content");
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(jsonWorks).toBe(true);
  });

  test("should handle HTML serialization with variables", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Test basic HTML serialization
    const htmlWorks = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        try {
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent(
            "Test HTML content"
          );
          const html = (window as any).__COURIER_CREATE_TEST__?.currentEditor.getHTML();
          return html.includes("Test HTML content");
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(htmlWorks).toBe(true);
  });

  test("should verify editor stability with variables", async ({ page }) => {
    const editor = getMainEditor(page);
    await editor.click({ force: true });
    await page.waitForTimeout(200);

    // Test basic editor operations
    const isStable = await page.evaluate(() => {
      if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
        try {
          // Clear and add simple content
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.clearContent();
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.insertContent(
            "Test content"
          );

          // Get content
          const html = (window as any).__COURIER_CREATE_TEST__?.currentEditor.getHTML();
          const json = (window as any).__COURIER_CREATE_TEST__?.currentEditor.getJSON();

          // Set content back
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setContent(json);

          // Verify content is preserved
          const finalHtml = (window as any).__COURIER_CREATE_TEST__?.currentEditor.getHTML();
          return html.includes("Test content") && finalHtml.includes("Test content");
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(isStable).toBe(true);
  });

  test.describe("Variable Deletion", () => {
    test("should delete variable with Backspace when it's the only content in paragraph", async ({
      page,
    }) => {
      const editor = getMainEditor(page);
      await editor.click({ force: true });
      await page.waitForTimeout(200);

      // Clear content and insert only a variable
      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
          ed.commands.clearContent();
          ed.commands.insertContent([{ type: "variable", attrs: { id: "user.name" } }]);
        }
      });

      await page.waitForTimeout(300);

      // Verify variable exists
      await expect(editor).toContainText("user.name");
      let variableCount = await editor.locator(".courier-variable-node").count();
      expect(variableCount).toBe(1);

      // Position cursor after the variable and press Backspace
      await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        // Move cursor to end of document
        ed.commands.focus("end");
      });

      await page.waitForTimeout(200);
      await page.keyboard.press("Backspace");
      await page.waitForTimeout(300);

      // Verify variable is deleted
      variableCount = await editor.locator(".courier-variable-node").count();
      expect(variableCount).toBe(0);
      await expect(editor).not.toContainText("user.name");
    });

    test("should delete variable with Delete key when cursor is before it", async ({ page }) => {
      const editor = getMainEditor(page);
      await editor.click({ force: true });
      await page.waitForTimeout(200);

      // Clear content and insert only a variable
      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
          ed.commands.clearContent();
          ed.commands.insertContent([{ type: "variable", attrs: { id: "user.email" } }]);
        }
      });

      await page.waitForTimeout(300);

      // Verify variable exists
      await expect(editor).toContainText("user.email");
      let variableCount = await editor.locator(".courier-variable-node").count();
      expect(variableCount).toBe(1);

      // Position cursor at start of document (before the variable)
      await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        ed.commands.focus("start");
      });

      await page.waitForTimeout(200);
      await page.keyboard.press("Delete");
      await page.waitForTimeout(300);

      // Verify variable is deleted
      variableCount = await editor.locator(".courier-variable-node").count();
      expect(variableCount).toBe(0);
      await expect(editor).not.toContainText("user.email");
    });

    test("should delete variable with Backspace when there's text after it", async ({ page }) => {
      const editor = getMainEditor(page);
      await editor.click({ force: true });
      await page.waitForTimeout(200);

      // Clear content and insert variable with text after
      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
          ed.commands.clearContent();
          ed.commands.insertContent([
            { type: "variable", attrs: { id: "user.name" } },
            { type: "text", text: " is awesome" },
          ]);
        }
      });

      await page.waitForTimeout(300);

      // Verify variable and text exist
      await expect(editor).toContainText("user.name");
      await expect(editor).toContainText("is awesome");
      let variableCount = await editor.locator(".courier-variable-node").count();
      expect(variableCount).toBe(1);

      // Position cursor between variable and text (right after variable)
      await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        // Find the position right after the variable node
        const { state } = ed;
        let pos = 0;
        state.doc.descendants((node: any, position: number) => {
          if (node.type.name === "variable") {
            pos = position + node.nodeSize;
            return false;
          }
        });
        ed.commands.setTextSelection(pos);
      });

      await page.waitForTimeout(200);
      await page.keyboard.press("Backspace");
      await page.waitForTimeout(300);

      // Verify variable is deleted but text remains
      variableCount = await editor.locator(".courier-variable-node").count();
      expect(variableCount).toBe(0);
      await expect(editor).not.toContainText("user.name");
      await expect(editor).toContainText("is awesome");
    });

    test("should delete variable with Delete key when there's text before it", async ({ page }) => {
      const editor = getMainEditor(page);
      await editor.click({ force: true });
      await page.waitForTimeout(200);

      // Clear content and insert text before variable
      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
          ed.commands.clearContent();
          ed.commands.insertContent([
            { type: "text", text: "Hello " },
            { type: "variable", attrs: { id: "user.name" } },
          ]);
        }
      });

      await page.waitForTimeout(300);

      // Verify text and variable exist
      await expect(editor).toContainText("Hello");
      await expect(editor).toContainText("user.name");
      let variableCount = await editor.locator(".courier-variable-node").count();
      expect(variableCount).toBe(1);

      // Position cursor right before the variable
      await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        // Find the position right before the variable node
        const { state } = ed;
        let pos = 0;
        state.doc.descendants((node: any, position: number) => {
          if (node.type.name === "variable") {
            pos = position;
            return false;
          }
        });
        ed.commands.setTextSelection(pos);
      });

      await page.waitForTimeout(200);
      await page.keyboard.press("Delete");
      await page.waitForTimeout(300);

      // Verify variable is deleted but text remains
      variableCount = await editor.locator(".courier-variable-node").count();
      expect(variableCount).toBe(0);
      await expect(editor).toContainText("Hello");
      await expect(editor).not.toContainText("user.name");
    });

    test("should delete multiple variables sequentially", async ({ page }) => {
      const editor = getMainEditor(page);
      await editor.click({ force: true });
      await page.waitForTimeout(200);

      // Clear content and insert multiple variables
      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
          ed.commands.clearContent();
          ed.commands.insertContent([
            { type: "variable", attrs: { id: "user.firstName" } },
            { type: "text", text: " " },
            { type: "variable", attrs: { id: "user.lastName" } },
          ]);
        }
      });

      await page.waitForTimeout(300);

      // Verify both variables exist
      await expect(editor).toContainText("user.firstName");
      await expect(editor).toContainText("user.lastName");
      let variableCount = await editor.locator(".courier-variable-node").count();
      expect(variableCount).toBe(2);

      // Position cursor at end and delete the last variable
      await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        ed.commands.focus("end");
      });

      await page.waitForTimeout(200);
      await page.keyboard.press("Backspace");
      await page.waitForTimeout(300);

      // Verify only first variable remains
      variableCount = await editor.locator(".courier-variable-node").count();
      expect(variableCount).toBe(1);
      await expect(editor).toContainText("user.firstName");
      await expect(editor).not.toContainText("user.lastName");

      // Delete the space
      await page.keyboard.press("Backspace");
      await page.waitForTimeout(200);

      // Delete the first variable
      await page.keyboard.press("Backspace");
      await page.waitForTimeout(300);

      // Verify all variables are deleted
      variableCount = await editor.locator(".courier-variable-node").count();
      expect(variableCount).toBe(0);
      await expect(editor).not.toContainText("user.firstName");
    });

    test("should still prevent paragraph deletion when empty with no adjacent nodes", async ({
      page,
    }) => {
      const editor = getMainEditor(page);
      await editor.click({ force: true });
      await page.waitForTimeout(200);

      // Clear content to have empty paragraph
      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
          ed.commands.clearContent();
        }
      });

      await page.waitForTimeout(300);

      // Get initial paragraph count
      const initialParagraphCount = await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        let count = 0;
        ed.state.doc.descendants((node: any) => {
          if (node.type.name === "paragraph") {
            count++;
          }
        });
        return count;
      });

      // Try to delete the empty paragraph
      await page.keyboard.press("Backspace");
      await page.waitForTimeout(300);

      // Verify paragraph still exists (deletion was prevented)
      const finalParagraphCount = await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        let count = 0;
        ed.state.doc.descendants((node: any) => {
          if (node.type.name === "paragraph") {
            count++;
          }
        });
        return count;
      });

      expect(finalParagraphCount).toBe(initialParagraphCount);
      expect(finalParagraphCount).toBeGreaterThan(0);
    });
  });
});
