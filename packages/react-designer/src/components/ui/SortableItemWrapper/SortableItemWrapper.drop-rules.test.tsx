import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import React from "react";
import type { Editor } from "@tiptap/react";
import type { DropRulesOptions } from "@/components/extensions/DropRules";
import { SortableItemWrapper } from "./SortableItemWrapper";

interface DropConfig {
  canDrop: (args: { source: { data: Record<string, unknown> } }) => boolean;
  getData: (args: { input: { clientY: number }; element: HTMLElement }) => {
    allowedEdges?: string[];
  };
}

interface DragConfig {
  canDrag?: () => boolean;
}

let dropConfig: DropConfig | undefined;
let dragConfig: DragConfig | undefined;

vi.mock("@atlaskit/pragmatic-drag-and-drop/combine", () => ({
  combine: vi.fn(() => () => {}),
}));

vi.mock("@atlaskit/pragmatic-drag-and-drop/element/adapter", () => ({
  draggable: vi.fn((config: DragConfig) => {
    dragConfig = config;
    return () => {};
  }),
  dropTargetForElements: vi.fn((config: DropConfig) => {
    dropConfig = config;
    return () => {};
  }),
}));

vi.mock("@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge", () => ({
  attachClosestEdge: vi.fn((data: object, { allowedEdges }: { allowedEdges: string[] }) => ({
    ...data,
    allowedEdges,
  })),
  extractClosestEdge: vi.fn(() => null),
}));

vi.mock("@tiptap/react", () => ({
  NodeViewWrapper: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, ...props }, ref) => (
      <div ref={ref} {...props}>
        {children}
      </div>
    )
  ),
}));

/** A document of `count` paragraphs, the one with `id` at `index`, with these drop rules. */
const editorWith = (id: string, index: number, rules?: Partial<DropRulesOptions>, count = 3) => {
  const nodes = Array.from({ length: count }, (_, i) => ({
    attrs: { id: i === index ? id : `other-${i}` },
    type: { name: "paragraph" },
  }));
  const doc = {
    childCount: count,
    nodeAt: (pos: number) => nodes[pos] ?? null,
    type: { name: "doc" },
    content: {
      forEach: (cb: (child: unknown, offset: number, i: number) => void) =>
        nodes.forEach((n, i) => cb(n, i, i)),
    },
    descendants: (cb: (node: unknown, pos: number, parent: unknown) => boolean | void) => {
      for (const [i, node] of nodes.entries()) {
        if (cb(node, i, doc) === false) return;
      }
    },
  };
  const extensions = rules
    ? [{ name: "dropRules", options: { fixedFirstBlock: false, sidebarTypes: null, ...rules } }]
    : [];
  return {
    state: { doc },
    isDestroyed: false,
    extensionManager: { extensions },
  } as unknown as Editor;
};

const mount = (rules?: Partial<DropRulesOptions>, index = 0) => {
  render(
    <Provider store={createStore()}>
      <SortableItemWrapper id="block-1" editor={editorWith("block-1", index, rules)}>
        <p>Block</p>
      </SortableItemWrapper>
    </Provider>
  );
  return dropConfig!;
};

const sidebar = (dragType: string) => ({
  source: { data: { type: "sidebar", dragType, id: dragType } },
});
const edgesOf = (config: DropConfig) =>
  config.getData({ input: { clientY: 0 }, element: document.body }).allowedEdges;

describe("SortableItemWrapper drop rules", () => {
  beforeEach(() => {
    dropConfig = undefined;
    dragConfig = undefined;
  });

  afterEach(() => {
    cleanup();
  });

  describe("sidebarTypes", () => {
    it("takes the listed blocks from the sidebar", () => {
      const config = mount({ sidebarTypes: ["text", "list"] });

      expect(config.canDrop(sidebar("text"))).toBe(true);
      expect(config.canDrop(sidebar("list"))).toBe(true);
    });

    it("refuses other blocks from the sidebar", () => {
      const config = mount({ sidebarTypes: ["text", "list"] });

      expect(config.canDrop(sidebar("image"))).toBe(false);
      expect(config.canDrop(sidebar("button"))).toBe(false);
    });

    it("still takes blocks moved within the editor", () => {
      const config = mount({ sidebarTypes: ["text", "list"] });

      expect(
        config.canDrop({ source: { data: { type: "editor", dragType: "image", id: "x" } } })
      ).toBe(true);
    });
  });

  describe("fixedFirstBlock", () => {
    it("lets nothing land above the first block", () => {
      expect(edgesOf(mount({ fixedFirstBlock: true }, 0))).toEqual(["bottom"]);
    });

    it("keeps the usual edges for the blocks after it", () => {
      expect(edgesOf(mount({ fixedFirstBlock: true }, 1))).toEqual(["top"]);
      expect(edgesOf(mount({ fixedFirstBlock: true }, 2))).toEqual(["top", "bottom"]);
    });

    it("does not let the first block be dragged", () => {
      mount({ fixedFirstBlock: true }, 0);

      expect(dragConfig!.canDrag!()).toBe(false);
    });

    it("lets the blocks after it be dragged", () => {
      mount({ fixedFirstBlock: true }, 1);

      expect(dragConfig!.canDrag!()).toBe(true);
    });
  });

  describe("without rules (every other channel)", () => {
    it("takes any sidebar block", () => {
      const config = mount();

      expect(config.canDrop(sidebar("image"))).toBe(true);
      expect(config.canDrop(sidebar("button"))).toBe(true);
    });

    it("keeps the usual edges", () => {
      expect(edgesOf(mount(undefined, 0))).toEqual(["top"]);
      expect(edgesOf(mount(undefined, 2))).toEqual(["top", "bottom"]);
    });

    it("lets the first block be dragged", () => {
      mount(undefined, 0);

      expect(dragConfig!.canDrag?.() ?? true).toBe(true);
    });
  });
});
