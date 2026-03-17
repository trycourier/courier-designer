import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { useEmailBackgroundColors } from "./useEmailBackgroundColors";
import {
  templateEditorContentAtom,
  emailBackgroundColorAtom,
  emailContentBackgroundColorAtom,
  pendingAutoSaveAtom,
  EMAIL_DEFAULT_BACKGROUND_COLOR,
  EMAIL_DEFAULT_CONTENT_BACKGROUND_COLOR,
} from "../store";
import type { ElementalContent } from "@/types/elemental.types";
import type { ReactNode } from "react";

function makeEmailContent(overrides: Record<string, string> = {}): ElementalContent {
  return {
    version: "2022-01-01",
    elements: [
      {
        type: "channel",
        channel: "email",
        ...overrides,
        elements: [{ type: "text", content: "hello" }],
      },
    ],
  };
}

describe("useEmailBackgroundColors", () => {
  let store: ReturnType<typeof createStore>;
  let wrapper: ({ children }: { children: ReactNode }) => ReactNode;

  beforeEach(() => {
    store = createStore();
    wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
  });

  describe("initial sync from content", () => {
    it("syncs color atoms on first render when content has colors", () => {
      const content = makeEmailContent({
        background_color: "#ff0000",
        content_background_color: "#00ff00",
      });
      store.set(templateEditorContentAtom, content);

      renderHook(() => useEmailBackgroundColors(), { wrapper });

      expect(store.get(emailBackgroundColorAtom)).toBe("#ff0000");
      expect(store.get(emailContentBackgroundColorAtom)).toBe("#00ff00");
    });

    it("uses defaults when content has no colors set", () => {
      const content = makeEmailContent();
      store.set(templateEditorContentAtom, content);

      renderHook(() => useEmailBackgroundColors(), { wrapper });

      expect(store.get(emailBackgroundColorAtom)).toBe(EMAIL_DEFAULT_BACKGROUND_COLOR);
      expect(store.get(emailContentBackgroundColorAtom)).toBe(EMAIL_DEFAULT_CONTENT_BACKGROUND_COLOR);
    });

    it("does NOT re-sync when content changes after initial load", () => {
      const content = makeEmailContent({ background_color: "#ff0000" });
      store.set(templateEditorContentAtom, content);

      const { rerender } = renderHook(() => useEmailBackgroundColors(), { wrapper });

      expect(store.get(emailBackgroundColorAtom)).toBe("#ff0000");

      // Simulate a content edit (keystroke) that does NOT change the color
      const updated = makeEmailContent({ background_color: "#0000ff" });
      act(() => {
        store.set(templateEditorContentAtom, updated);
      });
      rerender();

      // Should still be #ff0000 because initial sync already ran
      expect(store.get(emailBackgroundColorAtom)).toBe("#ff0000");
    });

    it("re-syncs after template transition", () => {
      const content = makeEmailContent({ background_color: "#ff0000" });
      store.set(templateEditorContentAtom, content);

      let transitioning = false;
      const { rerender } = renderHook(
        () => useEmailBackgroundColors({ isTemplateTransitioning: transitioning }),
        { wrapper }
      );

      expect(store.get(emailBackgroundColorAtom)).toBe("#ff0000");

      // Signal transition
      transitioning = true;
      rerender();

      // New content arrives after transition
      transitioning = false;
      const newContent = makeEmailContent({ background_color: "#00ff00" });
      act(() => {
        store.set(templateEditorContentAtom, newContent);
      });
      rerender();

      expect(store.get(emailBackgroundColorAtom)).toBe("#00ff00");
    });
  });

  describe("handleEmailColorChange", () => {
    it("updates background_color atom and content", () => {
      const content = makeEmailContent();
      store.set(templateEditorContentAtom, content);

      const { result } = renderHook(() => useEmailBackgroundColors(), { wrapper });

      act(() => {
        result.current.handleEmailColorChange("background_color", "#aabbcc");
      });

      expect(store.get(emailBackgroundColorAtom)).toBe("#aabbcc");
      const updated = store.get(templateEditorContentAtom);
      const emailCh = updated?.elements?.find(
        (el: any) => el.type === "channel" && el.channel === "email"
      );
      expect(emailCh?.background_color).toBe("#aabbcc");
    });

    it("updates content_background_color atom and content", () => {
      const content = makeEmailContent();
      store.set(templateEditorContentAtom, content);

      const { result } = renderHook(() => useEmailBackgroundColors(), { wrapper });

      act(() => {
        result.current.handleEmailColorChange("content_background_color", "#112233");
      });

      expect(store.get(emailContentBackgroundColorAtom)).toBe("#112233");
      const updated = store.get(templateEditorContentAtom);
      const emailCh = updated?.elements?.find(
        (el: any) => el.type === "channel" && el.channel === "email"
      );
      expect(emailCh?.content_background_color).toBe("#112233");
    });

    it("triggers pendingAutoSave", () => {
      const content = makeEmailContent();
      store.set(templateEditorContentAtom, content);

      const { result } = renderHook(() => useEmailBackgroundColors(), { wrapper });

      act(() => {
        result.current.handleEmailColorChange("background_color", "#aabbcc");
      });

      const pending = store.get(pendingAutoSaveAtom);
      expect(pending).not.toBeNull();
    });

    it("handles rapid successive calls without losing changes (stale closure fix)", () => {
      const content = makeEmailContent();
      store.set(templateEditorContentAtom, content);

      const { result } = renderHook(() => useEmailBackgroundColors(), { wrapper });

      act(() => {
        result.current.handleEmailColorChange("background_color", "#aaaaaa");
        result.current.handleEmailColorChange("content_background_color", "#bbbbbb");
      });

      const updated = store.get(templateEditorContentAtom);
      const emailCh = updated?.elements?.find(
        (el: any) => el.type === "channel" && el.channel === "email"
      );

      expect(emailCh?.background_color).toBe("#aaaaaa");
      expect(emailCh?.content_background_color).toBe("#bbbbbb");
      expect(store.get(emailBackgroundColorAtom)).toBe("#aaaaaa");
      expect(store.get(emailContentBackgroundColorAtom)).toBe("#bbbbbb");
    });

    it("is a no-op when content is null", () => {
      store.set(templateEditorContentAtom, null);

      const { result } = renderHook(() => useEmailBackgroundColors(), { wrapper });

      act(() => {
        result.current.handleEmailColorChange("background_color", "#aabbcc");
      });

      // Atom should still be updated even if content is null
      expect(store.get(emailBackgroundColorAtom)).toBe("#aabbcc");
      // But content should remain null
      expect(store.get(templateEditorContentAtom)).toBeNull();
    });
  });
});
