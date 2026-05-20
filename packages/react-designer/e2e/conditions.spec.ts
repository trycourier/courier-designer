import { test, expect, setupComponentTest, getMainEditor } from "./test-utils";
import type { Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Insert TipTap content and wait for it to settle. */
async function insertContent(page: Page, nodes: unknown[]) {
  const editor = getMainEditor(page);
  await editor.click({ force: true });
  await page.waitForTimeout(200);

  await page.evaluate((content) => {
    const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
    if (!ed) return;
    ed.commands.setContent({ type: "doc", content });
  }, nodes);

  await page.waitForTimeout(500);
}

/** Read the `if` attr from a TipTap node matching a predicate. */
async function getTiptapNodeIf(
  page: Page,
  predicate: string, // serialised function body: `(n) => <bool>`
): Promise<unknown> {
  return page.evaluate((pred) => {
    const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
    if (!ed) return null;
    const fn = new Function("n", `return (${pred})(n)`);
    const json = ed.getJSON();
    // Search recursively (for nodes nested inside blockquote, list, column…)
    const search = (nodes: any[]): any => {
      for (const n of nodes ?? []) {
        if (fn(n)) return n?.attrs?.if ?? null;
        const child = search(n.content);
        if (child !== undefined) return child;
      }
      return undefined;
    };
    const result = search(json.content);
    return result ?? null;
  }, predicate);
}

/** Wait for debounced onUpdate and return the email channel's Elemental elements. */
async function getEmailElementalElements(page: Page): Promise<any[]> {
  await page.waitForTimeout(1000);

  const elementalContent = await page.evaluate(() => {
    const t = (window as any).__COURIER_CREATE_TEST__;
    return t?.getTemplateEditorContent?.() || t?.templateEditorContent;
  });

  const emailChannel = elementalContent?.elements?.find(
    (el: any) => el.type === "channel" && el.channel === "email",
  );

  return emailChannel?.elements ?? [];
}

/** Find an Elemental node by type and a text-content matcher. */
function findElementalNode(elements: any[], type: string, textMatch?: string): any {
  return elements.find((el: any) => {
    if (el.type !== type) return false;
    if (!textMatch) return true;
    if (typeof el.content === "string" && el.content.includes(textMatch)) return true;
    if (Array.isArray(el.elements)) {
      return el.elements.some(
        (e: any) => typeof e.content === "string" && e.content.includes(textMatch),
      );
    }
    return false;
  });
}

// ---------------------------------------------------------------------------
// Condition fixtures
// ---------------------------------------------------------------------------

const SINGLE_CONDITION = [
  {
    conditions: [{ property: "data.plan", operator: "equals", value: "pro" }],
    logical_operator: "and",
  },
];

const MULTIPLE_CONDITIONS_AND = [
  {
    conditions: [
      { property: "data.plan", operator: "equals", value: "pro" },
      { property: "data.active", operator: "equals", value: "true" },
    ],
    logical_operator: "and",
  },
];

const MULTIPLE_CONDITIONS_OR = [
  {
    conditions: [
      { property: "data.role", operator: "equals", value: "admin" },
      { property: "data.role", operator: "equals", value: "editor" },
    ],
    logical_operator: "or",
  },
];

const MULTIPLE_GROUPS = [
  {
    conditions: [{ property: "data.plan", operator: "equals", value: "enterprise" }],
    logical_operator: "and",
  },
  {
    conditions: [
      { property: "data.role", operator: "equals", value: "admin" },
      { property: "data.active", operator: "equals", value: "true" },
    ],
    logical_operator: "and",
  },
];

const ALL_BINARY_OPERATORS: Array<{
  operator: string;
  value: string;
}> = [
  { operator: "equals", value: "yes" },
  { operator: "not_equals", value: "no" },
  { operator: "greater_than", value: "10" },
  { operator: "less_than", value: "5" },
  { operator: "greater_than_or_equals", value: "10" },
  { operator: "less_than_or_equals", value: "5" },
  { operator: "contains", value: "abc" },
  { operator: "not_contains", value: "xyz" },
];

const UNARY_OPERATORS: string[] = ["is_empty", "is_not_empty"];

const NESTED_DOT_SOURCE = [
  {
    conditions: [
      { property: "data.user.profile.name", operator: "is_not_empty" },
    ],
    logical_operator: "and",
  },
];

const LEGACY_STRING_EXPRESSION = "{= data.show_block}";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Conditions e2e", () => {
  test.beforeEach(async ({ page }) => {
    await setupComponentTest(page);
  });

  // =========================================================================
  // 1. Condition structure variations (paragraph as vehicle)
  // =========================================================================

  test.describe("Condition structure variations", () => {
    test("single condition in one group round-trips", async ({ page }) => {
      await insertContent(page, [
        {
          type: "paragraph",
          attrs: { if: SINGLE_CONDITION },
          content: [{ type: "text", text: "Cond single" }],
        },
      ]);

      const tiptapIf = await getTiptapNodeIf(
        page,
        `(n) => n.type === "paragraph" && n.content?.[0]?.text === "Cond single"`,
      );
      expect(tiptapIf).toEqual(SINGLE_CONDITION);

      const els = await getEmailElementalElements(page);
      const node = findElementalNode(els, "text", "Cond single");
      expect(node).toBeTruthy();
      expect(node.if).toEqual(SINGLE_CONDITION);
    });

    test("multiple conditions with AND in one group", async ({ page }) => {
      await insertContent(page, [
        {
          type: "paragraph",
          attrs: { if: MULTIPLE_CONDITIONS_AND },
          content: [{ type: "text", text: "Multi AND" }],
        },
      ]);

      const els = await getEmailElementalElements(page);
      const node = findElementalNode(els, "text", "Multi AND");
      expect(node?.if).toEqual(MULTIPLE_CONDITIONS_AND);
      expect(node.if[0].conditions).toHaveLength(2);
      expect(node.if[0].logical_operator).toBe("and");
    });

    test("multiple conditions with OR in one group", async ({ page }) => {
      await insertContent(page, [
        {
          type: "paragraph",
          attrs: { if: MULTIPLE_CONDITIONS_OR },
          content: [{ type: "text", text: "Multi OR" }],
        },
      ]);

      const els = await getEmailElementalElements(page);
      const node = findElementalNode(els, "text", "Multi OR");
      expect(node?.if).toEqual(MULTIPLE_CONDITIONS_OR);
      expect(node.if[0].logical_operator).toBe("or");
    });

    test("multiple groups (OR between groups)", async ({ page }) => {
      await insertContent(page, [
        {
          type: "paragraph",
          attrs: { if: MULTIPLE_GROUPS },
          content: [{ type: "text", text: "Multi groups" }],
        },
      ]);

      const els = await getEmailElementalElements(page);
      const node = findElementalNode(els, "text", "Multi groups");
      expect(node?.if).toHaveLength(2);
      expect(node.if[0].conditions[0].value).toBe("enterprise");
      expect(node.if[1].conditions).toHaveLength(2);
    });

    test("all binary operators round-trip", async ({ page }) => {
      const condition = [
        {
          conditions: ALL_BINARY_OPERATORS.map((op) => ({
            property: "data.field",
            operator: op.operator,
            value: op.value,
          })),
          logical_operator: "and" as const,
        },
      ];

      await insertContent(page, [
        {
          type: "paragraph",
          attrs: { if: condition },
          content: [{ type: "text", text: "All binary ops" }],
        },
      ]);

      const els = await getEmailElementalElements(page);
      const node = findElementalNode(els, "text", "All binary ops");
      expect(node?.if[0].conditions).toHaveLength(ALL_BINARY_OPERATORS.length);

      for (let i = 0; i < ALL_BINARY_OPERATORS.length; i++) {
        expect(node.if[0].conditions[i].operator).toBe(ALL_BINARY_OPERATORS[i].operator);
        expect(node.if[0].conditions[i].value).toBe(ALL_BINARY_OPERATORS[i].value);
      }
    });

    test("unary operators (is_empty, is_not_empty) — no value field", async ({ page }) => {
      const condition = [
        {
          conditions: UNARY_OPERATORS.map((op) => ({
            property: "data.field",
            operator: op,
          })),
          logical_operator: "and" as const,
        },
      ];

      await insertContent(page, [
        {
          type: "paragraph",
          attrs: { if: condition },
          content: [{ type: "text", text: "Unary ops" }],
        },
      ]);

      const els = await getEmailElementalElements(page);
      const node = findElementalNode(els, "text", "Unary ops");
      expect(node?.if[0].conditions).toHaveLength(2);

      for (let i = 0; i < UNARY_OPERATORS.length; i++) {
        expect(node.if[0].conditions[i].operator).toBe(UNARY_OPERATORS[i]);
        expect(node.if[0].conditions[i].value).toBeUndefined();
      }
    });

    test("deeply nested dot-notation source", async ({ page }) => {
      await insertContent(page, [
        {
          type: "paragraph",
          attrs: { if: NESTED_DOT_SOURCE },
          content: [{ type: "text", text: "Nested source" }],
        },
      ]);

      const els = await getEmailElementalElements(page);
      const node = findElementalNode(els, "text", "Nested source");
      expect(node?.if[0].conditions[0].property).toBe("data.user.profile.name");
    });

    test("condition with empty-string value", async ({ page }) => {
      const condition = [
        {
          conditions: [{ property: "data.name", operator: "equals", value: "" }],
          logical_operator: "and" as const,
        },
      ];

      await insertContent(page, [
        {
          type: "paragraph",
          attrs: { if: condition },
          content: [{ type: "text", text: "Empty value" }],
        },
      ]);

      const els = await getEmailElementalElements(page);
      const node = findElementalNode(els, "text", "Empty value");
      expect(node?.if[0].conditions[0].value).toBe("");
    });

    test("condition value with special characters", async ({ page }) => {
      const condition = [
        {
          conditions: [
            { property: "data.label", operator: "contains", value: "hello & world <test>" },
          ],
          logical_operator: "and" as const,
        },
      ];

      await insertContent(page, [
        {
          type: "paragraph",
          attrs: { if: condition },
          content: [{ type: "text", text: "Special chars" }],
        },
      ]);

      const els = await getEmailElementalElements(page);
      const node = findElementalNode(els, "text", "Special chars");
      expect(node?.if[0].conditions[0].value).toBe("hello & world <test>");
    });
  });

  // =========================================================================
  // 2. Node without `if` stays clean
  // =========================================================================

  test.describe("No-condition nodes", () => {
    test("paragraph without if has no if in Elemental output", async ({ page }) => {
      await insertContent(page, [
        {
          type: "paragraph",
          content: [{ type: "text", text: "No condition" }],
        },
      ]);

      const els = await getEmailElementalElements(page);
      const node = findElementalNode(els, "text", "No condition");
      expect(node).toBeTruthy();
      expect(node.if).toBeUndefined();
    });

    test("mix of conditional and unconditional nodes", async ({ page }) => {
      await insertContent(page, [
        {
          type: "paragraph",
          attrs: { if: SINGLE_CONDITION },
          content: [{ type: "text", text: "With cond" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Without cond" }],
        },
      ]);

      const els = await getEmailElementalElements(page);

      const withCond = findElementalNode(els, "text", "With cond");
      expect(withCond?.if).toBeDefined();
      expect(Array.isArray(withCond.if)).toBe(true);

      const withoutCond = findElementalNode(els, "text", "Without cond");
      expect(withoutCond?.if).toBeUndefined();
    });
  });

  // =========================================================================
  // 3. Legacy string `if` expression
  // =========================================================================

  test.describe("Legacy string expression", () => {
    test("string if round-trips through TipTap → Elemental", async ({ page }) => {
      await insertContent(page, [
        {
          type: "paragraph",
          attrs: { if: LEGACY_STRING_EXPRESSION },
          content: [{ type: "text", text: "Legacy expr" }],
        },
      ]);

      const tiptapIf = await getTiptapNodeIf(
        page,
        `(n) => n.type === "paragraph" && n.content?.[0]?.text === "Legacy expr"`,
      );
      expect(tiptapIf).toBe(LEGACY_STRING_EXPRESSION);

      const els = await getEmailElementalElements(page);
      const node = findElementalNode(els, "text", "Legacy expr");
      expect(node?.if).toBe(LEGACY_STRING_EXPRESSION);
    });
  });

  // =========================================================================
  // 4. Block-type coverage
  // =========================================================================

  test.describe("Block type coverage", () => {
    test("heading node preserves if", async ({ page }) => {
      await insertContent(page, [
        {
          type: "heading",
          attrs: { level: 2, if: SINGLE_CONDITION },
          content: [{ type: "text", text: "Heading with cond" }],
        },
      ]);

      const els = await getEmailElementalElements(page);
      const node = findElementalNode(els, "text", "Heading with cond");
      expect(node?.if).toEqual(SINGLE_CONDITION);
    });

    test("button (action) node preserves if", async ({ page }) => {
      await insertContent(page, [
        {
          type: "button",
          attrs: { if: SINGLE_CONDITION, label: "Buy now", link: "https://example.com" },
          content: [{ type: "text", text: "Buy now" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "spacer" }],
        },
      ]);

      const els = await getEmailElementalElements(page);
      const node = findElementalNode(els, "action", "Buy now");
      expect(node).toBeTruthy();
      expect(node.if).toEqual(SINGLE_CONDITION);
    });

    test("divider node preserves if", async ({ page }) => {
      await insertContent(page, [
        {
          type: "paragraph",
          content: [{ type: "text", text: "before divider" }],
        },
        {
          type: "divider",
          attrs: { if: SINGLE_CONDITION },
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "after divider" }],
        },
      ]);

      const els = await getEmailElementalElements(page);
      const node = findElementalNode(els, "divider");
      expect(node).toBeTruthy();
      expect(node.if).toEqual(SINGLE_CONDITION);
    });

    test("imageBlock node preserves if", async ({ page }) => {
      await insertContent(page, [
        {
          type: "imageBlock",
          attrs: {
            if: SINGLE_CONDITION,
            sourcePath: "https://example.com/img.png",
            alt: "Test image",
          },
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "after image" }],
        },
      ]);

      const els = await getEmailElementalElements(page);
      const node = findElementalNode(els, "image");
      expect(node).toBeTruthy();
      expect(node.if).toEqual(SINGLE_CONDITION);
    });

    test("blockquote node preserves if", async ({ page }) => {
      await insertContent(page, [
        {
          type: "blockquote",
          attrs: { if: SINGLE_CONDITION },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Quoted with cond" }],
            },
          ],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "after quote" }],
        },
      ]);

      const els = await getEmailElementalElements(page);
      const node = findElementalNode(els, "quote", "Quoted with cond");
      expect(node).toBeTruthy();
      expect(node.if).toEqual(SINGLE_CONDITION);
    });

    test("customCode (HTML) node preserves if", async ({ page }) => {
      await insertContent(page, [
        {
          type: "customCode",
          attrs: {
            if: SINGLE_CONDITION,
            code: "<p>Custom HTML block</p>",
          },
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "after html" }],
        },
      ]);

      const els = await getEmailElementalElements(page);
      const node = findElementalNode(els, "html");
      expect(node).toBeTruthy();
      expect(node.if).toEqual(SINGLE_CONDITION);
    });

    test("list node preserves if", async ({ page }) => {
      await insertContent(page, [
        {
          type: "list",
          attrs: { if: SINGLE_CONDITION, listType: "unordered" },
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "Item one" }] },
              ],
            },
          ],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "after list" }],
        },
      ]);

      const els = await getEmailElementalElements(page);
      const node = findElementalNode(els, "list");
      expect(node).toBeTruthy();
      expect(node.if).toEqual(SINGLE_CONDITION);
    });
  });

  // =========================================================================
  // 5. Complex / edge-case scenarios
  // =========================================================================

  test.describe("Edge cases", () => {
    test("multiple block types each with different conditions", async ({ page }) => {
      const condA = [
        {
          conditions: [{ property: "data.a", operator: "equals", value: "1" }],
          logical_operator: "and" as const,
        },
      ];
      const condB = [
        {
          conditions: [{ property: "data.b", operator: "not_equals", value: "2" }],
          logical_operator: "or" as const,
        },
      ];

      await insertContent(page, [
        {
          type: "paragraph",
          attrs: { if: condA },
          content: [{ type: "text", text: "Block A" }],
        },
        {
          type: "paragraph",
          attrs: { if: condB },
          content: [{ type: "text", text: "Block B" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Block C" }],
        },
      ]);

      const els = await getEmailElementalElements(page);

      const nodeA = findElementalNode(els, "text", "Block A");
      expect(nodeA?.if).toEqual(condA);

      const nodeB = findElementalNode(els, "text", "Block B");
      expect(nodeB?.if).toEqual(condB);

      const nodeC = findElementalNode(els, "text", "Block C");
      expect(nodeC?.if).toBeUndefined();
    });

    test("large group with many conditions round-trips", async ({ page }) => {
      const manyConditions = Array.from({ length: 10 }, (_, i) => ({
        property: `data.field_${i}`,
        operator: "equals" as const,
        value: `val_${i}`,
      }));
      const condition = [{ conditions: manyConditions, logical_operator: "and" as const }];

      await insertContent(page, [
        {
          type: "paragraph",
          attrs: { if: condition },
          content: [{ type: "text", text: "Many conds" }],
        },
      ]);

      const els = await getEmailElementalElements(page);
      const node = findElementalNode(els, "text", "Many conds");
      expect(node?.if[0].conditions).toHaveLength(10);
      expect(node.if[0].conditions[9].property).toBe("data.field_9");
    });

    test("many groups round-trip", async ({ page }) => {
      const groups = Array.from({ length: 5 }, (_, i) => ({
        conditions: [{ property: `data.g${i}`, operator: "equals" as const, value: `${i}` }],
        logical_operator: "and" as const,
      }));

      await insertContent(page, [
        {
          type: "paragraph",
          attrs: { if: groups },
          content: [{ type: "text", text: "Many groups" }],
        },
      ]);

      const els = await getEmailElementalElements(page);
      const node = findElementalNode(els, "text", "Many groups");
      expect(node?.if).toHaveLength(5);
      expect(node.if[4].conditions[0].property).toBe("data.g4");
    });

    test("condition source with data prefix variations", async ({ page }) => {
      const condition = [
        {
          conditions: [
            { property: "data.simple", operator: "equals", value: "a" },
            { property: "profile.email", operator: "contains", value: "@" },
            { property: "data.nested.deep.value", operator: "is_not_empty" },
          ],
          logical_operator: "and" as const,
        },
      ];

      await insertContent(page, [
        {
          type: "paragraph",
          attrs: { if: condition },
          content: [{ type: "text", text: "Source variants" }],
        },
      ]);

      const els = await getEmailElementalElements(page);
      const node = findElementalNode(els, "text", "Source variants");
      expect(node?.if[0].conditions[0].property).toBe("data.simple");
      expect(node.if[0].conditions[1].property).toBe("profile.email");
      expect(node.if[0].conditions[2].property).toBe("data.nested.deep.value");
    });
  });
});
