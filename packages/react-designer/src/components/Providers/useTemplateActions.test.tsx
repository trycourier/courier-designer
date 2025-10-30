import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TemplateProvider } from "./TemplateProvider";
import { useTemplateActions } from "./useTemplateActions";
import type { ContentTransformer } from "../TemplateEditor/store";
import type { ElementalContent } from "../../types/elemental.types";

describe("useTemplateActions - contentTransformer", () => {
  it("should expose contentTransformer and setContentTransformer", () => {
    const { result } = renderHook(() => useTemplateActions(), {
      wrapper: ({ children }) => (
        <TemplateProvider templateId="test" tenantId="tenant" token="token">
          {children}
        </TemplateProvider>
      ),
    });

    expect(result.current).toHaveProperty("contentTransformer");
    expect(result.current).toHaveProperty("setContentTransformer");
    expect(result.current.contentTransformer).toBeNull();
    expect(typeof result.current.setContentTransformer).toBe("function");
  });

  it("should allow setting and clearing transformer through useTemplateActions", () => {
    const { result } = renderHook(() => useTemplateActions(), {
      wrapper: ({ children }) => (
        <TemplateProvider templateId="test" tenantId="tenant" token="token">
          {children}
        </TemplateProvider>
      ),
    });

    const transformer: ContentTransformer = (content) => content;

    // Initially null
    expect(result.current.contentTransformer).toBeNull();

    // Set transformer (must wrap to avoid Jotai updater function behavior)
    act(() => {
      result.current.setContentTransformer(() => transformer);
    });

    // Should be set
    expect(result.current.contentTransformer).toBe(transformer);

    // Clear transformer
    act(() => {
      result.current.setContentTransformer(null);
    });

    // Should be null again
    expect(result.current.contentTransformer).toBeNull();
  });

  it("should work in multiple provider instances independently", () => {
    const { result: result1 } = renderHook(() => useTemplateActions(), {
      wrapper: ({ children }) => (
        <TemplateProvider templateId="test1" tenantId="tenant1" token="token1">
          {children}
        </TemplateProvider>
      ),
    });

    const { result: result2 } = renderHook(() => useTemplateActions(), {
      wrapper: ({ children }) => (
        <TemplateProvider templateId="test2" tenantId="tenant2" token="token2">
          {children}
        </TemplateProvider>
      ),
    });

    const transformer1: ContentTransformer = (content) => ({
      ...content,
      version: "transformer1",
    });

    const transformer2: ContentTransformer = (content) => ({
      ...content,
      version: "transformer2",
    });

    // Set different transformers
    act(() => {
      result1.current.setContentTransformer(() => transformer1);
      result2.current.setContentTransformer(() => transformer2);
    });

    // Each instance should have its own transformer
    expect(result1.current.contentTransformer).toBe(transformer1);
    expect(result2.current.contentTransformer).toBe(transformer2);
    expect(result1.current.contentTransformer).not.toBe(result2.current.contentTransformer);
  });

  it("should demonstrate correct wrapping pattern for transformer", () => {
    const { result } = renderHook(() => useTemplateActions(), {
      wrapper: ({ children }) => (
        <TemplateProvider templateId="test" tenantId="tenant" token="token">
          {children}
        </TemplateProvider>
      ),
    });

    const transformer: ContentTransformer = (content: ElementalContent) => ({
      ...content,
      elements: content.elements?.map((el: any) =>
        el.type === "text" ? { ...el, content: `${el.content} [modified]` } : el
      ),
    });

    // CORRECT: Wrap the transformer function
    act(() => {
      result.current.setContentTransformer(() => transformer);
    });

    expect(result.current.contentTransformer).toBe(transformer);

    // INCORRECT pattern (would be treated as updater function by Jotai):
    // result.current.setContentTransformer(transformer);
    // This would call transformer(null) and set the result as the new value
  });

  it("should export ContentTransformer type", () => {
    // This test just verifies the type is exported
    const transformer: ContentTransformer = (content) => content;
    expect(typeof transformer).toBe("function");
  });
});
