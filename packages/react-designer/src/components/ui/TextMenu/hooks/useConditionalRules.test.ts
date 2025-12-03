import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { Editor } from "@tiptap/react";
import { useConditionalRules } from "./useConditionalRules";
import type { TextMenuConfig } from "../config";

describe("useConditionalRules", () => {
  const createMockEditor = (isActive: Record<string, boolean> = {}): Editor => {
    return {
      isActive: vi.fn((name: string) => isActive[name] || false),
    } as unknown as Editor;
  };

  const mockStates = {
    isBold: false,
    isItalic: false,
    isUnderline: false,
    isStrike: false,
    isQuote: false,
    isAlignLeft: false,
    isAlignCenter: false,
    isAlignRight: false,
    isAlignJustify: false,
    isLink: false,
  };

  const mockConfig: TextMenuConfig = {
    bold: { state: "enabled" },
    italic: { state: "enabled" },
    conditionalRules: [
      {
        id: "test-bold-italic-1",
        trigger: { type: "node", name: "blockquote", active: true },
        conditions: { activeItems: ["bold"] },
        action: { type: "toggle_off", targets: ["italic"] },
      },
      {
        id: "test-bold-italic-2",
        trigger: { type: "node", name: "blockquote", active: true },
        conditions: { activeItems: ["italic"] },
        action: { type: "toggle_off", targets: ["bold"] },
      },
    ],
  };

  it("should return null when config is undefined", () => {
    const editor = createMockEditor();
    const { result } = renderHook(() => useConditionalRules(undefined, editor, mockStates));

    expect(result.current).toBeNull();
  });

  it("should return null when editor is null", () => {
    const { result } = renderHook(() => useConditionalRules(mockConfig, null, mockStates));

    expect(result.current).toBeNull();
  });

  it("should return null when states is undefined", () => {
    const editor = createMockEditor();
    const { result } = renderHook(() => useConditionalRules(mockConfig, editor, undefined));

    expect(result.current).toBeNull();
  });

  it("should return null when config has no conditionalRules", () => {
    const editor = createMockEditor();
    const configWithoutRules: TextMenuConfig = {
      bold: { state: "enabled" },
      italic: { state: "enabled" },
    };

    const { result } = renderHook(() =>
      useConditionalRules(configWithoutRules, editor, mockStates)
    );

    expect(result.current).toBeNull();
  });

  it("should return getRuleForItem function when conditions are met", () => {
    const editor = createMockEditor({ blockquote: true });
    const states = { ...mockStates, isBold: true };

    const { result } = renderHook(() => useConditionalRules(mockConfig, editor, states));

    expect(result.current).not.toBeNull();
    expect(result.current?.getRuleForItem).toBeDefined();
  });

  it("should find rule for bold when in blockquote and italic is active", () => {
    const editor = createMockEditor({ blockquote: true });
    const states = { ...mockStates, isItalic: true };

    const { result } = renderHook(() => useConditionalRules(mockConfig, editor, states));

    const rule = result.current?.getRuleForItem("bold");
    expect(rule).toBeDefined();
    expect(rule?.id).toBe("test-bold-italic-2");
    expect(rule?.action.targets).toContain("bold");
  });

  it("should find rule for italic when in blockquote and bold is active", () => {
    const editor = createMockEditor({ blockquote: true });
    const states = { ...mockStates, isBold: true };

    const { result } = renderHook(() => useConditionalRules(mockConfig, editor, states));

    const rule = result.current?.getRuleForItem("italic");
    expect(rule).toBeDefined();
    expect(rule?.id).toBe("test-bold-italic-1");
    expect(rule?.action.targets).toContain("italic");
  });

  it("should not find rule when not in blockquote", () => {
    const editor = createMockEditor({ blockquote: false });
    const states = { ...mockStates, isBold: true };

    const { result } = renderHook(() => useConditionalRules(mockConfig, editor, states));

    // Hook returns object, but no rules should match
    expect(result.current).not.toBeNull();
    const boldRule = result.current?.getRuleForItem("bold");
    expect(boldRule).toBeUndefined();
  });

  it("should not find rule when neither bold nor italic is active", () => {
    const editor = createMockEditor({ blockquote: true });
    const states = { ...mockStates, isBold: false, isItalic: false };

    const { result } = renderHook(() => useConditionalRules(mockConfig, editor, states));

    // Hook returns object, but no rules should match because neither bold nor italic is active
    expect(result.current).not.toBeNull();
    const boldRule = result.current?.getRuleForItem("bold");
    const italicRule = result.current?.getRuleForItem("italic");
    expect(boldRule).toBeUndefined();
    expect(italicRule).toBeUndefined();
  });

  it("should handle multiple rules and return the first matching one", () => {
    const editor = createMockEditor({ blockquote: true });
    const states = { ...mockStates, isBold: true, isItalic: true };

    const { result } = renderHook(() => useConditionalRules(mockConfig, editor, states));

    // Both bold and italic are active, should find a rule
    const boldRule = result.current?.getRuleForItem("bold");
    const italicRule = result.current?.getRuleForItem("italic");

    expect(boldRule).toBeDefined();
    expect(italicRule).toBeDefined();
  });
});
