import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, waitFor, screen } from "@testing-library/react";
import { Provider, createStore, useAtomValue, useSetAtom } from "jotai";
import React, { useRef, useEffect, useState, memo } from "react";
import {
  templateEditorContentAtom,
  isTemplateTransitioningAtom,
  pendingAutoSaveAtom,
} from "../store";
import { isTemplateLoadingAtom } from "../../Providers/store";
import { SMS, type SMSRenderProps } from "./SMS/SMS";
import { Push, type PushRenderProps } from "./Push/Push";
import { Inbox, type InboxRenderProps } from "./Inbox/Inbox";
import type { ElementalContent } from "@/types/elemental.types";

/**
 * React Component Stability Tests
 *
 * These tests verify that channel components don't cause unnecessary
 * re-renders or component recreations when state changes.
 *
 * Key behaviors tested:
 * 1. EditorProvider should not be recreated on external content updates
 * 2. Content prop reference should remain stable after initial mount
 * 3. Component should handle rapid state changes without issues
 * 4. Proper cleanup on unmount
 */

// Helper functions to create channel content
const createSMSContent = (text: string): ElementalContent => ({
  version: "2022-01-01",
  elements: [{ type: "channel", channel: "sms", elements: [{ type: "text", content: text }] }],
});

const createPushContent = (title: string, body: string): ElementalContent => ({
  version: "2022-01-01",
  elements: [
    {
      type: "channel",
      channel: "push",
      elements: [{ type: "meta", title }, { type: "text", content: body }],
    },
  ],
});

const createInboxContent = (title: string, body: string): ElementalContent => ({
  version: "2022-01-01",
  elements: [
    {
      type: "channel",
      channel: "inbox",
      elements: [
        { type: "text", content: title, text_style: "h2" },
        { type: "text", content: body },
      ],
    },
  ],
});

// Mock dependencies
vi.mock("@/components/extensions/extension-kit", () => ({
  ExtensionKit: vi.fn(() => []),
}));

vi.mock("../../ui/MainLayout", () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="main-layout">{children}</div>
  ),
}));

vi.mock("./Channels", () => ({
  Channels: () => <div data-testid="channels">Channels</div>,
}));

vi.mock("sms-segments-calculator", () => ({
  SegmentedMessage: vi.fn().mockImplementation(() => ({ messageSize: 0, segmentsCount: 1 })),
}));

