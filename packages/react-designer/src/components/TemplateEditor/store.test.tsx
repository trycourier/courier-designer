import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useAtom, Provider, createStore } from "jotai";
import {
  contentTransformerAtom,
  templateEditorContentAtom,
  type ContentTransformer,
} from "./store";
import type { ElementalContent } from "../../types/elemental.types";

describe("contentTransformer", () => {
  it("should apply transformer to content when set", () => {
    const store = createStore();
    const mockContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "text",
          content: "Hello",
        },
      ],
    };

    const transformer: ContentTransformer = (content) => ({
      ...content,
      elements: content.elements?.map((el: any) =>
        el.type === "text" ? { ...el, content: `${el.content} transformed` } : el
      ),
    });

    const { result } = renderHook(
      () => ({
        content: useAtom(templateEditorContentAtom),
        transformer: useAtom(contentTransformerAtom),
      }),
      {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
      }
    );

    // Set transformer (wrap to avoid Jotai updater function behavior)
    act(() => {
      result.current.transformer[1](() => transformer);
    });

    // Set content
    act(() => {
      result.current.content[1](mockContent);
    });

    // Content should be transformed
    expect(result.current.content[0]).toEqual({
      version: "2022-01-01",
      elements: [
        {
          type: "text",
          content: "Hello transformed",
        },
      ],
    });
  });

  it("should not apply transformer when not set", () => {
    const store = createStore();
    const mockContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "text",
          content: "Hello",
        },
      ],
    };

    const { result } = renderHook(
      () => ({
        content: useAtom(templateEditorContentAtom),
      }),
      {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
      }
    );

    // Set content without transformer
    act(() => {
      result.current.content[1](mockContent);
    });

    // Content should remain unchanged
    expect(result.current.content[0]).toEqual(mockContent);
  });

  it("should handle null content without errors", () => {
    const store = createStore();

    const { result } = renderHook(
      () => ({
        content: useAtom(templateEditorContentAtom),
        transformer: useAtom(contentTransformerAtom),
      }),
      {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
      }
    );

    // Set transformer that would fail on null
    const transformer: ContentTransformer = (content) => ({
      ...content,
      elements: content.elements?.map((el: any) => el),
    });

    act(() => {
      result.current.transformer[1](() => transformer);
    });

    // Set null content - should not throw
    act(() => {
      result.current.content[1](null);
    });

    // Content should remain null (early return in atom)
    expect(result.current.content[0]).toBeNull();
  });

  it("should handle undefined content without errors", () => {
    const store = createStore();

    const { result } = renderHook(
      () => ({
        content: useAtom(templateEditorContentAtom),
        transformer: useAtom(contentTransformerAtom),
      }),
      {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
      }
    );

    // Set transformer that would fail on undefined
    const transformer: ContentTransformer = (content) => ({
      ...content,
      elements: content.elements?.map((el: any) => el),
    });

    act(() => {
      result.current.transformer[1](() => transformer);
    });

    // Set undefined content - should not throw
    act(() => {
      result.current.content[1](undefined);
    });

    // Content should remain undefined (early return in atom)
    expect(result.current.content[0]).toBeUndefined();
  });

  it("should fallback to original content when transformer throws error", () => {
    const store = createStore();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "text",
          content: "Hello",
        },
      ],
    };

    const faultyTransformer: ContentTransformer = () => {
      throw new Error("Transformer error");
    };

    const { result } = renderHook(
      () => ({
        content: useAtom(templateEditorContentAtom),
        transformer: useAtom(contentTransformerAtom),
      }),
      {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
      }
    );

    // Set faulty transformer (wrap to avoid Jotai updater function behavior)
    act(() => {
      result.current.transformer[1](() => faultyTransformer);
    });

    // Set content
    act(() => {
      result.current.content[1](mockContent);
    });

    // Should fallback to original content
    expect(result.current.content[0]).toEqual(mockContent);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[ContentTransformer] Error applying transformer:",
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it("should allow clearing transformer by setting null", () => {
    const store = createStore();
    const mockContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "text",
          content: "Hello",
        },
      ],
    };

    const transformer: ContentTransformer = (content) => ({
      ...content,
      elements: content.elements?.map((el: any) =>
        el.type === "text" ? { ...el, content: `${el.content} transformed` } : el
      ),
    });

    const { result } = renderHook(
      () => ({
        content: useAtom(templateEditorContentAtom),
        transformer: useAtom(contentTransformerAtom),
      }),
      {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
      }
    );

    // Set transformer (wrap to avoid Jotai updater function behavior)
    act(() => {
      result.current.transformer[1](() => transformer);
    });

    // Set content (should be transformed)
    act(() => {
      result.current.content[1](mockContent);
    });

    expect(result.current.content[0]?.elements?.[0]).toHaveProperty("content", "Hello transformed");

    // Clear transformer
    act(() => {
      result.current.transformer[1](null);
    });

    // Set content again (should not be transformed)
    act(() => {
      result.current.content[1](mockContent);
    });

    expect(result.current.content[0]).toEqual(mockContent);
  });

  it("should prevent infinite loops with JSON.stringify comparison", () => {
    const store = createStore();
    const mockContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "text",
          content: "Hello",
        },
      ],
    };

    // Transformer that returns equivalent content (different object reference)
    const transformer: ContentTransformer = vi.fn((content) => ({
      ...content,
      elements: [...(content.elements || [])],
    }));

    const { result } = renderHook(
      () => ({
        content: useAtom(templateEditorContentAtom),
        transformer: useAtom(contentTransformerAtom),
      }),
      {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
      }
    );

    // Set transformer (wrap to avoid Jotai updater function behavior)
    act(() => {
      result.current.transformer[1](() => transformer);
    });

    // Set content
    act(() => {
      result.current.content[1](mockContent);
    });

    // Transformer should be called only once (not in infinite loop)
    expect(transformer).toHaveBeenCalledTimes(1);
  });

  it("should apply transformer to locales example", () => {
    const store = createStore();
    const mockContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          elements: [
            {
              type: "text",
              content: "Hello",
            },
          ],
        },
      ],
    };

    // Transformer that adds locales
    const transformer: ContentTransformer = (content) => ({
      ...content,
      elements: content.elements?.map((el: any) => {
        if (el.type === "channel") {
          return {
            ...el,
            elements: el.elements?.map((child: any) => {
              if (child.type === "text" && child.content) {
                return {
                  ...child,
                  locales: {
                    ...(child.locales || {}),
                    "eu-fr": { content: `[FR] ${child.content}` },
                    "es-es": { content: `[ES] ${child.content}` },
                  },
                };
              }
              return child;
            }),
          };
        }
        return el;
      }),
    });

    const { result } = renderHook(
      () => ({
        content: useAtom(templateEditorContentAtom),
        transformer: useAtom(contentTransformerAtom),
      }),
      {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
      }
    );

    // Set transformer (wrap to avoid Jotai updater function behavior)
    act(() => {
      result.current.transformer[1](() => transformer);
    });

    // Set content
    act(() => {
      result.current.content[1](mockContent);
    });

    // Check locales were added
    const channelElement: any = result.current.content[0]?.elements?.[0];
    const textElement = channelElement?.elements?.[0];
    expect(textElement?.locales).toEqual({
      "eu-fr": { content: "[FR] Hello" },
      "es-es": { content: "[ES] Hello" },
    });
  });
});
