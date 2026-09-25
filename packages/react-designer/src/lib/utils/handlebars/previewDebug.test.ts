import { afterEach, describe, expect, it, vi } from "vitest";
import { previewDebug, previewDebugEnabled } from "./previewDebug";

const FLAG = "__COURIER_DEBUG_HANDLEBARS_PREVIEW__";
const STORAGE_KEY = "courier:debug-handlebars-preview";

afterEach(() => {
  delete (globalThis as Record<string, unknown>)[FLAG];
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    /* no storage in this environment */
  }
  vi.restoreAllMocks();
});

describe("previewDebug", () => {
  it("is silent unless the page opts in", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(previewDebugEnabled()).toBe(false);
    previewDebug("event", { a: 1 });
    expect(log).not.toHaveBeenCalled();
  });

  it("traces once the window flag is set", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    (globalThis as Record<string, unknown>)[FLAG] = true;
    previewDebug("event", { a: 1 });
    // Inlined, not a second argument: an extension console shows "Object" for
    // that argument and the payload is unreadable where it matters.
    expect(log).toHaveBeenCalledWith('[courier:handlebars-preview] event {"a":1}');
  });

  it("survives a reload via localStorage, since the first conversion runs at mount", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    globalThis.localStorage.setItem(STORAGE_KEY, "1");
    expect(previewDebugEnabled()).toBe(true);
    previewDebug("event", { a: 1 });
    expect(log).toHaveBeenCalled();
  });

  it("stays off for any other stored value", () => {
    globalThis.localStorage.setItem(STORAGE_KEY, "0");
    expect(previewDebugEnabled()).toBe(false);
  });

  it("falls back to a string when the payload cannot be serialised", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    (globalThis as Record<string, unknown>)[FLAG] = true;
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => previewDebug("event", circular)).not.toThrow();
    expect(log).toHaveBeenCalled();
  });

  it("never fails a render when the console throws", () => {
    vi.spyOn(console, "log").mockImplementation(() => {
      throw new Error("no console");
    });
    (globalThis as Record<string, unknown>)[FLAG] = true;
    expect(() => previewDebug("event", {})).not.toThrow();
  });
});
