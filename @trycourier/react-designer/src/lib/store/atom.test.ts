import { describe, expect, it, vi } from "vitest";
import { atom, createStore } from "./atom";

describe("atom store", () => {
  it("reads a primitive's initial value without being written first", () => {
    const store = createStore();
    expect(store.get(atom(3))).toBe(3);
  });

  it("takes a value or an updater, like useState", () => {
    const store = createStore();
    const count = atom(1);
    store.set(count, 5);
    expect(store.get(count)).toBe(5);
    store.set(count, (prev) => prev + 1);
    expect(store.get(count)).toBe(6);
  });

  it("derives from what it read, and recomputes when that changes", () => {
    const store = createStore();
    const first = atom("ada");
    const last = atom("lovelace");
    const read = vi.fn((get) => `${get(first)} ${get(last)}`);
    const full = atom(read);

    expect(store.get(full)).toBe("ada lovelace");
    expect(read).toHaveBeenCalledTimes(1);

    // Cached: a second read does not recompute.
    store.get(full);
    expect(read).toHaveBeenCalledTimes(1);

    store.set(last, "byron");
    expect(store.get(full)).toBe("ada byron");
  });

  it("does not recompute a derived atom for an unrelated write", () => {
    const store = createStore();
    const watched = atom(1);
    const ignored = atom("x");
    const read = vi.fn((get) => get(watched) * 2);
    const doubled = atom(read);

    store.get(doubled);
    expect(read).toHaveBeenCalledTimes(1);
    store.set(ignored, "y");
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("notifies subscribers only when the value actually changed", () => {
    const store = createStore();
    const count = atom(0);
    const listener = vi.fn();
    store.sub(count, listener);

    store.set(count, 1);
    expect(listener).toHaveBeenCalledTimes(1);

    // Same value by Object.is — no notification.
    store.set(count, 1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not notify a derived atom's subscribers when its value is unchanged", () => {
    const store = createStore();
    const state = atom({ revision: 1, content: "a" });
    const revision = atom((get) => get(state).revision);
    const listener = vi.fn();
    store.sub(revision, listener);

    // A new object, but the same revision: the derived value is identical.
    store.set(state, { revision: 1, content: "b" });
    expect(listener).not.toHaveBeenCalled();

    store.set(state, { revision: 2, content: "b" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("runs an action atom's body and lets it read and write", () => {
    const store = createStore();
    const count = atom(10);
    const bump = atom(null, (get, set, by: number) => {
      set(count, get(count) + by);
      return get(count);
    });

    expect(store.set(bump, 5)).toBe(15);
    expect(store.get(count)).toBe(15);
    // The action atom itself holds no value.
    expect(store.get(bump)).toBeNull();
  });

  it("notifies once per atom for an action that writes several times", () => {
    const store = createStore();
    const a = atom(0);
    const b = atom(0);
    const listenerA = vi.fn();
    const listenerB = vi.fn();
    store.sub(a, listenerA);
    store.sub(b, listenerB);

    const writeBoth = atom(null, (_get, set) => {
      set(a, 1);
      set(a, 2);
      set(b, 1);
    });
    store.set(writeBoth);

    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerB).toHaveBeenCalledTimes(1);
    expect(store.get(a)).toBe(2);
  });

  it("propagates through a chain of derived atoms", () => {
    const store = createStore();
    const base = atom(1);
    const doubled = atom((get) => get(base) * 2);
    const label = atom((get) => `n=${get(doubled)}`);
    const listener = vi.fn();
    store.sub(label, listener);

    store.set(base, 4);
    expect(store.get(label)).toBe("n=8");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("stops notifying after unsubscribe", () => {
    const store = createStore();
    const count = atom(0);
    const listener = vi.fn();
    const unsub = store.sub(count, listener);
    unsub();
    store.set(count, 1);
    expect(listener).not.toHaveBeenCalled();
  });

  it("keeps stores independent, which is what isolates two editors on a page", () => {
    const shared = atom("initial");
    const one = createStore();
    const two = createStore();

    one.set(shared, "from one");
    expect(one.get(shared)).toBe("from one");
    expect(two.get(shared)).toBe("initial");
  });

  it("awaits an async action's writes", async () => {
    const store = createStore();
    const status = atom("idle");
    const load = atom(null, async (_get, set) => {
      set(status, "loading");
      await Promise.resolve();
      set(status, "done");
    });

    const pending = store.set(load);
    expect(store.get(status)).toBe("loading");
    await pending;
    expect(store.get(status)).toBe("done");
  });
});
