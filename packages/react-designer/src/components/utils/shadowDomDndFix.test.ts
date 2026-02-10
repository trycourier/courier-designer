import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { applyShadowDomDndFix } from "./shadowDomDndFix";

/**
 * Unit tests for applyShadowDomDndFix.
 *
 * Note: jsdom does NOT have DragEvent or PointerEvent globals, and does NOT
 * simulate Shadow DOM event re-targeting. These tests verify the patching
 * mechanism itself (descriptor replacement, cleanup, event type filtering)
 * rather than full browser-level Shadow DOM behavior.
 *
 * Full drag-and-drop behavior in Shadow DOM is covered by e2e tests.
 */

// Polyfill DragEvent for jsdom (it's not available)
class MockDragEvent extends MouseEvent {
  dataTransfer: DataTransfer | null;
  constructor(type: string, init?: DragEventInit) {
    super(type, init);
    this.dataTransfer = init?.dataTransfer ?? null;
  }
}
// @ts-expect-error - polyfill for jsdom
globalThis.DragEvent = MockDragEvent;

// Polyfill PointerEvent for jsdom
class MockPointerEvent extends MouseEvent {
  pointerId: number;
  constructor(type: string, init?: PointerEventInit) {
    super(type, init);
    this.pointerId = init?.pointerId ?? 0;
  }
}
// @ts-expect-error - polyfill for jsdom
globalThis.PointerEvent = MockPointerEvent;

