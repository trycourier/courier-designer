import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, waitFor, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import React, { useRef, useEffect } from "react";
import {
  templateEditorContentAtom,
  isTemplateTransitioningAtom,
  pendingAutoSaveAtom,
} from "../../store";
import { isTemplateLoadingAtom } from "../../../Providers/store";
import { SMS, type SMSRenderProps } from "./SMS";
import type { ElementalContent } from "@/types/elemental.types";

/**
 * Tests for SMS component content stability (Bug C-16410)
 *
 * The bug: When setTemplateEditorContent was called programmatically,
 * the SMS component's content prop would change reference, causing
 * EditorProvider to be recreated and content to be lost.
 *
 * These tests verify that the content prop remains stable after
 * initial mount, even when templateEditorContent changes.
 */

// Helper to create SMS channel content
const createSMSContent = (text: string): ElementalContent => ({
  version: "2022-01-01",
  elements: [
    {
      type: "channel",
      channel: "sms",
      elements: [{ type: "text", content: text }],
    },
  ],
});

// Mock the extension kit
vi.mock("@/components/extensions/extension-kit", () => ({
  ExtensionKit: vi.fn(() => []),
}));

// Mock the MainLayout
vi.mock("../../../ui/MainLayout", () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="main-layout">{children}</div>
  ),
}));

// Mock the Channels component
vi.mock("../Channels", () => ({
  Channels: () => <div data-testid="channels">Channels</div>,
}));

// Mock sms-segments-calculator
vi.mock("sms-segments-calculator", () => ({
  SegmentedMessage: vi.fn().mockImplementation(() => ({
    messageSize: 0,
    segmentsCount: 1,
  })),
}));

describe("SMS Content Stability (Bug C-16410)", () => {
  let store: ReturnType<typeof createStore>;
  let contentRenderCount: number;
  let lastContentRef: unknown;

  beforeEach(() => {
    store = createStore();
    contentRenderCount = 0;
    lastContentRef = null;

    // Set initial state
    store.set(isTemplateLoadingAtom, false);
    store.set(isTemplateTransitioningAtom, false);
    store.set(pendingAutoSaveAtom, null);
    store.set(templateEditorContentAtom, createSMSContent("Initial content"));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Custom render function that tracks content prop changes
   * This simulates what EditorProvider would see
   */
  const TrackingRender = ({
    content,
    extensions,
    editable,
    autofocus,
    onUpdate,
  }: SMSRenderProps) => {
    const renderCountRef = useRef(0);
    const prevContentRef = useRef(content);

    useEffect(() => {
      renderCountRef.current += 1;
      contentRenderCount = renderCountRef.current;

      // Track if content reference changed
      if (prevContentRef.current !== content) {
        lastContentRef = content;
      }
      prevContentRef.current = content;
    });

    return (
      <div data-testid="tracking-render">
        <span data-testid="render-count">{renderCountRef.current}</span>
        <span data-testid="content-present">{content ? "yes" : "no"}</span>
      </div>
    );
  };

  it("BUG TEST: content prop should NOT change when templateEditorContent updates externally", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    // Track content reference changes
    let contentChangeCount = 0;
    let initialContentRef: unknown = null;

    const ContentTracker = ({
      content,
      extensions,
      editable,
      autofocus,
      onUpdate,
    }: SMSRenderProps) => {
      const prevContentRef = useRef<unknown>(undefined);

      useEffect(() => {
        if (prevContentRef.current === undefined) {
          // First render - store initial content reference
          initialContentRef = content;
          prevContentRef.current = content;
        } else if (prevContentRef.current !== content) {
          // Content reference changed!
          contentChangeCount++;
          prevContentRef.current = content;
        }
      });

      return <div data-testid="content-tracker">{content ? "has-content" : "no-content"}</div>;
    };

    const { rerender } = render(
      <Provider store={store}>
        <SMS routing={{ method: "single", channels: ["sms"] }} render={ContentTracker} />
      </Provider>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId("content-tracker")).toHaveTextContent("has-content");
    });

    const initialChangeCount = contentChangeCount;

    // Simulate external programmatic update to templateEditorContent
    // This is what the customer's code does
    await act(async () => {
      store.set(templateEditorContentAtom, createSMSContent("EXTERNAL UPDATE 1"));
    });

    // Wait for any effects to run
    await waitFor(
      () => {
        // Give time for effects to process
      },
      { timeout: 500 }
    );

    // Another external update
    await act(async () => {
      store.set(templateEditorContentAtom, createSMSContent("EXTERNAL UPDATE 2"));
    });

    await waitFor(() => {}, { timeout: 500 });

    /**
     * THE BUG:
     * With the old (buggy) code, contentChangeCount would be > 0 because
     * the content useMemo depends on templateEditorContent, causing the
     * content prop reference to change on every external update.
     *
     * With the fix, contentChangeCount should stay at 0 (or only change
     * for legitimate reasons like isTemplateLoading changes).
     */
    console.log(
      `Content change count after external updates: ${contentChangeCount - initialChangeCount}`
    );

    // This assertion will FAIL with the buggy code and PASS with the fix
    // The content reference should NOT change just because templateEditorContent changed
    expect(contentChangeCount - initialChangeCount).toBe(0);
  });

  it("BUG TEST: EditorProvider should not be recreated on external content updates", async () => {
    // Track how many times the render function is called with a NEW content reference
    let editorProviderRecreateCount = 0;
    let lastSeenContent: unknown = null;

    const EditorProviderSimulator = ({
      content,
      extensions,
      editable,
      autofocus,
      onUpdate,
    }: SMSRenderProps) => {
      useEffect(() => {
        // In real EditorProvider, a new content prop causes recreation
        if (lastSeenContent !== null && lastSeenContent !== content) {
          editorProviderRecreateCount++;
        }
        lastSeenContent = content;
      }, [content]);

      return <div data-testid="editor-simulator">Editor</div>;
    };

    render(
      <Provider store={store}>
        <SMS routing={{ method: "single", channels: ["sms"] }} render={EditorProviderSimulator} />
      </Provider>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId("editor-simulator")).toBeInTheDocument();
    });

    // Simulate rapid external updates (like customer's integration)
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        store.set(templateEditorContentAtom, createSMSContent(`External update ${i}`));
      });
    }

    // Wait for effects
    await waitFor(() => {}, { timeout: 500 });

    console.log(`EditorProvider recreate count: ${editorProviderRecreateCount}`);

    /**
     * THE BUG:
     * With buggy code, editorProviderRecreateCount would be 5 (one for each update)
     * because the content prop reference changes every time templateEditorContent changes.
     *
     * With the fix, editorProviderRecreateCount should be 0 because content is stable.
     */
    expect(editorProviderRecreateCount).toBe(0);
  });

  it("content should still update when isTemplateLoading changes", async () => {
    // This tests that legitimate content updates (like initial load) still work

    // Start with loading = true
    store.set(isTemplateLoadingAtom, true);
    store.set(templateEditorContentAtom, null);

    let contentWasSet = false;

    const LoadingTracker = ({
      content,
      extensions,
      editable,
      autofocus,
      onUpdate,
    }: SMSRenderProps) => {
      useEffect(() => {
        if (content !== null) {
          contentWasSet = true;
        }
      }, [content]);

      return <div data-testid="loading-tracker">{content ? "loaded" : "loading"}</div>;
    };

    render(
      <Provider store={store}>
        <SMS routing={{ method: "single", channels: ["sms"] }} render={LoadingTracker} />
      </Provider>
    );

    // Initially should be loading (no content)
    await waitFor(() => {
      expect(screen.getByTestId("loading-tracker")).toHaveTextContent("loading");
    });

    // Set content and complete loading
    await act(async () => {
      store.set(templateEditorContentAtom, createSMSContent("Loaded content"));
      store.set(isTemplateLoadingAtom, false);
    });

    // Now content should be set
    await waitFor(() => {
      expect(screen.getByTestId("loading-tracker")).toHaveTextContent("loaded");
    });

    expect(contentWasSet).toBe(true);
  });
});

