import { describe, expect, it } from "vitest";
import type { ElementalNode } from "../../types/elemental.types";
import { extractLoopShapes } from "./extractLoopShapes";

const els = (x: unknown) => x as ElementalNode[];

describe("extractLoopShapes", () => {
  it("reads the item fields a looped group uses", () => {
    expect(
      extractLoopShapes(
        els([
          {
            type: "group",
            loop: "data.products",
            elements: [
              { type: "text", content: "{{$.item.name}} costs {{$.item.price}}" },
              { type: "action", content: "View", href: "https://x/{{$.item.id}}" },
            ],
          },
        ])
      )
    ).toEqual([
      { path: "data.products", kind: "object", fields: ["name", "price", "id"], nested: [] },
    ]);
  });

  it("tells primitive and count loops apart", () => {
    expect(
      extractLoopShapes(
        els([
          {
            type: "list",
            loop: "data.tags",
            elements: [
              { type: "list-item", elements: [{ type: "string", content: "{{$.item}}" }] },
            ],
          },
          { type: "group", loop: "data.rows", elements: [{ type: "divider" }] },
        ])
      )
    ).toEqual([
      { path: "data.tags", kind: "primitive" },
      { path: "data.rows", kind: "count" },
    ]);
  });

  it("keeps an inner loop's item out of the outer loop's fields", () => {
    expect(
      extractLoopShapes(
        els([
          {
            type: "group",
            loop: "data.products",
            elements: [
              { type: "text", content: "{{$.item.name}}" },
              {
                type: "list",
                loop: "data.tags",
                elements: [
                  { type: "list-item", elements: [{ type: "string", content: "{{$.item}}" }] },
                ],
              },
              { type: "list", loop: "$.item.sizes", elements: [] },
            ],
          },
        ])
      )
    ).toEqual([
      { path: "data.products", kind: "object", fields: ["name"], nested: ["sizes"] },
      { path: "data.tags", kind: "primitive" },
    ]);
  });

  it("merges loops over the same path", () => {
    const loop = (content: string) => ({
      type: "group",
      loop: "data.products",
      elements: [{ type: "text", content }],
    });
    expect(extractLoopShapes(els([loop("{{$.item.a}}"), loop("{{$.item.b}}")]))).toEqual([
      { path: "data.products", kind: "object", fields: ["a", "b"], nested: [] },
    ]);
  });
});