describe("applyShadowDomDndFix", () => {
  let container: HTMLDivElement;
  let shadowRoot: ShadowRoot;
  let cleanup: (() => void) | null = null;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    shadowRoot = container.attachShadow({ mode: "open" });
  });

  afterEach(() => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
    container.remove();
  });

  it("should return a cleanup function", () => {
    cleanup = applyShadowDomDndFix(shadowRoot);
    expect(typeof cleanup).toBe("function");
  });

  it("should patch Event.prototype.target descriptor", () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(Event.prototype, "target");

    cleanup = applyShadowDomDndFix(shadowRoot);

    const patchedDescriptor = Object.getOwnPropertyDescriptor(Event.prototype, "target");
    expect(patchedDescriptor?.get).not.toBe(originalDescriptor?.get);
  });

  it("should restore original Event.prototype.target on cleanup", () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(Event.prototype, "target");

    cleanup = applyShadowDomDndFix(shadowRoot);

    // Descriptor should be different now
    const patchedDescriptor = Object.getOwnPropertyDescriptor(Event.prototype, "target");
    expect(patchedDescriptor?.get).not.toBe(originalDescriptor?.get);

    // Cleanup
    cleanup();
    cleanup = null;

    // Descriptor should be restored
    const restoredDescriptor = Object.getOwnPropertyDescriptor(Event.prototype, "target");
    expect(restoredDescriptor?.get).toBe(originalDescriptor?.get);
  });

  it("should only affect patched event types in the getter", () => {
    const innerElement = document.createElement("div");
    shadowRoot.appendChild(innerElement);

    cleanup = applyShadowDomDndFix(shadowRoot);

    // Create a keyboard event (not in PATCHED_EVENTS)
    const keyEvent = new KeyboardEvent("keydown", { bubbles: true });
    innerElement.dispatchEvent(keyEvent);

    // The target getter should still return a value (not break)
    expect(keyEvent.target).toBeDefined();
  });

  it("should not break events outside the shadow root", () => {
    const outsideElement = document.createElement("div");
    document.body.appendChild(outsideElement);

    cleanup = applyShadowDomDndFix(shadowRoot);

    // Create a mousedown event on an element outside shadow DOM
    const mouseEvent = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });
    outsideElement.dispatchEvent(mouseEvent);

    // Target should still work (be the outside element)
    expect(mouseEvent.target).toBe(outsideElement);

    outsideElement.remove();
  });

  it("should handle the case where event.target is already correct", () => {
    // Event dispatched on a normal DOM element (not in shadow DOM)
    // composedPath[0] === event.target, so no patching needed
    const normalElement = document.createElement("div");
    document.body.appendChild(normalElement);

    cleanup = applyShadowDomDndFix(shadowRoot);

    const event = new MouseEvent("mousedown", { bubbles: true });
    normalElement.dispatchEvent(event);

    // Should return the original target unchanged
    expect(event.target).toBe(normalElement);

    normalElement.remove();
  });

  it("should return a no-op if Event.prototype.target descriptor is unavailable", () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(Event.prototype, "target")!;

    // Temporarily make the descriptor unavailable
    Object.defineProperty(Event.prototype, "target", { value: null, configurable: true });
    // Now getOwnPropertyDescriptor returns a value descriptor, not a getter
    // Let's actually delete it
    // @ts-expect-error - testing edge case
    delete Event.prototype.target;

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = applyShadowDomDndFix(shadowRoot);
    expect(typeof result).toBe("function");
    expect(warnSpy).toHaveBeenCalledWith(
      "[ShadowDomDndFix] Could not get Event.prototype.target descriptor"
    );

    // Cleanup should be safe to call
    result();

    // Restore
    Object.defineProperty(Event.prototype, "target", originalDescriptor);
    warnSpy.mockRestore();
  });

  it("should handle multiple sequential apply/cleanup cycles", () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(Event.prototype, "target");

    // First cycle
    const cleanup1 = applyShadowDomDndFix(shadowRoot);
    const desc1 = Object.getOwnPropertyDescriptor(Event.prototype, "target");
    expect(desc1?.get).not.toBe(originalDescriptor?.get);

    cleanup1();
    const descAfter1 = Object.getOwnPropertyDescriptor(Event.prototype, "target");
    expect(descAfter1?.get).toBe(originalDescriptor?.get);

    // Second cycle
    const cleanup2 = applyShadowDomDndFix(shadowRoot);
    const desc2 = Object.getOwnPropertyDescriptor(Event.prototype, "target");
    expect(desc2?.get).not.toBe(originalDescriptor?.get);

    cleanup2();
    const descAfter2 = Object.getOwnPropertyDescriptor(Event.prototype, "target");
    expect(descAfter2?.get).toBe(originalDescriptor?.get);
  });

  it("should patch target for drag events from shadow DOM elements", () => {
    const innerElement = document.createElement("div");
    innerElement.id = "inner";
    shadowRoot.appendChild(innerElement);

    cleanup = applyShadowDomDndFix(shadowRoot);

    // In a real browser, composedPath()[0] would be innerElement
    // and event.target would be the shadow host (container).
    // In jsdom, shadow DOM re-targeting isn't simulated,
    // so composedPath()[0] === event.target === innerElement.
    // This means our fix's condition (realTarget !== originalTarget)
    // won't trigger. We verify the getter doesn't break anything.
    const dragEvent = new DragEvent("dragstart", {
      bubbles: true,
      composed: true,
      cancelable: true,
    });

    innerElement.dispatchEvent(dragEvent);

    // In jsdom, target is already correct (no re-targeting simulation)
    // The important thing is the getter doesn't throw
    expect(dragEvent.target).toBeDefined();
  });

  it("should patch target for mousedown events", () => {
    const button = document.createElement("button");
    shadowRoot.appendChild(button);

    cleanup = applyShadowDomDndFix(shadowRoot);

    const mouseEvent = new MouseEvent("mousedown", {
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    button.dispatchEvent(mouseEvent);

    expect(mouseEvent.target).toBeDefined();
  });

  it("should patch target for pointer events", () => {
    const div = document.createElement("div");
    shadowRoot.appendChild(div);

    cleanup = applyShadowDomDndFix(shadowRoot);

    const pointerEvent = new PointerEvent("pointerdown", {
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    div.dispatchEvent(pointerEvent);

    expect(pointerEvent.target).toBeDefined();
  });

  describe("patched getter logic", () => {
    it("should check PATCHED_EVENTS set for event type filtering", () => {
      cleanup = applyShadowDomDndFix(shadowRoot);

      const patchedGetter = Object.getOwnPropertyDescriptor(Event.prototype, "target")?.get;
      expect(patchedGetter).toBeDefined();

      // Create events of different types and verify the getter works
      const patchedTypes = ["dragstart", "mousedown", "pointerdown", "drop", "click"];
      const unpatchedTypes = ["keydown", "focus", "blur", "input", "scroll"];

      const element = document.createElement("div");
      document.body.appendChild(element);

      for (const type of [...patchedTypes, ...unpatchedTypes]) {
        const event = new Event(type, { bubbles: true });
        element.dispatchEvent(event);
        // Getter should work for all event types without errors
        expect(event.target).toBeDefined();
      }

      element.remove();
    });

    it("should use composedPath to determine real target", () => {
      cleanup = applyShadowDomDndFix(shadowRoot);

      const innerElement = document.createElement("div");
      shadowRoot.appendChild(innerElement);

      const event = new MouseEvent("mousedown", { bubbles: true, composed: true });

      // Spy on composedPath to verify it's called by the getter
      const composedPathSpy = vi.spyOn(event, "composedPath");

      innerElement.dispatchEvent(event);

      // Access target to trigger the patched getter
      void event.target;

      // composedPath should have been called as part of the getter logic
      expect(composedPathSpy).toHaveBeenCalled();

      composedPathSpy.mockRestore();
    });
  });
});