describe("React Component Stability Tests", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    store.set(isTemplateLoadingAtom, false);
    store.set(isTemplateTransitioningAtom, false);
    store.set(pendingAutoSaveAtom, null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("EditorProvider Mount Tracking", () => {
    /**
     * Simulates EditorProvider behavior - tracks mount/unmount cycles
     */
    const createMountTracker = () => {
      let mountCount = 0;
      let unmountCount = 0;
      let currentInstance = 0;

      const EditorProviderSimulator = memo(({ content }: { content: unknown }) => {
        const instanceRef = useRef(++currentInstance);

        useEffect(() => {
          mountCount++;
          return () => {
            unmountCount++;
          };
        }, []);

        return (
          <div data-testid="editor-instance" data-instance={instanceRef.current}>
            Instance {instanceRef.current}
          </div>
        );
      });

      return {
        EditorProviderSimulator,
        getMountCount: () => mountCount,
        getUnmountCount: () => unmountCount,
        getCurrentInstance: () => currentInstance,
        reset: () => {
          mountCount = 0;
          unmountCount = 0;
          currentInstance = 0;
        },
      };
    };

    it("SMS: EditorProvider should mount only once during external updates", async () => {
      store.set(templateEditorContentAtom, createSMSContent("Initial"));
      const tracker = createMountTracker();

      const renderFn = ({ content }: SMSRenderProps) => (
        <tracker.EditorProviderSimulator content={content} />
      );

      render(
        <Provider store={store}>
          <SMS routing={{ method: "single", channels: ["sms"] }} render={renderFn} />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("editor-instance")).toBeInTheDocument();
      });

      expect(tracker.getMountCount()).toBe(1);

      // Perform multiple external updates
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          store.set(templateEditorContentAtom, createSMSContent(`Update ${i}`));
        });
      }

      await waitFor(() => {}, { timeout: 500 });

      // EditorProvider should NOT have been recreated
      expect(tracker.getMountCount()).toBe(1);
      expect(tracker.getUnmountCount()).toBe(0);
    });

    it("Push: EditorProvider should mount only once during external updates", async () => {
      store.set(templateEditorContentAtom, createPushContent("Title", "Body"));
      const tracker = createMountTracker();

      const renderFn = ({ content }: PushRenderProps) => (
        <tracker.EditorProviderSimulator content={content} />
      );

      render(
        <Provider store={store}>
          <Push routing={{ method: "single", channels: ["push"] }} render={renderFn} />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("editor-instance")).toBeInTheDocument();
      });

      expect(tracker.getMountCount()).toBe(1);

      for (let i = 0; i < 5; i++) {
        await act(async () => {
          store.set(templateEditorContentAtom, createPushContent(`Title ${i}`, `Body ${i}`));
        });
      }

      await waitFor(() => {}, { timeout: 500 });

      expect(tracker.getMountCount()).toBe(1);
      expect(tracker.getUnmountCount()).toBe(0);
    });

    it("Inbox: EditorProvider should mount only once during external updates", async () => {
      store.set(templateEditorContentAtom, createInboxContent("Title", "Body"));
      const tracker = createMountTracker();

      const renderFn = ({ content }: InboxRenderProps) => (
        <tracker.EditorProviderSimulator content={content} />
      );

      render(
        <Provider store={store}>
          <Inbox routing={{ method: "single", channels: ["inbox"] }} render={renderFn} />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("editor-instance")).toBeInTheDocument();
      });

      expect(tracker.getMountCount()).toBe(1);

      for (let i = 0; i < 5; i++) {
        await act(async () => {
          store.set(templateEditorContentAtom, createInboxContent(`Title ${i}`, `Body ${i}`));
        });
      }

      await waitFor(() => {}, { timeout: 500 });

      expect(tracker.getMountCount()).toBe(1);
      expect(tracker.getUnmountCount()).toBe(0);
    });
  });

  describe("Content Reference Stability", () => {
    it("all channels should have stable content reference after mount", async () => {
      const results: Record<string, { changes: number; channel: string }> = {};

      const createTracker = (channel: string) => {
        let changeCount = 0;
        let prevContent: unknown = undefined;

        return {
          Tracker: ({ content }: { content: unknown }) => {
            useEffect(() => {
              if (prevContent !== undefined && prevContent !== content) {
                changeCount++;
              }
              prevContent = content;
            });
            return <div data-testid={`${channel}-tracker`}>Tracked</div>;
          },
          getChangeCount: () => changeCount,
        };
      };

      const smsTracker = createTracker("sms");
      const pushTracker = createTracker("push");
      const inboxTracker = createTracker("inbox");

      // Set initial content for all channels
      store.set(templateEditorContentAtom, {
        version: "2022-01-01",
        elements: [
          { type: "channel", channel: "sms", elements: [{ type: "text", content: "SMS" }] },
          {
            type: "channel",
            channel: "push",
            elements: [{ type: "meta", title: "Push" }, { type: "text", content: "Body" }],
          },
          {
            type: "channel",
            channel: "inbox",
            elements: [
              { type: "text", content: "Inbox", text_style: "h2" },
              { type: "text", content: "Body" },
            ],
          },
        ],
      });

      render(
        <Provider store={store}>
          <SMS
            routing={{ method: "single", channels: ["sms"] }}
            render={({ content }) => <smsTracker.Tracker content={content} />}
          />
          <Push
            routing={{ method: "single", channels: ["push"] }}
            render={({ content }) => <pushTracker.Tracker content={content} />}
          />
          <Inbox
            routing={{ method: "single", channels: ["inbox"] }}
            render={({ content }) => <inboxTracker.Tracker content={content} />}
          />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("sms-tracker")).toBeInTheDocument();
        expect(screen.getByTestId("push-tracker")).toBeInTheDocument();
        expect(screen.getByTestId("inbox-tracker")).toBeInTheDocument();
      });

      // Perform external updates
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          store.set(templateEditorContentAtom, {
            version: "2022-01-01",
            elements: [
              { type: "channel", channel: "sms", elements: [{ type: "text", content: `SMS ${i}` }] },
              {
                type: "channel",
                channel: "push",
                elements: [{ type: "meta", title: `Push ${i}` }, { type: "text", content: `Body ${i}` }],
              },
              {
                type: "channel",
                channel: "inbox",
                elements: [
                  { type: "text", content: `Inbox ${i}`, text_style: "h2" },
                  { type: "text", content: `Body ${i}` },
                ],
              },
            ],
          });
        });
      }

      await waitFor(() => {}, { timeout: 500 });

      // All channels should have 0 content reference changes
      expect(smsTracker.getChangeCount()).toBe(0);
      expect(pushTracker.getChangeCount()).toBe(0);
      expect(inboxTracker.getChangeCount()).toBe(0);
    });
  });

  describe("Rapid State Changes", () => {
    it("should handle rapid programmatic updates without errors", async () => {
      store.set(templateEditorContentAtom, createSMSContent("Initial"));
      const errors: Error[] = [];

      // Capture any errors
      const originalConsoleError = console.error;
      console.error = (...args) => {
        if (args[0] instanceof Error) {
          errors.push(args[0]);
        }
        originalConsoleError(...args);
      };

      render(
        <Provider store={store}>
          <SMS
            routing={{ method: "single", channels: ["sms"] }}
            render={({ content }) => <div data-testid="sms">{content ? "OK" : "Loading"}</div>}
          />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("sms")).toHaveTextContent("OK");
      });

      // Rapid fire updates
      await act(async () => {
        for (let i = 0; i < 20; i++) {
          store.set(templateEditorContentAtom, createSMSContent(`Rapid update ${i}`));
        }
      });

      await waitFor(() => {}, { timeout: 1000 });

      console.error = originalConsoleError;

      // Should not have thrown any errors
      expect(errors.length).toBe(0);

      // Component should still be functional
      expect(screen.getByTestId("sms")).toHaveTextContent("OK");
    });
  });

  describe("Loading State Transitions", () => {
    it("should properly transition from loading to loaded state", async () => {
      store.set(isTemplateLoadingAtom, true);
      store.set(templateEditorContentAtom, null);

      const stateHistory: string[] = [];

      const StateTracker = ({ content }: SMSRenderProps) => {
        const state = content ? "loaded" : "loading";
        useEffect(() => {
          stateHistory.push(state);
        }, [state]);
        return <div data-testid="state">{state}</div>;
      };

      render(
        <Provider store={store}>
          <SMS routing={{ method: "single", channels: ["sms"] }} render={StateTracker} />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("state")).toHaveTextContent("loading");
      });

      // Transition to loaded
      await act(async () => {
        store.set(templateEditorContentAtom, createSMSContent("Loaded content"));
        store.set(isTemplateLoadingAtom, false);
      });

      await waitFor(() => {
        expect(screen.getByTestId("state")).toHaveTextContent("loaded");
      });

      // State should transition cleanly without oscillation
      expect(stateHistory.filter((s) => s === "loading").length).toBeLessThanOrEqual(2);
      expect(stateHistory[stateHistory.length - 1]).toBe("loaded");
    });
  });

  describe("Unmount Cleanup", () => {
    it("should properly cleanup on unmount without errors", async () => {
      store.set(templateEditorContentAtom, createSMSContent("Content"));

      const cleanupCalled = { current: false };
      const errors: Error[] = [];

      const originalConsoleError = console.error;
      console.error = (...args) => {
        if (args[0] instanceof Error) {
          errors.push(args[0]);
        }
      };

      const CleanupTracker = ({ content }: SMSRenderProps) => {
        useEffect(() => {
          return () => {
            cleanupCalled.current = true;
          };
        }, []);
        return <div>Content</div>;
      };

      const { unmount } = render(
        <Provider store={store}>
          <SMS routing={{ method: "single", channels: ["sms"] }} render={CleanupTracker} />
        </Provider>
      );

      // Update state then immediately unmount
      await act(async () => {
        store.set(templateEditorContentAtom, createSMSContent("Updated"));
        unmount();
      });

      console.error = originalConsoleError;

      expect(cleanupCalled.current).toBe(true);
      expect(errors.length).toBe(0);
    });
  });
});
