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
    emailChannel.content_background_color = "#ecf1c8";
  }
  return template;
}

test.describe("Email Background Color Settings", () => {
  test.beforeEach(async ({ page }) => {
    await setupMockedTest(page, templateWithBackgroundColors());
    const editor = page.locator(MAIN_EDITOR_SELECTOR);
    await expect(editor).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test("Settings tab color inputs visual snapshot", async ({ page }) => {
    const settingsTab = page.locator('button[role="tab"]:has-text("Settings")');
    await expect(settingsTab).toBeVisible();
    await settingsTab.click();
    await page.waitForTimeout(300);

    const settingsPanel = page.locator('[role="tabpanel"]').filter({ hasText: "Body background" });
    await expect(settingsPanel).toBeVisible();

    await expect(settingsPanel).toHaveScreenshot("settings-color-inputs.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("color swatch is vertically centered in input", async ({ page }) => {
    const settingsTab = page.locator('button[role="tab"]:has-text("Settings")');
    await settingsTab.click();
    await page.waitForTimeout(300);

    const settingsPanel = page.locator('[role="tabpanel"]').filter({ hasText: "Body background" });
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
        const label = i === 0 ? "Body background" : "Content background";
        expect(
          Math.abs(swatchCenterY - inputCenterY),
          `${label} swatch should be vertically centered (offset: ${Math.abs(swatchCenterY - inputCenterY).toFixed(1)}px)`
        ).toBeLessThan(3);
      }
    }
  });
});
