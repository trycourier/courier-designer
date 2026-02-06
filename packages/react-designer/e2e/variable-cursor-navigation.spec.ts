import { test, expect, setupComponentTest, getMainEditor } from "./test-utils";

test.describe("Variable Cursor Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setupComponentTest(page);
  });

  test.describe("Cursor navigation around variables after line breaks", () => {
    test("should allow cursor to be positioned before a variable that follows a hardBreak", async ({
      page,
    }) => {
      const editor = getMainEditor(page);
      await editor.click({ force: true });
      await page.waitForTimeout(200);

      // Insert content: variable + text + hardBreak + variable
      // This creates: {{var1}} hello\n{{var2}}
      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
          ed.commands.clearContent();
          ed.commands.insertContent([
            { type: "variable", attrs: { id: "var1", isInvalid: false } },
            { type: "text", text: " hello" },
            { type: "hardBreak" },
            { type: "variable", attrs: { id: "var2", isInvalid: false } },
          ]);
        }
      });

      await page.waitForTimeout(300);

      // Verify both variables are present
      await expect(editor).toContainText("var1");
      await expect(editor).toContainText("var2");
      const variableCount = await editor.locator(".courier-variable-node").count();
      expect(variableCount).toBe(2);

      // Position cursor at end (after var2)
      await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        ed.commands.focus("end");
      });
      await page.waitForTimeout(200);

      // Press ArrowLeft - cursor should move to before var2 (position between hardBreak and var2)
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(200);

      // Type a character - it should appear BEFORE var2, not replace it
      await page.keyboard.type("X");
      await page.waitForTimeout(300);

      // Verify the X was inserted before var2, and var2 still exists
      const variableCountAfter = await editor.locator(".courier-variable-node").count();
      expect(variableCountAfter).toBe(2);
      await expect(editor).toContainText("var2");

      // Verify the structure: the X should be between hardBreak and var2
      const hasCorrectStructure = await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        const json = ed.getJSON();
        const content = JSON.stringify(json);
        // The content should have both var1 and var2, plus the X
        return content.includes('"id":"var1"') && 
               content.includes('"id":"var2"') && 
               content.includes('"text":"X"');
      });
      expect(hasCorrectStructure).toBe(true);
    });

    test("should navigate correctly with ArrowLeft from after variable to before variable", async ({
      page,
    }) => {
      const editor = getMainEditor(page);
      await editor.click({ force: true });
      await page.waitForTimeout(200);

      // Insert content with variable after hardBreak
      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
          ed.commands.clearContent();
          ed.commands.insertContent([
            { type: "text", text: "line1" },
            { type: "hardBreak" },
            { type: "variable", attrs: { id: "myvar", isInvalid: false } },
          ]);
        }
      });

      await page.waitForTimeout(300);

      // Position cursor at end
      await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        ed.commands.focus("end");
      });

      // Get initial cursor position
      const initialPos = await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        return ed.state.selection.from;
      });

      // Press ArrowLeft
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(100);

      // Get cursor position after first ArrowLeft
      const afterFirstArrow = await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        const { $from } = ed.state.selection;
        return {
          pos: ed.state.selection.from,
          nodeBefore: $from.nodeBefore?.type.name ?? null,
          nodeAfter: $from.nodeAfter?.type.name ?? null,
        };
      });

      // Cursor should now be between hardBreak and variable
      expect(afterFirstArrow.nodeBefore).toBe("hardBreak");
      expect(afterFirstArrow.nodeAfter).toBe("variable");

      // Press ArrowLeft again
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(100);

      // Get cursor position after second ArrowLeft
      const afterSecondArrow = await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        const { $from } = ed.state.selection;
        return {
          pos: ed.state.selection.from,
          nodeBefore: $from.nodeBefore?.type.name ?? null,
          nodeAfter: $from.nodeAfter?.type.name ?? null,
        };
      });

      // Cursor should now be before the hardBreak (end of line1)
      expect(afterSecondArrow.nodeAfter).toBe("hardBreak");
    });

    test("should navigate correctly with ArrowRight from before hardBreak to after hardBreak", async ({
      page,
    }) => {
      const editor = getMainEditor(page);
      await editor.click({ force: true });
      await page.waitForTimeout(200);

      // Insert content with variable after hardBreak
      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
          ed.commands.clearContent();
          ed.commands.insertContent([
            { type: "variable", attrs: { id: "var1", isInvalid: false } },
            { type: "hardBreak" },
            { type: "variable", attrs: { id: "var2", isInvalid: false } },
          ]);
        }
      });

      await page.waitForTimeout(300);

      // Position cursor at start
      await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        ed.commands.focus("start");
      });

      // Navigate right past var1
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(100);

      // Now cursor is after var1, before hardBreak
      const afterVar1 = await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        const { $from } = ed.state.selection;
        return {
          pos: ed.state.selection.from,
          nodeBefore: $from.nodeBefore?.type.name ?? null,
          nodeAfter: $from.nodeAfter?.type.name ?? null,
        };
      });
      expect(afterVar1.nodeBefore).toBe("variable");
      expect(afterVar1.nodeAfter).toBe("hardBreak");

      // Press ArrowRight to move past hardBreak
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(100);

      // Cursor should now be between hardBreak and var2
      const betweenHardBreakAndVar2 = await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        const { $from } = ed.state.selection;
        return {
          pos: ed.state.selection.from,
          nodeBefore: $from.nodeBefore?.type.name ?? null,
          nodeAfter: $from.nodeAfter?.type.name ?? null,
        };
      });
      expect(betweenHardBreakAndVar2.nodeBefore).toBe("hardBreak");
      expect(betweenHardBreakAndVar2.nodeAfter).toBe("variable");
    });

    test("should show visual cursor indicator when positioned between hardBreak and variable", async ({
      page,
    }) => {
      const editor = getMainEditor(page);
      await editor.click({ force: true });
      await page.waitForTimeout(200);

      // Insert content with variable after hardBreak
      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
          ed.commands.clearContent();
          ed.commands.insertContent([
            { type: "text", text: "hello" },
            { type: "hardBreak" },
            { type: "variable", attrs: { id: "myvar", isInvalid: false } },
          ]);
        }
      });

      await page.waitForTimeout(300);

      // Position cursor at end and press ArrowLeft to move before variable
      await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        ed.commands.focus("end");
      });
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(200);

      // Check that the cursor indicator decoration is visible
      const cursorIndicator = editor.locator(".variable-cursor-indicator");
      await expect(cursorIndicator).toBeVisible();
    });

    test("should not replace variable when typing at position before it", async ({ page }) => {
      const editor = getMainEditor(page);
      await editor.click({ force: true });
      await page.waitForTimeout(200);

      // Insert a single variable after hardBreak
      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
          ed.commands.clearContent();
          ed.commands.insertContent([
            { type: "hardBreak" },
            { type: "variable", attrs: { id: "testvar", isInvalid: false } },
          ]);
        }
      });

      await page.waitForTimeout(300);

      // Verify variable exists
      await expect(editor).toContainText("testvar");
      let variableCount = await editor.locator(".courier-variable-node").count();
      expect(variableCount).toBe(1);

      // Position cursor at end and move before variable
      await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        ed.commands.focus("end");
      });
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(200);

      // Type some text
      await page.keyboard.type("abc");
      await page.waitForTimeout(300);

      // Variable should still exist (not be replaced)
      variableCount = await editor.locator(".courier-variable-node").count();
      expect(variableCount).toBe(1);
      await expect(editor).toContainText("testvar");
      await expect(editor).toContainText("abc");
    });

    test("should handle multiple lines with variables correctly", async ({ page }) => {
      const editor = getMainEditor(page);
      await editor.click({ force: true });
      await page.waitForTimeout(200);

      // Create structure:
      // {{var1}}
      // {{var2}}
      // {{var3}}
      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
          ed.commands.clearContent();
          ed.commands.insertContent([
            { type: "variable", attrs: { id: "var1", isInvalid: false } },
            { type: "hardBreak" },
            { type: "variable", attrs: { id: "var2", isInvalid: false } },
            { type: "hardBreak" },
            { type: "variable", attrs: { id: "var3", isInvalid: false } },
          ]);
        }
      });

      await page.waitForTimeout(300);

      // Verify all three variables exist
      const variableCount = await editor.locator(".courier-variable-node").count();
      expect(variableCount).toBe(3);

      // Navigate from end to beginning using ArrowLeft
      await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        ed.commands.focus("end");
      });

      // Move before var3
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(100);

      // Type X before var3
      await page.keyboard.type("X");
      await page.waitForTimeout(200);

      // All variables should still exist
      const variableCountAfter = await editor.locator(".courier-variable-node").count();
      expect(variableCountAfter).toBe(3);

      // The X should be in the content
      const contentHasX = await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        return ed.getHTML().includes("X");
      });
      expect(contentHasX).toBe(true);
    });
  });

  test.describe("Variable cursor navigation edge cases", () => {
    test("should handle variable at the very start of content", async ({ page }) => {
      const editor = getMainEditor(page);
      await editor.click({ force: true });
      await page.waitForTimeout(200);

      // Insert just a variable at the start
      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
          ed.commands.clearContent();
          ed.commands.insertContent([
            { type: "variable", attrs: { id: "startvar", isInvalid: false } },
            { type: "text", text: " after" },
          ]);
        }
      });

      await page.waitForTimeout(300);

      // Position at start and verify we can navigate
      await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        ed.commands.focus("start");
      });

      // Type something at the start
      await page.keyboard.type("Z");
      await page.waitForTimeout(200);

      // Variable should still exist
      await expect(editor).toContainText("startvar");
      await expect(editor).toContainText("Z");
    });

    test("should handle consecutive variables with hardBreak", async ({ page }) => {
      const editor = getMainEditor(page);
      await editor.click({ force: true });
      await page.waitForTimeout(200);

      // Create: {{var1}}{{var2}}\n{{var3}}
      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
          ed.commands.clearContent();
          ed.commands.insertContent([
            { type: "variable", attrs: { id: "var1", isInvalid: false } },
            { type: "variable", attrs: { id: "var2", isInvalid: false } },
            { type: "hardBreak" },
            { type: "variable", attrs: { id: "var3", isInvalid: false } },
          ]);
        }
      });

      await page.waitForTimeout(300);

      // All three variables should exist
      const variableCount = await editor.locator(".courier-variable-node").count();
      expect(variableCount).toBe(3);

      // Navigate and verify cursor positioning works
      await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        ed.commands.focus("end");
      });

      // Move to before var3
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(100);

      const cursorPos = await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        const { $from } = ed.state.selection;
        return {
          nodeBefore: $from.nodeBefore?.type.name ?? null,
          nodeAfter: $from.nodeAfter?.type.name ?? null,
        };
      });

      expect(cursorPos.nodeBefore).toBe("hardBreak");
      expect(cursorPos.nodeAfter).toBe("variable");
    });
  });
});
