import { describe, it, expect, vi } from "vitest";
import { atom, createStore } from "jotai";
import { flushFunctionsAtom, flushAllPendingUpdates, type FlushFunction } from "./store";

describe("Flush Mechanism", () => {
  describe("flushFunctionsAtom", () => {
    it("should register a flush function", () => {
      const store = createStore();
      const mockFlush = vi.fn();

      store.set(flushFunctionsAtom, {
        action: "register",
        id: "test-flush",
        fn: mockFlush,
      });

      const flushFunctions = store.get(flushFunctionsAtom);
      expect(flushFunctions.has("test-flush")).toBe(true);
      expect(flushFunctions.get("test-flush")).toBe(mockFlush);
    });

    it("should unregister a flush function", () => {
      const store = createStore();
      const mockFlush = vi.fn();

      // Register
      store.set(flushFunctionsAtom, {
        action: "register",
        id: "test-flush",
        fn: mockFlush,
      });

      // Verify registered
      expect(store.get(flushFunctionsAtom).has("test-flush")).toBe(true);

      // Unregister
      store.set(flushFunctionsAtom, {
        action: "unregister",
        id: "test-flush",
      });

      // Verify unregistered
      expect(store.get(flushFunctionsAtom).has("test-flush")).toBe(false);
    });

    it("should register multiple flush functions", () => {
      const store = createStore();
      const mockFlush1 = vi.fn();
      const mockFlush2 = vi.fn();

      store.set(flushFunctionsAtom, {
        action: "register",
        id: "flush-1",
        fn: mockFlush1,
      });

      store.set(flushFunctionsAtom, {
        action: "register",
        id: "flush-2",
        fn: mockFlush2,
      });

      const flushFunctions = store.get(flushFunctionsAtom);
      expect(flushFunctions.size).toBe(2);
      expect(flushFunctions.has("flush-1")).toBe(true);
      expect(flushFunctions.has("flush-2")).toBe(true);
    });
  });

  describe("flushAllPendingUpdates", () => {
    it("should execute all registered flush functions", () => {
      const mockFlush1 = vi.fn();
      const mockFlush2 = vi.fn();
      const mockFlush3 = vi.fn();

      const flushFunctions = new Map<string, FlushFunction>([
        ["flush-1", mockFlush1],
        ["flush-2", mockFlush2],
        ["flush-3", mockFlush3],
      ]);

      flushAllPendingUpdates(flushFunctions);

      expect(mockFlush1).toHaveBeenCalledTimes(1);
      expect(mockFlush2).toHaveBeenCalledTimes(1);
      expect(mockFlush3).toHaveBeenCalledTimes(1);
    });

    it("should handle errors gracefully and continue flushing", () => {
      const mockFlush1 = vi.fn(() => {
        throw new Error("Flush 1 error");
      });
      const mockFlush2 = vi.fn();
      const mockFlush3 = vi.fn();

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const flushFunctions = new Map<string, FlushFunction>([
        ["flush-1", mockFlush1],
        ["flush-2", mockFlush2],
        ["flush-3", mockFlush3],
      ]);

      flushAllPendingUpdates(flushFunctions);

      expect(mockFlush1).toHaveBeenCalledTimes(1);
      expect(mockFlush2).toHaveBeenCalledTimes(1);
      expect(mockFlush3).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[FlushPendingUpdates] Error flushing updates:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it("should work with empty map", () => {
      const flushFunctions = new Map<string, FlushFunction>();
      expect(() => flushAllPendingUpdates(flushFunctions)).not.toThrow();
    });
  });
});
