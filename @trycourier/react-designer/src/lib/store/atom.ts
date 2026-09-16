/**
 * The atom primitive, and the store that holds atom values.
 *
 * This is the whole of our state library. It exists because the designer is
 * embedded — studio mounts it inside an app that has its own React tree and,
 * previously, its own copy of jotai. Two copies of jotai means two module
 * registries, and an atom written through one is invisible to the other: the
 * editor renders from state nobody is writing to. Owning the store removes the
 * failure mode rather than documenting it, and drops a runtime dependency from
 * a package other people bundle. See C-20386.
 *
 * The semantics deliberately match what the call sites were already written
 * against:
 *
 *   `atom(value)`                a primitive. `set` takes a value or an updater
 *                                function, exactly like `useState`.
 *   `atom((get) => ...)`         derived and read-only. Recomputed when a
 *                                dependency it actually read changes.
 *   `atom(null, (get, set, x))`  an action. `set` runs the body; the atom's own
 *                                value stays null.
 *
 * Reads are cached and dependencies are tracked per read, so a derived atom is
 * only recomputed when something it read changed, and subscribers are only
 * notified when the recomputed value differs by `Object.is`.
 */

export type Getter = <Value>(atom: Atom<Value>) => Value;

export type Setter = <Value, Args extends unknown[], Result>(
  atom: WritableAtom<Value, Args, Result>,
  ...args: Args
) => Result;

export interface Atom<Value> {
  /** Present on derived atoms only; primitives carry `init` instead. */
  read?: (get: Getter) => Value;
  /** Present on primitives (and on action atoms, where it is null). */
  init?: Value;
  debugLabel?: string;
}

export interface WritableAtom<Value, Args extends unknown[], Result> extends Atom<Value> {
  write: (get: Getter, set: Setter, ...args: Args) => Result;
}

export type SetStateAction<Value> = Value | ((prev: Value) => Value);

export type PrimitiveAtom<Value> = WritableAtom<Value, [SetStateAction<Value>], void>;

type AnyAtom = Atom<unknown>;

/**
 * How the store sees an atom once the caller's type arguments are gone. The
 * store is the one place that has to treat every atom alike, so the erasure
 * lives here rather than at each call site.
 */
type StoredAtom = Atom<unknown> & {
  write?: (get: Getter, set: Setter, ...args: never[]) => unknown;
};

/** A derived, read-only atom. */
export function atom<Value>(read: (get: Getter) => Value): Atom<Value>;
/** A derived atom with its own write behaviour. */
export function atom<Value, Args extends unknown[], Result>(
  read: (get: Getter) => Value,
  write: (get: Getter, set: Setter, ...args: Args) => Result
): WritableAtom<Value, Args, Result>;
/** An action atom: no value of its own, a write body that does the work. */
export function atom<Args extends unknown[], Result>(
  init: null,
  write: (get: Getter, set: Setter, ...args: Args) => Result
): WritableAtom<null, Args, Result>;
/** A primitive atom. */
export function atom<Value>(init: Value): PrimitiveAtom<Value>;
export function atom<Value>(
  read?: Value | ((get: Getter) => Value),
  write?: (get: Getter, set: Setter, ...args: never[]) => unknown
): Atom<Value> {
  const config: StoredAtom = {};
  if (typeof read === "function") {
    config.read = read as (get: Getter) => unknown;
  } else {
    config.init = read;
  }
  if (write) {
    config.write = write;
  }
  return config as Atom<Value>;
}

const isPrimitive = (a: StoredAtom) => !a.read;

export class Store {
  /** Last computed value per atom. Absent means "never read". */
  private values = new Map<AnyAtom, unknown>();
  /** What each derived atom read on its last computation. */
  private deps = new Map<AnyAtom, Set<AnyAtom>>();
  /** The inverse of `deps`: who has to be recomputed when this atom changes. */
  private dependents = new Map<AnyAtom, Set<AnyAtom>>();
  private listeners = new Map<AnyAtom, Set<() => void>>();
  /**
   * Atoms whose value changed during the write currently in flight. Held until
   * the outermost write returns so that an action atom setting five atoms
   * re-renders its subscribers once, not five times.
   */
  private pending = new Set<AnyAtom>();
  private writeDepth = 0;

