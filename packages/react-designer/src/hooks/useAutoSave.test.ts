import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAutoSave } from "./useAutoSave";

describe("useAutoSave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // Helper to advance timers and flush promises
  const advanceTimersAndFlush = async (ms: number) => {
    await act(async () => {
      vi.advanceTimersByTime(ms);
      await Promise.resolve();
    });
  };

  it("should debounce save calls", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave({
        onSave,
        debounceMs: 200,
        enabled: true,
      })
    );

    // Trigger multiple saves rapidly
    await act(async () => {
      result.current.handleAutoSave({ content: "change1" });
      result.current.handleAutoSave({ content: "change2" });
      result.current.handleAutoSave({ content: "change3" });
    });

    // Should not call onSave immediately
    expect(onSave).not.toHaveBeenCalled();

    // Advance timers by debounce time
    await advanceTimersAndFlush(200);

    // Should call onSave only once with the last content
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ content: "change3" });
  });

  it("should handle race condition - store pending changes when save is in progress", async () => {
    let resolveSave: (() => void) | undefined;
    let saveCount = 0;

    const onSave = vi.fn().mockImplementation(async () => {
      saveCount++;
      if (saveCount === 1) {
        // Make first save wait
        await new Promise<void>((resolve) => {
          resolveSave = resolve;
        });
      }
    });

    const { result } = renderHook(() =>
      useAutoSave({
        onSave,
        debounceMs: 200,
        enabled: true,
      })
    );

    // First save
    await act(async () => {
      result.current.handleAutoSave({ content: "change1" });
    });
    await advanceTimersAndFlush(200);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(result.current.isSaving).toBe(true);

    // While first save is in progress, trigger more changes
    await act(async () => {
      result.current.handleAutoSave({ content: "change2" });
      result.current.handleAutoSave({ content: "change3" });
    });

    // Should not call onSave again yet (still saving)
    expect(onSave).toHaveBeenCalledTimes(1);

    // Complete the first save
    await act(async () => {
      resolveSave!();
      await Promise.resolve();
    });

    expect(result.current.isSaving).toBe(false);

    // Advance timers to trigger pending save
    await advanceTimersAndFlush(200);

    // Should now save the pending changes
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenLastCalledWith({ content: "change3" });
  });

  it("should deduplicate identical content - pending changes", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave({
        onSave,
        debounceMs: 200,
        enabled: true,
      })
    );

    // Trigger same content multiple times
    await act(async () => {
      result.current.handleAutoSave({ content: "same" });
      result.current.handleAutoSave({ content: "same" });
      result.current.handleAutoSave({ content: "same" });
    });

    await advanceTimersAndFlush(200);

    // Should only save once
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ content: "same" });
  });

  it("should deduplicate identical content - against last saved", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave({
        onSave,
        debounceMs: 200,
        enabled: true,
      })
    );

    // First save
    await act(async () => {
      result.current.handleAutoSave({ content: "content1" });
    });
    await advanceTimersAndFlush(200);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(result.current.isSaving).toBe(false);

    // Try to save same content again
    await act(async () => {
      result.current.handleAutoSave({ content: "content1" });
    });
    await advanceTimersAndFlush(200);

    // Should not save again
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("should not save when disabled", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave({
        onSave,
        debounceMs: 200,
        enabled: false,
      })
    );

    await act(async () => {
      result.current.handleAutoSave({ content: "change1" });
    });
    await advanceTimersAndFlush(200);

    // Should not call onSave when disabled
    expect(onSave).not.toHaveBeenCalled();
  });

  it("should handle rapid typing - preserve all changes", async () => {
    const saves: string[] = [];
    const onSave = vi.fn().mockImplementation(async (content: { text: string }) => {
      saves.push(content.text);
    });

    const { result } = renderHook(() =>
      useAutoSave({
        onSave,
        debounceMs: 200,
        enabled: true,
      })
    );

    // Simulate rapid typing "111111"
    await act(async () => {
      result.current.handleAutoSave({ text: "1" });
    });
    await advanceTimersAndFlush(50);
    await act(async () => {
      result.current.handleAutoSave({ text: "11" });
    });
    await advanceTimersAndFlush(50);
    await act(async () => {
      result.current.handleAutoSave({ text: "111" });
    });
    await advanceTimersAndFlush(50);
    await act(async () => {
      result.current.handleAutoSave({ text: "1111" });
    });
    await advanceTimersAndFlush(50);
    await act(async () => {
      result.current.handleAutoSave({ text: "11111" });
    });
    await advanceTimersAndFlush(50);
    await act(async () => {
      result.current.handleAutoSave({ text: "111111" });
    });

    // Advance past debounce time
    await advanceTimersAndFlush(200);

    // The last saved value should be "111111"
    expect(saves).toContain("111111");
    expect(saves[saves.length - 1]).toBe("111111");
  });

  it("should handle multiple rapid changes during save with correct order", async () => {
    const saves: string[] = [];
    let resolveSave: (() => void) | undefined;
    let saveCount = 0;

    const onSave = vi.fn().mockImplementation(async (content: { value: string }) => {
      saveCount++;
      if (saveCount === 1) {
        // Make first save wait
        await new Promise<void>((resolve) => {
          resolveSave = resolve;
        });
      }
      saves.push(content.value);
    });

    const { result } = renderHook(() =>
      useAutoSave({
        onSave,
        debounceMs: 200,
        enabled: true,
      })
    );

    // First change
    await act(async () => {
      result.current.handleAutoSave({ value: "A" });
    });
    await advanceTimersAndFlush(200);

    expect(result.current.isSaving).toBe(true);
    expect(onSave).toHaveBeenCalledTimes(1);

    // While saving, add more changes
    await act(async () => {
      result.current.handleAutoSave({ value: "B" });
      result.current.handleAutoSave({ value: "C" });
      result.current.handleAutoSave({ value: "D" });
    });

    // Complete first save
    await act(async () => {
      resolveSave!();
      await Promise.resolve();
    });

    expect(result.current.isSaving).toBe(false);

    // Advance timers to trigger pending save
    await advanceTimersAndFlush(200);

    // Should have saved A first, then D (the last pending change)
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(saves).toEqual(["A", "D"]);
  });

  it("should call onError when save fails", async () => {
    const error = new Error("Save failed");
    const onSave = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useAutoSave({
        onSave,
        debounceMs: 200,
        enabled: true,
        onError,
      })
    );

    await act(async () => {
      result.current.handleAutoSave({ content: "change1" });
    });
    await advanceTimersAndFlush(200);

    expect(onError).toHaveBeenCalledWith(error);
    expect(result.current.isSaving).toBe(false);
  });

  it("should initialize with initialContent to prevent duplicate save", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const initialContent = { text: "initial" };

    const { result } = renderHook(() =>
      useAutoSave({
        onSave,
        debounceMs: 200,
        enabled: true,
        initialContent,
      })
    );

    // Try to save the same initial content
    await act(async () => {
      result.current.handleAutoSave(initialContent);
    });
    await advanceTimersAndFlush(200);

    // Should not save since it matches initialContent
    expect(onSave).not.toHaveBeenCalled();

    // Save different content
    await act(async () => {
      result.current.handleAutoSave({ text: "changed" });
    });
    await advanceTimersAndFlush(200);

    // Should save the changed content
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ text: "changed" });
  });
});
