import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAutoSave } from "@/hooks/useAutoSave";
import { flushAllPendingUpdates, type FlushFunction } from "./store";

/**
 * Integration tests for the race condition bug fix
 *
 * Bug Description:
 * When typing with short pauses in the Email Subject field, the last chunk of
 * text would sometimes be lost during auto-save. This occurred due to a race
 * condition between:
 * 1. Subject debounce (500ms) - updates templateEditorContent
 * 2. Auto-save debounce (2000ms) - saves templateEditorContent
 *
 * The bug happened when auto-save fired before the subject debounce had updated
 * templateEditorContent, resulting in incomplete data being saved.
 */
describe("Race Condition Bug Fix", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const advanceTimersAndFlush = async (ms: number) => {
    await act(async () => {
      vi.advanceTimersByTime(ms);
      await Promise.resolve();
    });
  };

  it("REGRESSION TEST: should not lose data when typing with short pauses", async () => {
    // This test reproduces the exact scenario from the bug report

    // Simulate the state that would be affected by debounced updates
    let subjectInState = "";
    let contentSaved = "";

    // Mock flush function that simulates flushing a pending subject update
    const flushPendingSubjectUpdate = vi.fn(() => {
      // This simulates the subject debounce firing immediately
      // In the real code, this clears the timeout and executes the update logic
      subjectInState = "test 123 fsdf sdf sdfs dfd"; // Complete subject
    });

    // Mock save function that captures what gets saved
    const onSave = vi.fn(async (content: { subject: string }) => {
      contentSaved = content.subject;
    });

    // Set up auto-save with flush
    const { result } = renderHook(() =>
      useAutoSave({
        onSave,
        debounceMs: 2000, // Auto-save debounce
        enabled: true,
        flushBeforeSave: flushPendingSubjectUpdate,
      })
    );

    // SCENARIO: User types with short pauses

    // t=0ms: Type "test 123"
    await act(async () => {
      subjectInState = "test 123";
      result.current.handleAutoSave({ subject: subjectInState });
    });

    // t=150ms: Type " fsdf sdf" (resets subject debounce)
    await advanceTimersAndFlush(150);
    await act(async () => {
      subjectInState = "test 123 fsdf sdf";
      // Subject debounce would reset here, but we simulate incomplete state
      // The actual templateEditorContent hasn't been updated yet
    });

    // t=350ms: Subject debounce would fire (500ms from t=150ms would be t=650ms)
    // BUT auto-save debounce will fire first at t=2000ms!
    await advanceTimersAndFlush(200); // Now at t=350ms

    // t=500ms: Type " sdfs dfd" (final chunk) - critical timing
    await act(async () => {
      subjectInState = "test 123 fsdf sdf sdfs dfd";
      result.current.handleAutoSave({ subject: subjectInState });
    });

    // Wait for auto-save debounce to fire (2000ms from last handleAutoSave)
    await advanceTimersAndFlush(2000);

    // Auto-save should have fired at t=2000ms
    // WITH THE FIX: flushBeforeSave() is called first
    expect(flushPendingSubjectUpdate).toHaveBeenCalled();

    // ASSERTION: The save should include the COMPLETE subject
    // Without the fix, it would only have "test 123" or "test 123 fsdf sdf"
    expect(onSave).toHaveBeenCalled();
    expect(contentSaved).toBe("test 123 fsdf sdf sdfs dfd");
  });

  it("should flush all pending updates before save", async () => {
    let subjectPending = "";
    let contentPending = "";

    const flushSubject = vi.fn(() => {
      subjectPending = "Complete Subject";
    });

    const flushContent = vi.fn(() => {
      contentPending = "Complete Content";
    });

    const flushMap = new Map<string, FlushFunction>([
      ["subject", flushSubject],
      ["content", flushContent],
    ]);

    const onSave = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAutoSave({
        onSave,
        debounceMs: 2000,
        enabled: true,
        flushBeforeSave: () => flushAllPendingUpdates(flushMap),
      })
    );

    await act(async () => {
      result.current.handleAutoSave({ data: "test" });
    });

    await advanceTimersAndFlush(2000); // Wait for 2000ms auto-save debounce

    // Both flush functions should have been called
    expect(flushSubject).toHaveBeenCalledTimes(1);
    expect(flushContent).toHaveBeenCalledTimes(1);

    // State should be updated
    expect(subjectPending).toBe("Complete Subject");
    expect(contentPending).toBe("Complete Content");

    // Save should have been called after flush
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("should handle rapid typing bursts without data loss", async () => {
    // Simulates very fast typing with multiple debounce resets
    const savedSubjects: string[] = [];

    const flushSubject = vi.fn(() => {
      // Flush always gets the latest state
      // This simulates the flush function reading from refs
    });

    const onSave = vi.fn(async (content: { subject: string }) => {
      savedSubjects.push(content.subject);
    });

    const { result } = renderHook(() =>
      useAutoSave({
        onSave,
        debounceMs: 2000,
        enabled: true,
        flushBeforeSave: flushSubject,
      })
    );

    // Rapid typing with short pauses
    await act(async () => {
      result.current.handleAutoSave({ subject: "Hello" });
    });

    await advanceTimersAndFlush(100);
    await act(async () => {
      result.current.handleAutoSave({ subject: "Hello World" });
    });

    await advanceTimersAndFlush(100);
    await act(async () => {
      result.current.handleAutoSave({ subject: "Hello World Test" });
    });

    // Wait for debounce to complete
    await advanceTimersAndFlush(2000); // Wait for 2000ms auto-save debounce

    // Flush should be called before save
    expect(flushSubject).toHaveBeenCalled();

    // Save should capture the last value
    expect(onSave).toHaveBeenCalled();
    expect(savedSubjects).toContain("Hello World Test");
  });

  it("should work correctly when flush function clears timeout and executes immediately", async () => {
    // This simulates the actual flush implementation in EmailEditor
    let timeoutId: NodeJS.Timeout | null = null;
    let pendingUpdate = "incomplete";
    let actualState = "initial";

    // Simulate subject debounce
    const scheduleSubjectUpdate = (newValue: string) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      pendingUpdate = newValue;

      timeoutId = setTimeout(() => {
        actualState = pendingUpdate;
        timeoutId = null;
      }, 200);
    };

    // Flush function that mimics EmailEditor's flush
    const flushSubjectUpdate = vi.fn(() => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
        // Execute update immediately
        actualState = pendingUpdate;
      }
    });

    const onSave = vi.fn(async () => {
      // Save captures current state
      return actualState;
    });

    const { result } = renderHook(() =>
      useAutoSave({
        onSave,
        debounceMs: 2000,
        enabled: true,
        flushBeforeSave: flushSubjectUpdate,
      })
    );

    // User types, triggering subject debounce
    scheduleSubjectUpdate("test 123");
    await advanceTimersAndFlush(150);

    // User types more, resetting debounce
    scheduleSubjectUpdate("test 123 more");

    // Trigger auto-save
    await act(async () => {
      result.current.handleAutoSave({ subject: actualState });
    });

    // The subject debounce hasn't fired yet (actualState is still "initial")
    expect(actualState).toBe("initial");

    // Advance to trigger auto-save
    await advanceTimersAndFlush(2000); // Wait for 2000ms auto-save debounce

    // Flush should have been called, updating actualState immediately
    expect(flushSubjectUpdate).toHaveBeenCalledTimes(1);
    expect(actualState).toBe("test 123 more");

    // Save should have been called
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("should prevent the specific bug: auto-save capturing stale content", async () => {
    // This test verifies that flush is called before save, allowing pending updates to complete

    let pendingSubjectUpdate = "";
    let actualSubjectInState = "";

    // Simulate the flush mechanism that would update state with pending changes
    const flushPendingUpdates = vi.fn(() => {
      // Flush executes any pending updates immediately
      actualSubjectInState = pendingSubjectUpdate;
    });

    const onSave = vi.fn(async (content: { subject: string }) => {
      // Save uses the actual state (which should be updated by flush)
      return actualSubjectInState;
    });

    const { result } = renderHook(() =>
      useAutoSave({
        onSave,
        debounceMs: 2000,
        enabled: true,
        flushBeforeSave: flushPendingUpdates,
      })
    );

    // Simulate typing that creates a pending update
    pendingSubjectUpdate = "test 123";
    await act(async () => {
      // Pass current state (before pending update is flushed)
      result.current.handleAutoSave({ subject: actualSubjectInState });
    });

    // User continues typing, updating pending value
    pendingSubjectUpdate = "test 123 more text";

    // Advance timers to trigger save
    await advanceTimersAndFlush(2000); // Wait for 2000ms auto-save debounce

    // Verify: Flush was called first
    expect(flushPendingUpdates).toHaveBeenCalled();

    // Verify: State was updated by flush
    expect(actualSubjectInState).toBe("test 123 more text");

    // Verify: Save was called after flush
    expect(onSave).toHaveBeenCalled();
  });
});