  get = <Value>(anAtom: Atom<Value>): Value => {
    const a = anAtom as StoredAtom;
    if (this.values.has(a)) {
      return this.values.get(a) as Value;
    }
    if (isPrimitive(a)) {
      const init = a.init as Value;
      this.values.set(a, init);
      return init;
    }
    return this.compute(a) as Value;
  };

  set = <Value, Args extends unknown[], Result>(
    anAtom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ): Result => {
    const a = anAtom as unknown as StoredAtom;
    this.writeDepth++;
    try {
      if (a.write) {
        return (a.write as unknown as (get: Getter, set: Setter, ...rest: Args) => Result)(
          this.get,
          this.set as Setter,
          ...args
        );
      }
      // A primitive. Match useState: a function argument is an updater.
      const update = args[0] as SetStateAction<Value>;
      const next =
        typeof update === "function"
          ? (update as (prev: Value) => Value)(this.get(anAtom as Atom<Value>))
          : update;
      this.setValue(a, next);
      return undefined as Result;
    } finally {
      this.writeDepth--;
      if (this.writeDepth === 0) {
        this.flush();
      }
    }
  };

  sub = (anAtom: Atom<unknown>, listener: () => void): (() => void) => {
    const a = anAtom as StoredAtom;
    // Compute now so the atom is registered as a dependent before any write.
    this.get(a);
    let set = this.listeners.get(a);
    if (!set) {
      set = new Set();
      this.listeners.set(a, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
      if (set && set.size === 0) {
        this.listeners.delete(a);
      }
    };
  };

  private compute(a: StoredAtom): unknown {
    // Drop the previous dependency edges; the read below rebuilds them, so an
    // atom that stops reading something stops being recomputed for it.
    const previous = this.deps.get(a);
    if (previous) {
      previous.forEach((dep) => this.dependents.get(dep)?.delete(a));
    }
    const nextDeps = new Set<AnyAtom>();
    const trackingGet = (<Value>(dep: Atom<Value>): Value => {
      nextDeps.add(dep as AnyAtom);
      return this.get(dep);
    }) as Getter;
    const value = a.read!(trackingGet);
    this.deps.set(a, nextDeps);
    nextDeps.forEach((dep) => {
      let set = this.dependents.get(dep);
      if (!set) {
        set = new Set();
        this.dependents.set(dep, set);
      }
      set.add(a);
    });
    this.values.set(a, value);
    return value;
  }

  private setValue(a: StoredAtom, next: unknown): void {
    const prev = this.get(a as Atom<unknown>);
    if (Object.is(prev, next)) {
      return;
    }
    this.values.set(a, next);
    this.propagate(a);
  }

  /** `a` has a new value: mark it changed and recompute what depended on it. */
  private propagate(a: StoredAtom): void {
    this.pending.add(a);
    const dependents = this.dependents.get(a);
    if (!dependents) {
      return;
    }
    // Copy: recomputation rewrites the dependency edges we are iterating.
    for (const dependent of Array.from(dependents)) {
      const before = this.values.get(dependent);
      const after = this.compute(dependent);
      if (!Object.is(before, after)) {
        this.propagate(dependent);
      }
    }
  }

  private flush(): void {
    if (this.pending.size === 0) {
      return;
    }
    const changed = Array.from(this.pending);
    this.pending.clear();
    for (const a of changed) {
      const listeners = this.listeners.get(a);
      if (listeners) {
        Array.from(listeners).forEach((listener) => listener());
      }
    }
  }
}

export const createStore = (): Store => new Store();

/**
 * The store used by atoms read outside any Provider. Providers each create
 * their own, which is what keeps two editors on one page from sharing state.
 */
let defaultStore: Store | undefined;
export const getDefaultStore = (): Store => {
  if (!defaultStore) {
    defaultStore = createStore();
  }
  return defaultStore;
};
