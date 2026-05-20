import { test, expect } from "@playwright/test";
import {
  COURIER_AUTH_TOKEN,
  loadDesignerEditor,
  resetEditor,
  saveTemplate,
  publishTemplate,
  captureElementalContent,
  sendNotification,
  pollForRenderedHtml,
} from "./full-cycle-utils";

/**
 * Full-Cycle E2E: Conditional rendering via structured `if` conditions
 *
 * Verifies that structured conditions on Elemental nodes are correctly:
 * 1. Produced by the Designer (Elemental output contains `if` with condition groups)
 * 2. Evaluated by the Courier backend during rendering
 * 3. Conditionally included/excluded in the final rendered email
 */

test.describe("Full Cycle: Conditions", () => {
  test.skip(!COURIER_AUTH_TOKEN, "COURIER_AUTH_TOKEN not set – skipping full-cycle test");
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await loadDesignerEditor(page);
    await resetEditor(page);
  });

  test("conditional text block is included when condition is met", async ({ page, request }) => {
    console.log("Step 1: Inserting text block with structured condition via setContent...");

    await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!ed) return;
      ed.commands.setContent({
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: {
              if: [
                {
                  conditions: [{ property: "data.show_block", operator: "equals", value: "yes" }],
                  logical_operator: "and",
                },
              ],
            },
            content: [{ type: "text", text: "CONDITIONAL_VISIBLE" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "ALWAYS_VISIBLE" }],
          },
        ],
      });
    });
    await page.waitForTimeout(500);

    // Step 2: Verify Elemental output has the condition
    console.log("Step 2: Verifying Elemental output...");
    const { emailElements } = await captureElementalContent(page);

    const conditionalNode = emailElements.find((el: any) => {
      const content = el.content || "";
      const elemContent = el.elements?.some((e: any) => e.content?.includes("CONDITIONAL_VISIBLE"));
      return content.includes("CONDITIONAL_VISIBLE") || elemContent;
    });
    expect(conditionalNode, "Should find CONDITIONAL_VISIBLE in Elemental output").toBeTruthy();
    expect(conditionalNode.if, "Node should have structured `if` condition").toBeTruthy();
    expect(Array.isArray(conditionalNode.if), "`if` should be an array (structured condition)").toBe(true);
    expect(conditionalNode.if[0].conditions[0].property).toBe("data.show_block");
    expect(conditionalNode.if[0].conditions[0].operator).toBe("equals");
    expect(conditionalNode.if[0].conditions[0].value).toBe("yes");
    console.log("  ✓ Elemental output contains structured condition");

    // Step 3: Save & publish
    console.log("Step 3: Saving and publishing...");
    await saveTemplate(page);
    await publishTemplate(page);
    console.log("  ✓ Template saved and published");

    // Step 4: Send with data that MATCHES the condition
    console.log("Step 4: Sending with data.show_block = 'yes' (condition met)...");
    const requestId = await sendNotification(request, emailElements, { show_block: "yes" });
    const { renderedHtml } = await pollForRenderedHtml(request, requestId);

    expect(renderedHtml).toBeTruthy();
    expect(renderedHtml).toContain("CONDITIONAL_VISIBLE");
    expect(renderedHtml).toContain("ALWAYS_VISIBLE");
    console.log("  ✓ Both blocks rendered when condition is met");

    console.log("\n✅ Conditional block included when condition is met!");
  });

  test("conditional text block is excluded when condition is NOT met", async ({
    page,
    request,
  }) => {
    console.log("Step 1: Inserting text block with structured condition...");

    await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!ed) return;
      ed.commands.setContent({
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: {
              if: [
                {
                  conditions: [{ property: "data.show_block", operator: "equals", value: "yes" }],
                  logical_operator: "and",
                },
              ],
            },
            content: [{ type: "text", text: "CONDITIONAL_HIDDEN" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "ALWAYS_PRESENT" }],
          },
        ],
      });
    });
    await page.waitForTimeout(500);

    const { emailElements } = await captureElementalContent(page);

    // Step 2: Save & publish
    console.log("Step 2: Saving and publishing...");
    await saveTemplate(page);
    await publishTemplate(page);

    // Step 3: Send with data that does NOT match the condition
    console.log("Step 3: Sending with data.show_block = 'no' (condition NOT met)...");
    const requestId = await sendNotification(request, emailElements, { show_block: "no" });
    const { renderedHtml } = await pollForRenderedHtml(request, requestId);

    expect(renderedHtml).toBeTruthy();
    expect(renderedHtml).not.toContain("CONDITIONAL_HIDDEN");
    expect(renderedHtml).toContain("ALWAYS_PRESENT");
    console.log("  ✓ Conditional block excluded, unconditional block present");

    console.log("\n✅ Conditional block excluded when condition is NOT met!");
  });

  test("multiple conditions with OR groups", async ({ page, request }) => {
    console.log("Step 1: Inserting text block with OR condition groups...");

    await page.evaluate(() => {
      const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
      if (!ed) return;
      ed.commands.setContent({
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: {
              if: [
                {
                  conditions: [{ property: "data.plan", operator: "equals", value: "premium" }],
                  logical_operator: "and",
                },
                {
                  conditions: [{ property: "data.role", operator: "equals", value: "admin" }],
                  logical_operator: "and",
                },
              ],
            },
            content: [{ type: "text", text: "VIP_CONTENT" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "BASE_CONTENT" }],
          },
        ],
      });
    });
    await page.waitForTimeout(500);

    const { emailElements } = await captureElementalContent(page);

    const conditionalNode = emailElements.find((el: any) => {
      const content = el.content || "";
      const elemContent = el.elements?.some((e: any) => e.content?.includes("VIP_CONTENT"));
      return content.includes("VIP_CONTENT") || elemContent;
    });
    expect(conditionalNode?.if).toHaveLength(2);
    console.log("  ✓ Elemental output has 2 OR groups");

    // Save & publish
    await saveTemplate(page);
    await publishTemplate(page);

    // Send with second OR group matching (role=admin but plan=free)
    console.log("Step 2: Sending with data.role = 'admin' (second OR group matches)...");
    const requestId = await sendNotification(request, emailElements, {
      plan: "free",
      role: "admin",
    });
    const { renderedHtml } = await pollForRenderedHtml(request, requestId);

    expect(renderedHtml).toBeTruthy();
    expect(renderedHtml).toContain("VIP_CONTENT");
    expect(renderedHtml).toContain("BASE_CONTENT");
    console.log("  ✓ VIP content shown when second OR group matches");

    console.log("\n✅ OR group evaluation works correctly!");
  });
});
