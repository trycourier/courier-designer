import { test, expect } from "@playwright/test";
import { setupMockedTest, mockTemplateDataSamples } from "./template-test-utils";
import { MAIN_EDITOR_SELECTOR } from "./test-utils";

function templateWithBackgroundColors() {
  const template = JSON.parse(JSON.stringify(mockTemplateDataSamples.fullTemplate));
  const emailChannel = template.data.tenant.notification.data.content.elements.find(
    (el: any) => el.type === "channel" && el.channel === "email"
  );
  if (emailChannel) {
    emailChannel.background_color = "#ef4444";
    emailChannel.content_body_color = "#ecf1c8";
  }
  return template;
}

function templateWithNoBackgroundColors() {
  return JSON.parse(JSON.stringify(mockTemplateDataSamples.minimalTemplate));
}

test.describe("Email Background Color Settings", () => {
  test.describe("with explicit colors", () => {
    test.beforeEach(async ({ page }) => {
      await setupMockedTest(page, templateWithBackgroundColors());
      const editor = page.locator(MAIN_EDITOR_SELECTOR);
      await expect(editor).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(500);
    });

    test("Email styles tab shows both color inputs", async ({ page }) => {
      await test.step("Open Email styles tab", async () => {
        const settingsTab = page.locator('button[role="tab"]:has-text("Email styles")');
        await expect(settingsTab).toBeVisible();
        await settingsTab.click();
        await page.waitForTimeout(300);
      });

      await test.step("Verify both color inputs are present", async () => {
        const settingsPanel = page.locator('[role="tabpanel"]').filter({ hasText: "Background color" });
        await expect(settingsPanel).toBeVisible();

        await expect(settingsPanel.getByText("Background color")).toBeVisible();
        await expect(settingsPanel.getByText("Content body color")).toBeVisible();

        const colorSwatches = settingsPanel.locator('[data-testid="color-swatch"]');
        await expect(colorSwatches).toHaveCount(2);

        const colorInputs = settingsPanel.locator('input[type="text"]');
        await expect(colorInputs.first()).toBeVisible();
        await expect(colorInputs.last()).toBeVisible();
      });
    });

    test("color swatch is vertically centered in input", async ({ page }) => {
      await test.step("Open Email styles tab", async () => {
        const settingsTab = page.locator('button[role="tab"]:has-text("Email styles")');
        await settingsTab.click();
        await page.waitForTimeout(300);
      });

      await test.step("Verify swatches are vertically centered", async () => {
        const settingsPanel = page.locator('[role="tabpanel"]').filter({ hasText: "Background color" });
        await expect(settingsPanel).toBeVisible();

        const swatches = settingsPanel.locator('[data-testid="color-swatch"]');
        const swatchCount = await swatches.count();
        expect(swatchCount).toBe(2);

        for (let i = 0; i < swatchCount; i++) {
          const swatch = swatches.nth(i);
          const input = swatch.locator(".. >> input");

          const swatchBox = await swatch.boundingBox();
          const inputBox = await input.boundingBox();
          expect(swatchBox).not.toBeNull();
          expect(inputBox).not.toBeNull();

          if (swatchBox && inputBox) {
            const swatchCenterY = swatchBox.y + swatchBox.height / 2;
            const inputCenterY = inputBox.y + inputBox.height / 2;
            const label = i === 0 ? "Background color" : "Content body color";
            expect(
              Math.abs(swatchCenterY - inputCenterY),
              `${label} swatch should be vertically centered (offset: ${Math.abs(swatchCenterY - inputCenterY).toFixed(1)}px)`
            ).toBeLessThan(3);
          }
        }
      });
    });
  });

  test.describe("content card styling", () => {
    test.beforeEach(async ({ page }) => {
      await setupMockedTest(page, templateWithBackgroundColors());
      const editor = page.locator(MAIN_EDITOR_SELECTOR);
      await expect(editor).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(500);
    });

    test("content card has no border", async ({ page }) => {
      await test.step("Verify .courier-editor-main has no border", async () => {
        const editorMain = page.locator(".courier-editor-main");
        await expect(editorMain).toBeVisible();

        const borderWidth = await editorMain.evaluate(
          (el) => getComputedStyle(el).borderWidth
        );
        expect(borderWidth).toBe("0px");
      });
    });
  });

  test.describe("click-to-deselect", () => {
    test.beforeEach(async ({ page }) => {
      await setupMockedTest(page, templateWithBackgroundColors());
      const editor = page.locator(MAIN_EDITOR_SELECTOR);
      await expect(editor).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(500);
    });

    test("clicking the body background deselects the active block", async ({ page }) => {
      await test.step("Click a block to select it", async () => {
        const editor = page.locator(MAIN_EDITOR_SELECTOR);
        await editor.click();
        await page.waitForTimeout(300);

        const selectedElement = page.locator(".selected-element");
        await expect(selectedElement).toBeVisible();
      });

      await test.step("Click the body background (container padding) and verify deselection", async () => {
        const container = page.locator(".courier-editor-container").first();
        const containerBox = await container.boundingBox();
        expect(containerBox).not.toBeNull();

        if (containerBox) {
          await page.mouse.click(
            containerBox.x + 10,
            containerBox.y + 10
          );
          await page.waitForTimeout(300);

          const selectedElement = page.locator(".selected-element");
          await expect(
            selectedElement,
            "Block should be deselected after clicking body background"
          ).toBeHidden({ timeout: 3000 });

          const settingsTab = page.locator('button[role="tab"]:has-text("Email styles")');
          if (await settingsTab.isVisible()) {
            await settingsTab.click();
            await page.waitForTimeout(200);
          }
          const settingsPanel = page.locator('[role="tabpanel"]').filter({ hasText: "Background color" });
          await expect(settingsPanel).toBeVisible({ timeout: 3000 });
        }
      });
    });
  });

  test.describe("default color rendering", () => {
    test.beforeEach(async ({ page }) => {
      await setupMockedTest(page, templateWithNoBackgroundColors());
      const editor = page.locator(MAIN_EDITOR_SELECTOR);
      await expect(editor).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(500);
    });

    test("editor renders default body background #FAF8F6 when no color is set", async ({ page }) => {
      await test.step("Verify default body background color", async () => {
        const editorContainer = page.locator(".courier-email-editor");
        await expect(editorContainer).toBeVisible();

        const bgColor = await editorContainer.evaluate(
          (el) => getComputedStyle(el).backgroundColor
        );
        expect(bgColor).toBe("rgb(250, 248, 246)");
      });
    });

    test("editor renders default content background #ffffff when no color is set", async ({ page }) => {
      await test.step("Verify default content background color", async () => {
        const editorMain = page.locator(".courier-editor-main");
        await expect(editorMain).toBeVisible();

        const bgColor = await editorMain.evaluate(
          (el) => getComputedStyle(el).backgroundColor
        );
        expect(bgColor).toBe("rgb(255, 255, 255)");
      });
    });

    test("Email styles tab shows default values in color inputs", async ({ page }) => {
      await test.step("Open Email styles tab", async () => {
        const settingsTab = page.locator('button[role="tab"]:has-text("Email styles")');
        await settingsTab.click();
        await page.waitForTimeout(300);
      });

      await test.step("Verify default color values in inputs", async () => {
        const settingsPanel = page.locator('[role="tabpanel"]').filter({ hasText: "Background color" });
        await expect(settingsPanel).toBeVisible();

        const inputs = settingsPanel.locator("input[type='text']");
        const bodyInput = inputs.nth(0);
        const contentInput = inputs.nth(1);

        await expect(bodyInput).toHaveValue("#FAF8F6");
        await expect(contentInput).toHaveValue("#ffffff");
      });
    });

    test("changing color to default value still emits it to Elemental", async ({ page }) => {
      await test.step("Open Email styles tab and pick a non-default color", async () => {
        const settingsTab = page.locator('button[role="tab"]:has-text("Email styles")');
        await settingsTab.click();
        await page.waitForTimeout(300);

        const settingsPanel = page.locator('[role="tabpanel"]').filter({ hasText: "Background color" });
        await expect(settingsPanel).toBeVisible();

        const bodyColorSwatch = settingsPanel.locator('[data-testid="color-swatch"]').nth(0);
        await bodyColorSwatch.click();
        await page.waitForTimeout(300);

        // Use the hex input inside the color picker popover
        const pickerInput = page.locator('[role="dialog"] input[placeholder="#000000"]');
        await expect(pickerInput).toBeVisible({ timeout: 3000 });
        await pickerInput.fill("#ef4444");
        await pickerInput.press("Enter");
        await page.waitForTimeout(500);
      });

      await test.step("Reset to default and verify background_color persists in Elemental", async () => {
        // Click the reset button (CircleX) to return to default
        const resetButton = page.locator('[role="dialog"] button:has(svg.lucide-circle-x)');
        await expect(resetButton).toBeVisible({ timeout: 3000 });
        await resetButton.click();
        await page.waitForTimeout(500);

        const elementalContent = await page.evaluate(() => {
          return (window as any).__COURIER_CREATE_TEST__?.templateEditorContent ?? null;
        });

        expect(
          elementalContent,
          "Test harness __COURIER_CREATE_TEST__.templateEditorContent must be available"
        ).not.toBeNull();

        const emailChannel = elementalContent.elements?.find(
          (el: any) => el.type === "channel" && el.channel === "email"
        );
        expect(
          emailChannel?.background_color,
          "background_color should always be present in Elemental even when matching the default"
        ).toBeDefined();
      });
    });
  });

  test.describe("block action buttons not clipped", () => {
    test.beforeEach(async ({ page }) => {
      await setupMockedTest(page, templateWithBackgroundColors());
      const editor = page.locator(MAIN_EDITOR_SELECTOR);
      await expect(editor).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(500);
    });

    test("action panel extends beyond editor-main bounds when block is selected", async ({ page }) => {
      await test.step("Select a block to reveal the action panel", async () => {
        const editor = page.locator(MAIN_EDITOR_SELECTOR);
        await editor.click();
        await page.waitForTimeout(300);

        const selectedElement = page.locator(".selected-element");
        await expect(selectedElement).toBeVisible();
      });

      await test.step("Verify action panel is visible and not clipped", async () => {
        const actionPanel = page.locator(".selected-element .courier-actions-panel").first();
        await expect(actionPanel).toBeVisible();

        const panelBox = await actionPanel.boundingBox();
        expect(panelBox, "Action panel should have a bounding box").not.toBeNull();
        expect(panelBox!.width, "Action panel width should be non-zero").toBeGreaterThan(0);
        expect(panelBox!.height, "Action panel height should be non-zero").toBeGreaterThan(0);

        const editorMain = page.locator(".courier-editor-main").first();
        const editorBox = await editorMain.boundingBox();
        expect(editorBox, "Editor main should have a bounding box").not.toBeNull();

        const panelRightEdge = panelBox!.x + panelBox!.width;
        const editorRightEdge = editorBox!.x + editorBox!.width;
        expect(
          panelRightEdge,
          "Action panel right edge should extend beyond editor-main (not clipped by overflow)"
        ).toBeGreaterThan(editorRightEdge);
      });
    });
  });
});
