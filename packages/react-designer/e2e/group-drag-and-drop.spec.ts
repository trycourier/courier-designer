import type { Page } from "@playwright/test";
import { test, expect, setupComponentTest } from "./test-utils";

/**
 * Drag and drop around a group (C-21290). A group is a container whose blocks
 * the send flattens into the parent, so the canvas has to make three places
 * reachable: inside it, just before it and just after it — and a drag that
 * runs off the end of the email still has to land somewhere.
 */

const p = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });
const group = (...children: unknown[]) => ({
  type: "group",
  attrs: { loop: "data.items" },
  content: children,
});

async function loadDoc(page: Page, content: unknown[]) {
  await page.evaluate((c) => {
    const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
    editor.commands.setContent({ type: "doc", content: c });
  }, content);
  await page.waitForTimeout(400);
}

/** The document as text, groups as `[...]`, so a drop's landing spot reads at a glance. */
async function shape(page: Page): Promise<string> {
  return page.evaluate(() => {
    const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
    const show = (node: any): string =>
      node.type === "group"
        ? `[${(node.content ?? []).map(show).join(" ")}]`
        : (node.content ?? []).map((t: any) => t.text ?? "").join("") || "_";
    return editor.getJSON().content.map(show).join(" ");
  });
}

export const indicatorOwners = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll(".courier-drag-indicator, [data-group-drop-inside]")].map(
      (el) => {
        const item = el.closest('[data-cypress="draggable-item"]');
        const owner = el.hasAttribute("data-group-drop-inside")
          ? "group-inside"
          : (item?.getAttribute("data-node-type") ?? item?.querySelector("p")?.textContent ?? "?");
        return `${owner}:${(el as HTMLElement).offsetParent ? "vis" : "hidden"}`;
      }
    )
  );

const indicatorCount = (page: Page) =>
  page.evaluate(
    () =>
      [...document.querySelectorAll(".courier-drag-indicator, [data-group-drop-inside]")].filter(
        (el) =>
          (el as HTMLElement).offsetParent !== null || el.hasAttribute("data-group-drop-inside")
      ).length
  );

const GROUP = '[data-testid="email-editor"] [data-node-type="group"]';

/** The group's content box (what the edge strips are measured against). */
async function groupBox(page: Page, nth = 0) {
  const box = await page
    .locator(`${GROUP} > div > .draggable-content-wrapper`)
    .nth(nth)
    .boundingBox();
  expect(box).toBeTruthy();
  return box!;
}

async function blockBox(page: Page, text: string) {
  const box = await page
    .locator('[data-testid="email-editor"] p', { hasText: new RegExp(`^${text}$`) })
    .first()
    .boundingBox();
  expect(box).toBeTruthy();
  return box!;
}

/** Press on a block's handle, ready to move. */
async function pressBlockHandle(page: Page, text: string) {
  // The innermost block holding a paragraph with exactly this text (a group
  // holding it matches too, and comes first).
  const block = page
    .locator('[data-testid="email-editor"] [data-cypress="draggable-item"]')
    .filter({ has: page.locator("p", { hasText: new RegExp(`^${text}$`) }) })
    .last();
  await block.hover({ force: true });
  const handle = block.locator(":scope > div > [data-drag-handle]");
  const box = await handle.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
}

async function pressGroupHandle(page: Page) {
  // Selecting the group (its loop tag) shows its handle.
  await page.locator(`${GROUP} .c--loop-badge`).first().click();
  const handle = page.locator(`${GROUP} > div > [data-drag-handle]`).first();
  await expect(handle).toBeVisible();
  const box = await handle.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
}

type Point = { x: number; y: number };

/**
 * Move in steps (so the browser's native drag fires) to a target that is
 * re-measured on the way: drop placeholders open up as the pointer passes
 * blocks and push the layout around, which a person corrects for by following
 * the indicator. Then count indicators and drop.
 */
async function dropAt(page: Page, target: () => Promise<Point>) {
  for (let i = 0; i < 3; i++) {
    const { x, y } = await target();
    await page.mouse.move(x, y, { steps: i === 0 ? 12 : 4 });
    await page.waitForTimeout(120);
  }
  const shown = await indicatorCount(page);
  if (process.env.DND_DEBUG) console.log("DND", JSON.stringify(await indicatorOwners(page)));
  await page.mouse.up();
  await page.waitForTimeout(400);
  return { shown, left: await indicatorCount(page) };
}

