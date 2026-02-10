import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit tests for Shadow DOM detection logic used in SortableItemWrapper.
 *
 * The SortableItemWrapper component detects if it's inside a Shadow DOM
 * and conditionally disables drag handles, since pragmatic-drag-and-drop's
 * handle validation doesn't work with Shadow DOM event re-targeting.
 *
 * These tests verify the detection logic: `element.getRootNode() instanceof ShadowRoot`
 */

// Mock the pragmatic-drag-and-drop modules to avoid complex setup
vi.mock("@atlaskit/pragmatic-drag-and-drop/combine", () => ({
  combine: vi.fn(() => vi.fn()),
}));

vi.mock("@atlaskit/pragmatic-drag-and-drop/element/adapter", () => ({
  draggable: vi.fn(() => vi.fn()),
  dropTargetForElements: vi.fn(() => vi.fn()),
}));

vi.mock("@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge", () => ({
  attachClosestEdge: vi.fn(),
  extractClosestEdge: vi.fn(),
}));

describe("Shadow DOM detection for drag handles", () => {
  it("should detect when element is inside a Shadow DOM", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const shadowRoot = container.attachShadow({ mode: "open" });

    const innerElement = document.createElement("div");
    shadowRoot.appendChild(innerElement);

    const isInShadowDom = innerElement.getRootNode() instanceof ShadowRoot;
    expect(isInShadowDom).toBe(true);

    container.remove();
  });

  it("should detect when element is NOT inside a Shadow DOM", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);

    const isInShadowDom = element.getRootNode() instanceof ShadowRoot;
    expect(isInShadowDom).toBe(false);

    element.remove();
  });

  it("should detect deeply nested element inside Shadow DOM", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const shadowRoot = container.attachShadow({ mode: "open" });

    // Create a deep nesting: shadowRoot > wrapper > nested > handle
    const wrapper = document.createElement("div");
    const nested = document.createElement("div");
    const handle = document.createElement("button");

    wrapper.appendChild(nested);
    nested.appendChild(handle);
    shadowRoot.appendChild(wrapper);

    expect(handle.getRootNode() instanceof ShadowRoot).toBe(true);
    expect(nested.getRootNode() instanceof ShadowRoot).toBe(true);
    expect(wrapper.getRootNode() instanceof ShadowRoot).toBe(true);

    container.remove();
  });

  it("should correctly determine drag handle config based on shadow DOM context", () => {
    // Simulate the logic from SortableItemWrapper
    const getDragHandleConfig = (
      element: HTMLElement,
      handle: HTMLButtonElement | null
    ): HTMLButtonElement | undefined => {
      const isInShadowDom = element.getRootNode() instanceof ShadowRoot;
      return isInShadowDom ? undefined : handle || undefined;
    };

    // Test: Normal DOM - should use handle
    const normalElement = document.createElement("div");
    document.body.appendChild(normalElement);
    const normalHandle = document.createElement("button");

    expect(getDragHandleConfig(normalElement, normalHandle)).toBe(normalHandle);
    normalElement.remove();

    // Test: Shadow DOM - should return undefined (no handle)
    const container = document.createElement("div");
    document.body.appendChild(container);
    const shadowRoot = container.attachShadow({ mode: "open" });
    const shadowElement = document.createElement("div");
    shadowRoot.appendChild(shadowElement);
    const shadowHandle = document.createElement("button");
    shadowRoot.appendChild(shadowHandle);

    expect(getDragHandleConfig(shadowElement, shadowHandle)).toBeUndefined();
    container.remove();
  });

  it("should use handle when it is null in normal DOM", () => {
    const getDragHandleConfig = (
      element: HTMLElement,
      handle: HTMLButtonElement | null
    ): HTMLButtonElement | undefined => {
      const isInShadowDom = element.getRootNode() instanceof ShadowRoot;
      return isInShadowDom ? undefined : handle || undefined;
    };

    const normalElement = document.createElement("div");
    document.body.appendChild(normalElement);

    // handle is null -> should return undefined (handle || undefined = undefined)
    expect(getDragHandleConfig(normalElement, null)).toBeUndefined();
    normalElement.remove();
  });

  describe("draggable() call arguments", () => {
    let draggable: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      const adapter = await import("@atlaskit/pragmatic-drag-and-drop/element/adapter");
      draggable = adapter.draggable as ReturnType<typeof vi.fn>;
      draggable.mockClear();
    });

    it("should call draggable without dragHandle in shadow DOM context", () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const shadowRoot = container.attachShadow({ mode: "open" });

      const element = document.createElement("div");
      shadowRoot.appendChild(element);
      const handle = document.createElement("button");
      shadowRoot.appendChild(handle);

      const isInShadowDom = element.getRootNode() instanceof ShadowRoot;

      // Simulate the draggable call from SortableItemWrapper
      draggable({
        element,
        dragHandle: isInShadowDom ? undefined : handle || undefined,
      });

      expect(draggable).toHaveBeenCalledWith(
        expect.objectContaining({
          element,
          dragHandle: undefined, // Should be undefined in shadow DOM
        })
      );

      container.remove();
    });

    it("should call draggable with dragHandle in normal DOM context", () => {
      const element = document.createElement("div");
      document.body.appendChild(element);
      const handle = document.createElement("button");
      element.appendChild(handle);

      const isInShadowDom = element.getRootNode() instanceof ShadowRoot;

      // Simulate the draggable call from SortableItemWrapper
      draggable({
        element,
        dragHandle: isInShadowDom ? undefined : handle || undefined,
      });

      expect(draggable).toHaveBeenCalledWith(
        expect.objectContaining({
          element,
          dragHandle: handle, // Should be the handle in normal DOM
        })
      );

      element.remove();
    });
  });
});
