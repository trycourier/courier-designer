import { TemplateEditor, TemplateProvider } from "@trycourier/react-designer";
import { useRef, useCallback, useState } from "react";
import { createRoot, Root } from "react-dom/client";
import { useOutletContext } from "react-router-dom";
import { LayoutContext } from "./Layout";

/**
 * Shadow DOM Drag-and-Drop Fix for pragmatic-drag-and-drop
 * 
 * This fixes the known incompatibility between pragmatic-drag-and-drop and Shadow DOM.
 * The library uses event.target to look up draggable elements in a registry,
 * but Shadow DOM re-targets events to the shadow host, breaking the lookup.
 * 
 * This fix monkey-patches Event.prototype to make 'target' return the real
 * element from composedPath() for drag events originating from shadow DOM.
 * 
 * @see https://github.com/atlassian/pragmatic-drag-and-drop/issues/15
 */
const PATCHED_EVENTS = new Set([
  // Drag events
  "dragstart", "drag", "dragend", "dragenter", "dragleave", "dragover", "drop",
  // Mouse events (needed for drag handle detection)
  "mousedown", "mouseup", "mousemove", "click",
  // Pointer events (needed for drag handle detection)
  "pointerdown", "pointerup", "pointermove", "pointercancel",
]);

function applyShadowDomDndFix(shadowRoot: ShadowRoot): () => void {
  // Store original target descriptor
  const originalTargetDescriptor = Object.getOwnPropertyDescriptor(Event.prototype, 'target');
  if (!originalTargetDescriptor) {
    console.warn('Could not get Event.prototype.target descriptor');
    return () => {};
  }

  // Create patched target getter
  const patchedTargetDescriptor: PropertyDescriptor = {
    ...originalTargetDescriptor,
    get: function(this: Event) {
      // Only patch relevant events (drag + mouse/pointer for handle detection)
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
    }
  };

  // Apply the patch
  Object.defineProperty(Event.prototype, 'target', patchedTargetDescriptor);

  // Cleanup function
  return () => {
    if (originalTargetDescriptor) {
      Object.defineProperty(Event.prototype, 'target', originalTargetDescriptor);
    }
  };
}

/**
 * ShadowDOM TemplateEditor demo to reproduce drag-and-drop issues.
 *
 * This page renders the editor inside a Shadow DOM to test compatibility
 * with shadow root event handling (known issue with pragmatic-drag-and-drop).
 *
 * Issue: Events are re-targeted to the shadow host, breaking DnD functionality.
 * See: https://github.com/atlassian/pragmatic-drag-and-drop/issues/15
 */
