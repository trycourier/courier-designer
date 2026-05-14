import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Provider, createStore } from "jotai";
import { createElement } from "react";
import { templateEditorContentAtom } from "@/components/TemplateEditor/store";
import { useLocalization } from "./useLocalization";
import type { ElementalContent } from "@/types";

function makeEmailContent(text: string, locales?: Record<string, { content: string }>): ElementalContent {
  return {
    version: "2022-01-01",
    elements: [
      {
        type: "channel",
        channel: "email",
        elements: [{ type: "text", content: text, ...(locales ? { locales } : {}) }],
      },
    ],
  };
}

function renderWithStore(content: ElementalContent | null, onSave: (c: ElementalContent) => Promise<void>) {
  const store = createStore();
  store.set(templateEditorContentAtom, content);

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(Provider, { store }, children);

  const hook = renderHook(() => useLocalization({ onSave, debounceMs: 100 }), { wrapper });
  return { ...hook, store };
}

describe("useLocalization", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("extracts translatable fields from atom content", () => {
    const content = makeEmailContent("Hello");
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { result } = renderWithStore(content, onSave);

    expect(result.current.fields).toHaveLength(1);
    expect(result.current.fields[0]).toMatchObject({
      id: "email.0.content",
      content: "Hello",
    });
  });

  it("returns empty fields when content is null", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderWithStore(null, onSave);

    expect(result.current.fields).toEqual([]);
  });

  it("setTranslation updates the content atom with the new locale", () => {
    const content = makeEmailContent("Hello");
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { result, store } = renderWithStore(content, onSave);

    act(() => {
      result.current.setTranslation("email.0.content", "fr", "Bonjour");
    });

    const updated = store.get(templateEditorContentAtom)!;
    const node = (updated.elements[0] as { elements: Array<Record<string, unknown>> }).elements[0];
    expect(node.locales).toEqual({ fr: { content: "Bonjour" } });
  });

  it("fields update reactively after setTranslation", () => {
    const content = makeEmailContent("Hello");
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { result } = renderWithStore(content, onSave);

    act(() => {
      result.current.setTranslation("email.0.content", "fr", "Bonjour");
    });

    expect(result.current.fields[0].locales).toEqual({ fr: "Bonjour" });
  });

  it("triggers auto-save after setTranslation", async () => {
    const content = makeEmailContent("Hello");
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { result } = renderWithStore(content, onSave);

    act(() => {
      result.current.setTranslation("email.0.content", "fr", "Bonjour");
    });

    await act(async () => {
      vi.advanceTimersByTime(200);
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedContent = onSave.mock.calls[0][0] as ElementalContent;
    const savedNode = (savedContent.elements[0] as { elements: Array<Record<string, unknown>> }).elements[0];
    expect(savedNode.locales).toEqual({ fr: { content: "Bonjour" } });
  });
});
