/**
 * Shadow DOM Drag-and-Drop Fix for pragmatic-drag-and-drop
 *
 * This utility fixes the known incompatibility between pragmatic-drag-and-drop
 * and Shadow DOM. The library uses `event.target` to look up draggable elements
 * in a registry, but Shadow DOM re-targets events to the shadow host when they
 * cross the shadow boundary, breaking the registry lookup.
 *
 * Solution: Monkey-patch `Event.prototype.target` to return the actual element
 * from `composedPath()[0]` for drag events originating from the shadow DOM.
 *
 * **Known Limitation**: The `dragHandle` option in pragmatic-drag-and-drop does
 * not work correctly with this fix. Elements will be draggable from anywhere,
 * not just from the designated drag handle. This is due to how pragmatic-drag-and-drop
 * internally validates handle interactions.
 *
 * @see https://github.com/atlassian/pragmatic-drag-and-drop/issues/15
 * @see https://github.com/atlassian/pragmatic-drag-and-drop/issues/116
 */

const PATCHED_EVENTS = new Set([
  // Drag events
  "dragstart",
  "drag",
  "dragend",
  "dragenter",
  "dragleave",
  "dragover",
  "drop",
  // Mouse events (needed for drag detection)
  "mousedown",
  "mouseup",
  "mousemove",
  "click",
  // Pointer events (needed for drag detection)
  "pointerdown",
  "pointerup",
  "pointermove",
  "pointercancel",
]);

/**
 * Applies a fix for drag-and-drop events inside a Shadow DOM.
 *
 * This function monkey-patches `Event.prototype.target` to return the actual
 * element from `composedPath()[0]` for drag and pointer events that originate
 * from within the specified shadow root.
 *
 * **Important**: This is a global patch that affects all drag events while active.
 * Call the returned cleanup function when the shadow DOM is unmounted.
 *
 * **Known Limitation**: Drag handles (`dragHandle` option) do not work correctly
 * with this fix. Elements will be draggable from anywhere on the element.
 *
 * @param shadowRoot - The shadow root to apply the fix to
 * @returns A cleanup function to restore the original behavior
 *
 * @example
 * ```tsx
 * useEffect(() => {
 *   const shadowRoot = containerRef.current?.shadowRoot;
 *   if (shadowRoot) {
 *     const cleanup = applyShadowDomDndFix(shadowRoot);
 *     return cleanup;
 *   }
 * }, []);
 * ```
 */
export function applyShadowDomDndFix(shadowRoot: ShadowRoot): () => void {
  // Store original target descriptor
  const originalTargetDescriptor = Object.getOwnPropertyDescriptor(Event.prototype, "target");
  if (!originalTargetDescriptor) {
    console.warn("[ShadowDomDndFix] Could not get Event.prototype.target descriptor");
    return () => {};
  }

  // Create patched target getter
  const patchedTargetDescriptor: PropertyDescriptor = {
    ...originalTargetDescriptor,
    get: function (this: Event) {
      // Only patch relevant events
      if (!PATCHED_EVENTS.has(this.type)) {
        return originalTargetDescriptor.get?.call(this);
      }

      // Get the original target
      const originalTarget = originalTargetDescriptor.get?.call(this);

      // Get real target from composed path
      const path = this.composedPath();
      const realTarget = path[0] as Element;

      // Check if this event came from our shadow root
      if (realTarget && realTarget !== originalTarget && shadowRoot.contains(realTarget)) {
        return realTarget;
      }

      return originalTarget;
    },
  };

  // Apply the patch
  Object.defineProperty(Event.prototype, "target", patchedTargetDescriptor);

  // Cleanup function
  return () => {
    if (originalTargetDescriptor) {
      Object.defineProperty(Event.prototype, "target", originalTargetDescriptor);
    }
  };
}