/**
 * Tests for read-only version preview (C-19931)
 *
 * The counterpart to C-16410 above. Freezing the content memo fixed editing,
 * but it also froze the read-only canvas: the template editor's version-history
 * panel swaps the `value` prop to the selected saved version, and SMS threw it
 * away, so the preview kept showing whichever version loaded first.
 *
 * While read-only nothing is being typed, so re-deriving is safe — and it is the
 * only path by which the selection reaches the canvas.
 */
describe("SMS read-only version preview (C-19931)", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    store.set(isTemplateLoadingAtom, false);
    store.set(isTemplateTransitioningAtom, false);
    store.set(pendingAutoSaveAtom, null);
    store.set(templateEditorContentAtom, createSMSContent("Draft content"));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /** Renders the SMS text the canvas would show, so we assert content not identity. */
  const ContentText = ({ content }: SMSRenderProps) => (
    <div data-testid="content-text">{JSON.stringify(content)}</div>
  );

  it("shows the newly selected version when `value` changes while read-only", async () => {
    const { rerender } = render(
      <Provider store={store}>
        <SMS
          readOnly
          value={createSMSContent("VERSION ONE")}
          routing={{ method: "single", channels: ["sms"] }}
          render={ContentText}
        />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("content-text")).toHaveTextContent("VERSION ONE");
    });

    // The user clicks a different version in the history panel.
    rerender(
      <Provider store={store}>
        <SMS
          readOnly
          value={createSMSContent("VERSION TWO")}
          routing={{ method: "single", channels: ["sms"] }}
          render={ContentText}
        />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("content-text")).toHaveTextContent("VERSION TWO");
    });
  });

  it("still freezes content when `value` changes while editable (keeps C-16410 fixed)", async () => {
    const { rerender } = render(
      <Provider store={store}>
        <SMS
          value={createSMSContent("VERSION ONE")}
          routing={{ method: "single", channels: ["sms"] }}
          render={ContentText}
        />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("content-text")).toHaveTextContent("VERSION ONE");
    });

    rerender(
      <Provider store={store}>
        <SMS
          value={createSMSContent("VERSION TWO")}
          routing={{ method: "single", channels: ["sms"] }}
          render={ContentText}
        />
      </Provider>
    );

    // Editing must not be interrupted by a re-derive.
    await waitFor(() => {
      expect(screen.getByTestId("content-text")).toHaveTextContent("VERSION ONE");
    });
    expect(screen.getByTestId("content-text")).not.toHaveTextContent("VERSION TWO");
  });
  it("re-derives from templateEditorContent when read-only and no `value` is passed", async () => {
    // Guards the wiring, not just the memo: a host that drives the canvas
    // through the atom rather than the `value` prop must still see the
    // selected version. Keying only off `value` made this silently inert.
    const { rerender } = render(
      <Provider store={store}>
        <SMS readOnly routing={{ method: "single", channels: ["sms"] }} render={ContentText} />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("content-text")).toHaveTextContent("Draft content");
    });

    await act(async () => {
      store.set(templateEditorContentAtom, createSMSContent("VERSION TWO"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("content-text")).toHaveTextContent("VERSION TWO");
    });
  });
});