export function ShadowDomPage() {
  const { templateId, tenantId } = useOutletContext<LayoutContext>();
  const reactRootRef = useRef<Root | null>(null);
  const mountedRef = useRef(false);
  const dndFixCleanupRef = useRef<(() => void) | null>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);
  const [dndFixEnabled, setDndFixEnabled] = useState(false);
  const [key, setKey] = useState(0); // Force remount when toggling

  const setupShadowDom = useCallback((container: HTMLDivElement | null) => {
    if (!container) {
      // Cleanup when ref becomes null (unmount)
      if (reactRootRef.current) {
        // Use setTimeout to avoid synchronous unmount during render
        const rootToUnmount = reactRootRef.current;
        reactRootRef.current = null;
        setTimeout(() => {
          rootToUnmount.unmount();
        }, 0);
      }
      if (dndFixCleanupRef.current) {
        dndFixCleanupRef.current();
        dndFixCleanupRef.current = null;
      }
      shadowRootRef.current = null;
      mountedRef.current = false;
      return;
    }

    // Avoid double-setup in Strict Mode
    if (mountedRef.current) return;
    mountedRef.current = true;

    // Check if shadow root already exists (from previous mount in Strict Mode)
    let shadowRoot = container.shadowRoot;
    if (!shadowRoot) {
      shadowRoot = container.attachShadow({ mode: "open" });
    }
    shadowRootRef.current = shadowRoot;

    // Clear shadow root content
    shadowRoot.innerHTML = "";

    // Apply the DnD fix if enabled
    if (dndFixEnabled) {
      dndFixCleanupRef.current = applyShadowDomDndFix(shadowRoot);
    }

    // Create a container for React inside the shadow root
    const reactContainer = document.createElement("div");
    reactContainer.id = "shadow-react-root";
    reactContainer.style.height = "100%";
    shadowRoot.appendChild(reactContainer);

    // Inject styles into shadow root
    injectStyles(shadowRoot);

    // Create React root inside shadow DOM
    reactRootRef.current = createRoot(reactContainer);

    // Render the editor
    reactRootRef.current.render(
      <TemplateProvider
        templateId={templateId}
        tenantId={tenantId}
        token={import.meta.env.VITE_JWT_TOKEN || "test-token"}
        apiUrl={import.meta.env.VITE_API_URL || "https://api.courier.com/client/q"}
      >
        <TemplateEditor
          routing={{
            method: "single",
            channels: ["email", "sms", "push", "inbox", "slack", "msteams"],
          }}
        />
      </TemplateProvider>
    );
  }, [templateId, tenantId, dndFixEnabled]);

  const handleToggleFix = () => {
    setDndFixEnabled((prev) => !prev);
    // Force remount by changing the key
    setKey((prev) => prev + 1);
  };

  return (
    <div style={{ padding: "0 20px 20px 20px" }}>
      <div
        style={{
          padding: "12px 16px",
          marginBottom: "16px",
          backgroundColor: dndFixEnabled ? "#d4edda" : "#fff3cd",
          border: `1px solid ${dndFixEnabled ? "#28a745" : "#ffc107"}`,
          borderRadius: "6px",
          color: dndFixEnabled ? "#155724" : "#856404",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>Shadow DOM Test:</strong> This page renders the editor inside a Shadow DOM
            to test drag-and-drop compatibility.
            {!dndFixEnabled && " Try dragging blocks - they should fail to drop."}
            {dndFixEnabled && " The DnD fix is enabled - dragging should work now."}
          </div>
          <button
            onClick={handleToggleFix}
            style={{
              padding: "8px 16px",
              backgroundColor: dndFixEnabled ? "#dc3545" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: 500,
              whiteSpace: "nowrap",
              marginLeft: "16px",
            }}
          >
            {dndFixEnabled ? "Disable Fix" : "Enable Fix"}
          </button>
        </div>
      </div>

      {/* Shadow DOM container */}
      <div
        key={key}
        ref={setupShadowDom}
        style={{
          height: "calc(100vh - 250px)",
          border: `2px dashed ${dndFixEnabled ? "#28a745" : "#6c757d"}`,
          borderRadius: "8px",
          position: "relative",
        }}
      />
    </div>
  );
}

/**
 * Inject required styles into the shadow root.
 * This includes the react-designer styles and any reset styles needed.
 */
function injectStyles(shadowRoot: ShadowRoot) {
  // Create a style element for reset/base styles
  const resetStyle = document.createElement("style");
  resetStyle.textContent = `
    *, *::before, *::after {
      box-sizing: border-box;
    }
    
    :host {
      all: initial;
      display: block;
      height: 100%;
    }
  `;
  shadowRoot.appendChild(resetStyle);

  // Find and clone the react-designer stylesheet from the main document
  const designerStylesheet = Array.from(document.styleSheets).find((sheet) => {
    try {
      // Check if this is the react-designer stylesheet
      return sheet.href?.includes("react-designer") || 
             (sheet.ownerNode as HTMLElement)?.dataset?.viteDevId?.includes("react-designer");
    } catch {
      return false;
    }
  });

  if (designerStylesheet?.ownerNode) {
    const clonedStyle = (designerStylesheet.ownerNode as HTMLElement).cloneNode(true);
    shadowRoot.appendChild(clonedStyle);
  }

  // Also copy all style tags that might contain Vite-injected styles
  document.querySelectorAll('style[data-vite-dev-id]').forEach((style) => {
    const clonedStyle = style.cloneNode(true);
    shadowRoot.appendChild(clonedStyle);
  });

  // Copy link tags for stylesheets
  document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    const clonedLink = link.cloneNode(true);
    shadowRoot.appendChild(clonedLink);
  });
}