test.describe("Group drag and drop", () => {
  test.beforeEach(async ({ page }) => {
    await setupComponentTest(page);
  });

  test("a group's top strip drops just before the group", async ({ page }) => {
    await loadDoc(page, [p("A"), group(p("G1"), p("G2")), p("Z")]);
    const g = await groupBox(page);
    await pressBlockHandle(page, "Z");
    const r = await dropAt(page, async () => {
      const g = await groupBox(page);
      return { x: g.x + g.width / 2, y: g.y + 3 };
    });
    expect(await shape(page)).toBe("A Z [G1 G2]");
    expect(r).toEqual({ shown: 1, left: 0 });
  });

  test("a group's bottom strip drops just after the group", async ({ page }) => {
    await loadDoc(page, [p("A"), group(p("G1"), p("G2")), p("Z")]);
    const g = await groupBox(page);
    await pressBlockHandle(page, "A");
    const r = await dropAt(page, async () => {
      const g = await groupBox(page);
      return { x: g.x + g.width / 2, y: g.y + g.height - 3 };
    });
    expect(await shape(page)).toBe("[G1 G2] A Z");
    expect(r).toEqual({ shown: 1, left: 0 });
  });

  test("the middle of a group drops between its blocks", async ({ page }) => {
    await loadDoc(page, [p("A"), group(p("G1"), p("G2")), p("Z")]);
    const g2 = await blockBox(page, "G2");
    await pressBlockHandle(page, "A");
    const r = await dropAt(page, async () => {
      const g2 = await blockBox(page, "G2");
      return { x: g2.x + g2.width / 2, y: g2.y + g2.height * 0.3 };
    });
    expect(await shape(page)).toBe("[G1 A G2] Z");
    expect(r).toEqual({ shown: 1, left: 0 });
  });

  test("an empty group takes a drop inside it", async ({ page }) => {
    await loadDoc(page, [p("A"), group(), p("Z")]);
    const g = await groupBox(page);
    await pressBlockHandle(page, "Z");
    const r = await dropAt(page, async () => {
      const g = await groupBox(page);
      return { x: g.x + g.width / 2, y: g.y + g.height / 2 };
    });
    expect(await shape(page)).toBe("A [Z]");
    expect(r).toEqual({ shown: 1, left: 0 });
  });

  test("a block moves into the middle of a group", async ({ page }) => {
    await loadDoc(page, [p("A"), group(p("G1"), p("G2")), p("Z")]);
    const g2 = await blockBox(page, "G2");
    await pressBlockHandle(page, "Z");
    const r = await dropAt(page, async () => {
      const g2 = await blockBox(page, "G2");
      return { x: g2.x + g2.width / 2, y: g2.y + g2.height * 0.3 };
    });
    expect(await shape(page)).toBe("A [G1 Z G2]");
    expect(r.left).toBe(0);
  });

  test("a group's block moves out through the group's top strip", async ({ page }) => {
    await loadDoc(page, [p("A"), group(p("G1"), p("G2")), p("Z")]);
    const g = await groupBox(page);
    await pressBlockHandle(page, "G2");
    const r = await dropAt(page, async () => {
      const g = await groupBox(page);
      return { x: g.x + g.width / 2, y: g.y + 3 };
    });
    expect(await shape(page)).toBe("A G2 [G1] Z");
    expect(r.left).toBe(0);
  });

  test("a group's only block dragged over its own group stays inside", async ({ page }) => {
    await loadDoc(page, [p("A"), group(p("G1")), p("Z")]);
    const g = await groupBox(page);
    await pressBlockHandle(page, "G1");
    const r = await dropAt(page, async () => {
      const g = await groupBox(page);
      return { x: g.x + g.width / 2, y: g.y + g.height / 2 };
    });
    expect(await shape(page)).toBe("A [G1] Z");
    expect(r.left).toBe(0);
  });

  test("a group dropped on its own blocks stays where it was", async ({ page }) => {
    await loadDoc(page, [p("A"), group(p("G1"), p("G2")), p("Z")]);
    const g2 = await blockBox(page, "G2");
    await pressGroupHandle(page);
    const r = await dropAt(page, async () => {
      const g2 = await blockBox(page, "G2");
      return { x: g2.x + g2.width / 2, y: g2.y + g2.height / 2 };
    });
    expect(await shape(page)).toBe("A [G1 G2] Z");
    expect(r.left).toBe(0);
  });

  test("the lower half of a group's last block drops after it, still inside", async ({ page }) => {
    await loadDoc(page, [p("A"), group(p("G1"), p("G2")), p("Z")]);
    await pressBlockHandle(page, "A");
    const r = await dropAt(page, async () => {
      const g2 = await blockBox(page, "G2");
      const g = await groupBox(page);
      // Below G2's middle, above the group's bottom strip.
      return { x: g2.x + g2.width / 2, y: Math.min(g2.y + g2.height * 0.7, g.y + g.height - 13) };
    });
    expect(await shape(page)).toBe("[G1 G2 A] Z");
    expect(r).toEqual({ shown: 1, left: 0 });
  });

  test("dragging past the end of the email drops after the last block, with one indicator", async ({
    page,
  }) => {
    await loadDoc(page, [p("A"), group(p("G1"), p("G2"))]);
    const g = await groupBox(page);
    await pressBlockHandle(page, "A");
    // Through the group's lower half and on into the grey canvas.
    await page.mouse.move(g.x + g.width / 2, g.y + g.height - 8, { steps: 10 });
    const r = await dropAt(page, async () => {
      const g = await groupBox(page);
      return { x: g.x + g.width / 2, y: g.y + g.height + 220 };
    });
    expect(await shape(page)).toBe("[G1 G2] A");
    expect(r).toEqual({ shown: 1, left: 0 });
  });

  test("holding just below the email keeps one steady end indicator", async ({ page }) => {
    await loadDoc(page, [p("A"), p("B"), p("C")]);
    const contentBottom = () =>
      page.evaluate(
        () =>
          document
            .querySelector('[data-testid="email-editor"] .ProseMirror')!
            .getBoundingClientRect().bottom
      );
    const c = await blockBox(page, "C");
    const x = c.x + c.width / 2;
    await pressBlockHandle(page, "A");
    // Out into the canvas first, so the end indicator is up and C holds none.
    await page.mouse.move(x, (await contentBottom()) + 160, { steps: 12 });
    await page.waitForTimeout(250);
    // Then just under the content: inside the space the indicator itself takes,
    // where the card's zone and the canvas zone hand the pointer back and forth.
    const y = (await contentBottom()) + 20;
    await page.mouse.move(x, y, { steps: 6 });
    const counts: number[] = [];
    for (let i = 0; i < 20; i++) {
      await page.mouse.move(x + (i % 2), y);
      await page.waitForTimeout(30);
      counts.push(await indicatorCount(page));
    }
    if (process.env.DND_DEBUG) console.log("DND", JSON.stringify(counts));
    await page.mouse.up();
    await page.waitForTimeout(400);
    expect(counts).toEqual(Array(20).fill(1));
    expect(await shape(page)).toBe("B C A");
  });
});
