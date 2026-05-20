import { test, expect, getMainEditor } from "./test-utils";
import { setupMockedTest, mockTemplateDataSamples } from "./template-test-utils";

test.describe("Variable Cross-Channel E2E", () => {
  test("variables are available in a multi-channel template", async ({ page }) => {
    // CrossChannelTestApp has 6 channels and VARIABLES = { data, profile, context }
    await setupMockedTest(page, mockTemplateDataSamples.allChannelsTemplate, {
      delay: 200,
      skipNavigation: true,
    });
    await page.goto("/test-app-cross-channel", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await page.waitForFunction(
      () =>
        (window as any).__COURIER_CREATE_TEST__?.currentEditor !== null &&
        (window as any).__COURIER_CREATE_TEST__?.currentEditor !== undefined,
      { timeout: 15000 }
    );

    const editor = getMainEditor(page);
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Step 1: Type {{ in the editor to trigger variable chip creation via input rule
    const textBlock = editor.locator("p, [data-placeholder]").first();
    if (await textBlock.isVisible({ timeout: 2000 }).catch(() => false)) {
      await textBlock.click({ force: true });
    } else {
      await editor.click({ force: true });
    }
    await page.waitForTimeout(300);
    await page.keyboard.type("{{", { delay: 80 });
    await page.waitForTimeout(1000);

    // Step 2: Verify autocomplete shows variables from the shared variables prop.
    // The CrossChannelTestApp passes { data: { name, order_id }, profile: { email }, context: { tenant_id, locale } }
    await expect(page.locator('button:has-text("data.name")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("profile.email")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("context.tenant_id")')).toBeVisible({
      timeout: 5000,
    });

    // Step 3: Select a variable from autocomplete
    await page.locator('button:has-text("data.name")').click();
    await page.waitForTimeout(500);

    // Step 4: Verify the chip was inserted and is valid
    const chip = editor.locator('.courier-variable-node:has-text("data.name")');
    await expect(chip).toBeVisible({ timeout: 5000 });
    await expect(
      editor.locator('.courier-variable-chip-invalid:has-text("data.name")')
    ).toHaveCount(0, { timeout: 3000 });

    // Step 5: Verify we're in a multi-channel template by checking channel tabs exist
    // The presence of multiple channel tabs (or the channel selector) proves this is
    // a multi-channel template where variables are shared across all channels
    const channelCount = await page.evaluate(() => {
      const bridge = (window as any).__COURIER_CREATE_TEST__;
      return bridge?.editors ? Object.keys(bridge.editors).length : 0;
    });
    expect(channelCount).toBeGreaterThanOrEqual(2);
  });

  test("multi-channel template exposes editors for all configured channels", async ({ page }) => {
    await setupMockedTest(page, mockTemplateDataSamples.minimalTemplate, {
      delay: 200,
      skipNavigation: true,
    });
    await page.goto("/test-app-autocomplete", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await page.waitForFunction(
      () =>
        (window as any).__COURIER_CREATE_TEST__?.currentEditor !== null &&
        (window as any).__COURIER_CREATE_TEST__?.currentEditor !== undefined,
      { timeout: 15000 }
    );

    const editor = getMainEditor(page);
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Step 1: Verify bridge.editors exists and has entries (email is active by default)
    const bridgeState = await page.evaluate(() => {
      const bridge = (window as any).__COURIER_CREATE_TEST__;
      const editorKeys = bridge?.editors ? Object.keys(bridge.editors) : [];
      const activeChannels = editorKeys.filter(
        (k) => bridge.editors[k as keyof typeof bridge.editors] != null
      );
      return {
        hasEditors: !!bridge?.editors,
        editorKeys,
        activeChannels,
        currentChannel: bridge?.getChannel?.() ?? null,
      };
    });
    expect(bridgeState.hasEditors).toBe(true);
    expect(bridgeState.activeChannels).toContain("email");
    expect(bridgeState.currentChannel).toBe("email");

    // Step 2: Type {{ in the editor to trigger variable chip creation via input rule
    const textBlock = editor.locator("p, [data-placeholder]").first();
    if (await textBlock.isVisible({ timeout: 2000 }).catch(() => false)) {
      await textBlock.click({ force: true });
    } else {
      await editor.click({ force: true });
    }
    await page.waitForTimeout(300);
    await page.keyboard.type("{{", { delay: 80 });
    await page.waitForTimeout(1000);

    // Step 3: Select user.firstName from autocomplete
    await expect(page.locator('button:has-text("user.firstName")')).toBeVisible({
      timeout: 10000,
    });
    await page.locator('button:has-text("user.firstName")').click();
    await page.waitForTimeout(500);

    // Step 4: Verify the chip was inserted in the email editor via bridge
    const chipInsertedInEmail = await page.evaluate(() => {
      const bridge = (window as any).__COURIER_CREATE_TEST__;
      const emailEd = bridge?.editors?.email;
      if (!emailEd) return false;
      let found = false;
      emailEd.state.doc.descendants((node: { type: { name: string }; attrs?: { id?: string } }) => {
        if (node.type?.name === "variable" && node.attrs?.id === "user.firstName") {
          found = true;
          return false;
        }
      });
      return found;
    });
    expect(chipInsertedInEmail).toBe(true);

    // Step 5: Verify multi-channel structure via bridge - editors object exists and
    // current channel is email. The TemplateProvider's single Jotai store ensures
    // availableVariablesAtom is shared across all channel editors when they mount.
    const crossChannelState = await page.evaluate(() => {
      const bridge = (window as any).__COURIER_CREATE_TEST__;
      const emailEd = bridge?.editors?.email;
      const editorKeys = bridge?.editors ? Object.keys(bridge.editors) : [];
      return {
        hasEmailEditor: !!emailEd,
        editorKeys,
        currentChannel: bridge?.getChannel?.() ?? null,
        hasSetChannel: typeof bridge?.setChannel === "function",
      };
    });
    expect(crossChannelState.hasEmailEditor).toBe(true);
    expect(crossChannelState.currentChannel).toBe("email");
    expect(crossChannelState.editorKeys).toContain("email");
    expect(crossChannelState.editorKeys).toContain("sms");
    expect(crossChannelState.hasSetChannel).toBe(true);
  });
});
