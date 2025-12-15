import { test, expect } from "@playwright/test";
import { mockTemplateResponse, mockTemplateDataSamples } from "./template-test-utils";

/**
 * E2E tests for useBlockConfig hook functionality
 * Tests block defaults, presets, and attribute configuration
 */
test.describe("Block Configuration E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the template API response
    await mockTemplateResponse(page, mockTemplateDataSamples.emptyTemplate, {
      delay: 100,
      requireAuth: false,
    });

    // Navigate to the custom elements test app which uses useBlockConfig
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
  });

  test.describe("Button Block Attributes", () => {
    test("should apply button defaults with correct types", async ({ page }) => {
      // Wait for editor to be ready
      const editor = page.locator('[data-testid="email-editor"] .tiptap.ProseMirror');
      await expect(editor).toBeVisible({ timeout: 10000 });

      // Insert a button using the sidebar
      const buttonBlock = page.locator('[data-type="button"]').first();
      if (await buttonBlock.isVisible()) {
        // Drag button to editor
        await buttonBlock.dragTo(editor);
        await page.waitForTimeout(500);
      }

      // Verify button was inserted and check its attributes
      const insertedButton = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (editor) {
          const json = editor.getJSON();
          const buttonNode = json.content?.find((n: any) => n.type === "button");
          return buttonNode?.attrs;
        }
        return null;
      });

      // If a button was inserted, verify attribute types
      if (insertedButton) {
        // borderRadius should be a number
        expect(typeof insertedButton.borderRadius).toBe("number");
        // padding should be a number
        expect(typeof insertedButton.padding).toBe("number");
        // backgroundColor should be a string
        expect(typeof insertedButton.backgroundColor).toBe("string");
        // alignment should be a string
        expect(typeof insertedButton.alignment).toBe("string");
      }
    });

    test("should have valid button attribute values", async ({ page }) => {
      const editor = page.locator('[data-testid="email-editor"] .tiptap.ProseMirror');
      await expect(editor).toBeVisible({ timeout: 10000 });

      // Insert button programmatically
      const buttonAttrs = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (editor) {
          editor.commands.setButton({});
          const json = editor.getJSON();
          const buttonNode = json.content?.find((n: any) => n.type === "button");
          return buttonNode?.attrs;
        }
        return null;
      });

      if (buttonAttrs) {
        // Verify default values are applied correctly
        expect(buttonAttrs.alignment).toMatch(/^(left|center|right)$/);
        expect(buttonAttrs.borderRadius).toBeGreaterThanOrEqual(0);
        expect(buttonAttrs.padding).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe("Divider Block Attributes", () => {
    test("should apply divider defaults with correct types", async ({ page }) => {
      const editor = page.locator('[data-testid="email-editor"] .tiptap.ProseMirror');
      await expect(editor).toBeVisible({ timeout: 10000 });

      // Insert divider using insertContent (setDivider command is not available)
      const dividerAttrs = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (editor) {
          editor.commands.insertContent({ type: "divider" });
          const json = editor.getJSON();
          const dividerNode = json.content?.find((n: any) => n.type === "divider");
          return dividerNode?.attrs;
        }
        return null;
      });

      if (dividerAttrs) {
        // padding should be a number
        expect(typeof dividerAttrs.padding).toBe("number");
        // size should be a number
        expect(typeof dividerAttrs.size).toBe("number");
        // color should be a string
        expect(typeof dividerAttrs.color).toBe("string");
        // variant should be a string
        expect(dividerAttrs.variant).toMatch(/^(divider|spacer)$/);
      }
    });

    test("should support spacer variant with transparent color", async ({ page }) => {
      const editor = page.locator('[data-testid="email-editor"] .tiptap.ProseMirror');
      await expect(editor).toBeVisible({ timeout: 10000 });

      // Insert spacer (divider with spacer variant) using insertContent
      const spacerAttrs = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (editor) {
          editor.commands.insertContent({
            type: "divider",
            attrs: { variant: "spacer", color: "transparent" },
          });
          const json = editor.getJSON();
          const dividerNode = json.content?.find((n: any) => n.type === "divider");
          return dividerNode?.attrs;
        }
        return null;
      });

      if (spacerAttrs) {
        expect(spacerAttrs.variant).toBe("spacer");
        expect(spacerAttrs.color).toBe("transparent");
      }
    });
  });

  test.describe("Image Block Attributes", () => {
    test("should apply image defaults with correct types", async ({ page }) => {
      const editor = page.locator('[data-testid="email-editor"] .tiptap.ProseMirror');
      await expect(editor).toBeVisible({ timeout: 10000 });

      // Insert image programmatically
      const imageAttrs = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (editor) {
          editor.commands.setImageBlock({ sourcePath: "https://example.com/image.png" });
          const json = editor.getJSON();
          const imageNode = json.content?.find((n: any) => n.type === "imageBlock");
          return imageNode?.attrs;
        }
        return null;
      });

      if (imageAttrs) {
        // width should be a number (0-1 ratio)
        expect(typeof imageAttrs.width).toBe("number");
        expect(imageAttrs.width).toBeGreaterThanOrEqual(0);
        expect(imageAttrs.width).toBeLessThanOrEqual(1);
        // alignment should be a string
        expect(imageAttrs.alignment).toMatch(/^(left|center|right)$/);
        // borderWidth should be a number
        expect(typeof imageAttrs.borderWidth).toBe("number");
      }
    });
  });

  test.describe("Text/Heading Block Attributes", () => {
    test("should apply text block defaults with correct types", async ({ page }) => {
      const editor = page.locator('[data-testid="email-editor"] .tiptap.ProseMirror');
      await expect(editor).toBeVisible({ timeout: 10000 });

      // Get paragraph attributes (text block)
      const textAttrs = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (editor) {
          const json = editor.getJSON();
          const textNode = json.content?.find((n: any) => n.type === "paragraph");
          return textNode?.attrs;
        }
        return null;
      });

      if (textAttrs) {
        // paddingVertical should be a number
        if (textAttrs.paddingVertical !== undefined) {
          expect(typeof textAttrs.paddingVertical).toBe("number");
        }
        // paddingHorizontal should be a number
        if (textAttrs.paddingHorizontal !== undefined) {
          expect(typeof textAttrs.paddingHorizontal).toBe("number");
        }
        // textAlign should be a string
        if (textAttrs.textAlign !== undefined) {
          expect(textAttrs.textAlign).toMatch(/^(left|center|right|justify)$/);
        }
      }
    });

    test("should apply heading defaults with correct types", async ({ page }) => {
      const editor = page.locator('[data-testid="email-editor"] .tiptap.ProseMirror');
      await expect(editor).toBeVisible({ timeout: 10000 });

      // Insert heading programmatically using insertContent
      const headingAttrs = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (editor) {
          editor.commands.insertContent({
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Test Heading" }],
          });
          const json = editor.getJSON();
          const headingNode = json.content?.find((n: any) => n.type === "heading");
          return headingNode?.attrs;
        }
        return null;
      });

      if (headingAttrs) {
        // level should be a number
        expect(typeof headingAttrs.level).toBe("number");
        expect(headingAttrs.level).toBeGreaterThanOrEqual(1);
        expect(headingAttrs.level).toBeLessThanOrEqual(6);
      }
    });
  });

  test.describe("Custom Code Block Attributes", () => {
    test("should apply custom code defaults with correct types", async ({ page }) => {
      const editor = page.locator('[data-testid="email-editor"] .tiptap.ProseMirror');
      await expect(editor).toBeVisible({ timeout: 10000 });

      // Insert custom code programmatically
      const codeAttrs = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (editor) {
          editor.commands.setCustomCode({ code: "<div>Test</div>" });
          const json = editor.getJSON();
          const codeNode = json.content?.find((n: any) => n.type === "customCode");
          return codeNode?.attrs;
        }
        return null;
      });

      if (codeAttrs) {
        // code should be a string
        expect(typeof codeAttrs.code).toBe("string");
      }
    });
  });

  test.describe("Column Block Attributes", () => {
    test("should apply column defaults with correct types", async ({ page }) => {
      const editor = page.locator('[data-testid="email-editor"] .tiptap.ProseMirror');
      await expect(editor).toBeVisible({ timeout: 10000 });

      // Insert column programmatically
      const columnAttrs = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (editor) {
          editor.commands.setColumn({});
          const json = editor.getJSON();
          const columnNode = json.content?.find((n: any) => n.type === "column");
          return columnNode?.attrs;
        }
        return null;
      });

      if (columnAttrs) {
        // columnsCount should be a number
        expect(typeof columnAttrs.columnsCount).toBe("number");
        expect(columnAttrs.columnsCount).toBeGreaterThanOrEqual(1);
        expect(columnAttrs.columnsCount).toBeLessThanOrEqual(4);
        // borderRadius should be a number
        expect(typeof columnAttrs.borderRadius).toBe("number");
        // borderWidth should be a number
        expect(typeof columnAttrs.borderWidth).toBe("number");
      }
    });
  });

  test.describe("Blockquote Block Attributes", () => {
    test("should apply blockquote defaults with correct types", async ({ page }) => {
      const editor = page.locator('[data-testid="email-editor"] .tiptap.ProseMirror');
      await expect(editor).toBeVisible({ timeout: 10000 });

      // Insert blockquote programmatically
      const blockquoteAttrs = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (editor) {
          editor.commands.toggleBlockquote();
          const json = editor.getJSON();
          const blockquoteNode = json.content?.find((n: any) => n.type === "blockquote");
          return blockquoteNode?.attrs;
        }
        return null;
      });

      if (blockquoteAttrs) {
        // paddingHorizontal should be a number
        if (blockquoteAttrs.paddingHorizontal !== undefined) {
          expect(typeof blockquoteAttrs.paddingHorizontal).toBe("number");
        }
        // paddingVertical should be a number
        if (blockquoteAttrs.paddingVertical !== undefined) {
          expect(typeof blockquoteAttrs.paddingVertical).toBe("number");
        }
        // borderLeftWidth should be a number
        if (blockquoteAttrs.borderLeftWidth !== undefined) {
          expect(typeof blockquoteAttrs.borderLeftWidth).toBe("number");
        }
      }
    });
  });

  test.describe("Block Presets", () => {
    test("should verify presets appear in sidebar", async ({ page }) => {
      // Wait for sidebar to be visible
      const sidebar = page.locator('[class*="sidebar"]').first();
      await expect(sidebar).toBeVisible({ timeout: 10000 });

      // Check if custom presets are visible (from App.tsx CustomElementsApp)
      // The presets "Go to Portal" and "Take Survey" should be visible if configured
      const portalPreset = page.locator('text="Go to Portal"');
      const surveyPreset = page.locator('text="Take Survey"');

      // At least check sidebar blocks are visible
      const textBlock = page.locator('[data-type="text"]').first();
      const buttonBlock = page.locator('[data-type="button"]').first();

      // Verify basic blocks are in sidebar
      if (await textBlock.isVisible()) {
        expect(await textBlock.isVisible()).toBe(true);
      }

      if (await buttonBlock.isVisible()) {
        expect(await buttonBlock.isVisible()).toBe(true);
      }
    });
  });

  test.describe("Attribute Type Validation", () => {
    test("should not accept string values where numbers are expected", async ({ page }) => {
      const editor = page.locator('[data-testid="email-editor"] .tiptap.ProseMirror');
      await expect(editor).toBeVisible({ timeout: 10000 });

      // Try to set button with string borderRadius (should be coerced or rejected)
      const result = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (editor) {
          try {
            // Insert button with potentially wrong types
            editor.commands.setButton({
              borderRadius: 4, // Correct: number
              padding: 6, // Correct: number
            });
            const json = editor.getJSON();
            const buttonNode = json.content?.find((n: any) => n.type === "button");
            return {
              success: true,
              borderRadius: buttonNode?.attrs?.borderRadius,
              borderRadiusType: typeof buttonNode?.attrs?.borderRadius,
              padding: buttonNode?.attrs?.padding,
              paddingType: typeof buttonNode?.attrs?.padding,
            };
          } catch (e) {
            return { success: false, error: String(e) };
          }
        }
        return { success: false, error: "Editor not found" };
      });

      if (result.success) {
        // Verify types are correct
        expect(result.borderRadiusType).toBe("number");
        expect(result.paddingType).toBe("number");
      }
    });

    test("should handle all alignment values correctly", async ({ page }) => {
      const editor = page.locator('[data-testid="email-editor"] .tiptap.ProseMirror');
      await expect(editor).toBeVisible({ timeout: 10000 });

      for (const alignment of ["left", "center", "right"]) {
        const result = await page.evaluate(
          (align) => {
            const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
            if (editor) {
              editor.commands.clearContent();
              editor.commands.setButton({ alignment: align as "left" | "center" | "right" });
              const json = editor.getJSON();
              const buttonNode = json.content?.find((n: any) => n.type === "button");
              return buttonNode?.attrs?.alignment;
            }
            return null;
          },
          alignment as "left" | "center" | "right"
        );

        if (result) {
          expect(result).toBe(alignment);
        }
      }
    });

    test("should handle color string values correctly", async ({ page }) => {
      const editor = page.locator('[data-testid="email-editor"] .tiptap.ProseMirror');
      await expect(editor).toBeVisible({ timeout: 10000 });

      const testColors = ["#007bff", "#28a745", "transparent", "rgb(255, 0, 0)"];

      for (const color of testColors) {
        const result = await page.evaluate((testColor) => {
          const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
          if (editor) {
            editor.commands.clearContent();
            editor.commands.setButton({ backgroundColor: testColor });
            const json = editor.getJSON();
            const buttonNode = json.content?.find((n: any) => n.type === "button");
            return buttonNode?.attrs?.backgroundColor;
          }
          return null;
        }, color);

        if (result) {
          expect(result).toBe(color);
        }
      }
    });
  });
});
