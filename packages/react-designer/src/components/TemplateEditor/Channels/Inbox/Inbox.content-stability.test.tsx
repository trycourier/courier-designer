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
import { Inbox, type InboxRenderProps } from "./Inbox";
import type { ElementalContent } from "@/types/elemental.types";

/**
 * Tests for Inbox component content stability (Bug C-16410)
 *
 * The bug: When setTemplateEditorContent was called programmatically,
 * the Inbox component's content prop would change reference, causing
 * EditorProvider to be recreated and content to be lost.
 *
 * These tests verify that the content prop remains stable after
 * initial mount, even when templateEditorContent changes.
 */

// Helper to create Inbox channel content
const createInboxContent = (title: string, body: string): ElementalContent => ({
  version: "2022-01-01",
  elements: [
    {
      type: "channel",
      channel: "inbox",
      elements: [
        { type: "text", content: title, text_style: "h2" },
        { type: "text", content: body },
        { type: "action", content: "Click me", href: "", align: "left" },
      ],
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

describe("Inbox Content Stability (Bug C-16410)", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();

    // Set initial state
    store.set(isTemplateLoadingAtom, false);
    store.set(isTemplateTransitioningAtom, false);
    store.set(pendingAutoSaveAtom, null);
    store.set(templateEditorContentAtom, createInboxContent("Initial Title", "Initial body"));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("BUG TEST: content prop should NOT change when templateEditorContent updates externally", async () => {
    // Track content reference changes
    let contentChangeCount = 0;
    let initialContentRef: unknown = null;

    const ContentTracker = ({
      content,
      extensions,
      editable,
      autofocus,
      onUpdate,
    }: InboxRenderProps) => {
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

    render(
      <Provider store={store}>
        <Inbox
          routing={{ method: "single", channels: ["inbox"] }}
          render={ContentTracker}
        />
      </Provider>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId("content-tracker")).toHaveTextContent("has-content");
    });

    const initialChangeCount = contentChangeCount;

    // Simulate external programmatic update to templateEditorContent
    await act(async () => {
      store.set(templateEditorContentAtom, createInboxContent("EXTERNAL Title 1", "External body 1"));
    });

    await waitFor(() => {}, { timeout: 500 });

    // Another external update
    await act(async () => {
      store.set(templateEditorContentAtom, createInboxContent("EXTERNAL Title 2", "External body 2"));
    });

    await waitFor(() => {}, { timeout: 500 });

    console.log(`Content change count after external updates: ${contentChangeCount - initialChangeCount}`);

    // This assertion will FAIL with the buggy code and PASS with the fix
    expect(contentChangeCount - initialChangeCount).toBe(0);
  });

  it("BUG TEST: EditorProvider should not be recreated on external content updates", async () => {
    let editorProviderRecreateCount = 0;
    let lastSeenContent: unknown = null;

    const EditorProviderSimulator = ({
      content,
      extensions,
      editable,
      autofocus,
      onUpdate,
    }: InboxRenderProps) => {
      useEffect(() => {
        if (lastSeenContent !== null && lastSeenContent !== content) {
          editorProviderRecreateCount++;
        }
        lastSeenContent = content;
      }, [content]);

      return <div data-testid="editor-simulator">Editor</div>;
    };

    render(
      <Provider store={store}>
        <Inbox
          routing={{ method: "single", channels: ["inbox"] }}
          render={EditorProviderSimulator}
        />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("editor-simulator")).toBeInTheDocument();
    });

    // Simulate rapid external updates
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        store.set(templateEditorContentAtom, createInboxContent(`Title ${i}`, `Body ${i}`));
      });
    }

    await waitFor(() => {}, { timeout: 500 });

    console.log(`EditorProvider recreate count: ${editorProviderRecreateCount}`);

    // With the fix, EditorProvider should NOT be recreated
    expect(editorProviderRecreateCount).toBe(0);
  });

  it("content should still update when isTemplateLoading changes", async () => {
    store.set(isTemplateLoadingAtom, true);
    store.set(templateEditorContentAtom, null);

    let contentWasSet = false;

    const LoadingTracker = ({
      content,
      extensions,
      editable,
      autofocus,
      onUpdate,
    }: InboxRenderProps) => {
      useEffect(() => {
        if (content !== null) {
          contentWasSet = true;
        }
      }, [content]);

      return <div data-testid="loading-tracker">{content ? "loaded" : "loading"}</div>;
    };

    render(
      <Provider store={store}>
        <Inbox
          routing={{ method: "single", channels: ["inbox"] }}
          render={LoadingTracker}
        />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading-tracker")).toHaveTextContent("loading");
    });

    await act(async () => {
      store.set(templateEditorContentAtom, createInboxContent("Loaded Title", "Loaded body"));
      store.set(isTemplateLoadingAtom, false);
    });

    await waitFor(() => {
      expect(screen.getByTestId("loading-tracker")).toHaveTextContent("loaded");
    });

    expect(contentWasSet).toBe(true);
  });
});
