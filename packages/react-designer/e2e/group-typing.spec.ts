import { test, expect, setupComponentTest } from "./test-utils";

/**
 * Typing in a block inside a group keeps that block selected (C-21290). Each
 * save re-ran "select the only block", which, with a group as the only block,
 * moved the selection to the group mid-typing.
 */
test("typing inside a lone group keeps the typed-in block selected", async ({ page }) => {
  await setupComponentTest(page);
  await page.evaluate(() => {
    (window as any).__COURIER_CREATE_TEST__.currentEditor.commands.setContent({
      type: "doc",
      content: [{ type: "group", content: [{ type: "paragraph", content: [{ type: "text", text: "G1" }] }] }],
    });
  });
  await page.waitForTimeout(400);

  const g1 = page.locator('[data-testid="email-editor"] p', { hasText: /^G1$/ });
  // The first click after loading content only focuses the editor.
  await g1.click({ force: true });
  await page.waitForTimeout(200);
  await g1.click({ force: true });
  await page.keyboard.press("End");
  await page.keyboard.type("xyz", { delay: 40 });
  // Past the 200ms save debounce and the effect that follows it.
  await page.waitForTimeout(800);

  const selected = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="email-editor"] .selected-element')].map((el) =>
        el.getAttribute("data-node-type") === "group" ? "group" : (el.textContent ?? "")
      )
    );
  expect(await selected()).toEqual(["G1xyz"]);
  await page.keyboard.type("!");
  expect(
    await page.evaluate(
      () => (window as any).__COURIER_CREATE_TEST__.currentEditor.getJSON().content[0].content[0]
    )
  ).toMatchObject({ type: "paragraph", content: [{ text: "G1xyz!" }] });
});
