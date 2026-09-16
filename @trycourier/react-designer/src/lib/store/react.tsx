/**
 * React bindings for the atom store.
 *
 * `useSyncExternalStore` is what makes this safe under concurrent rendering:
 * the store is the source of truth and React pulls from it, so a write that
 * lands mid-render cannot leave a component showing a value that no longer
 * exists.
 */
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  createStore,
  getDefaultStore,
  type Atom,
  type SetStateAction,
  type Store,
  type WritableAtom,
} from "./atom";

const StoreContext = createContext<Store | undefined>(undefined);

export interface ProviderProps {
  store?: Store;
  children?: ReactNode;
}

/**
 * Scopes every atom read beneath it to one store. Without a `store` prop it
 * creates one, so a Provider is always an isolation boundary.
 */
export const Provider = ({ store, children }: ProviderProps) => {
  const fallback = useRef<Store>();
  if (!store && !fallback.current) {
    fallback.current = createStore();
  }
  const value = store ?? fallback.current!;
  return createElement(StoreContext.Provider, { value }, children);
};

/** The store this subtree writes to. */
export const useStore = (): Store => useContext(StoreContext) ?? getDefaultStore();

export function useAtomValue<Value>(anAtom: Atom<Value>): Value {
  const store = useStore();
  const subscribe = useCallback(
    (onChange: () => void) => store.sub(anAtom as Atom<unknown>, onChange),
    [store, anAtom]
  );
  // Safe as a snapshot: `store.get` returns the cached value and only computes
  // when the atom is invalidated, so identity is stable between changes.
  const getSnapshot = useCallback(() => store.get(anAtom), [store, anAtom]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useSetAtom<Value, Args extends unknown[], Result>(
  anAtom: WritableAtom<Value, Args, Result>
): (...args: Args) => Result {
  const store = useStore();
  return useCallback((...args: Args) => store.set(anAtom, ...args), [store, anAtom]);
}

export function useAtom<Value, Args extends unknown[], Result>(
  anAtom: WritableAtom<Value, Args, Result>
): [Value, (...args: Args) => Result];
export function useAtom<Value>(
  anAtom: WritableAtom<Value, [SetStateAction<Value>], void>
): [Value, (update: SetStateAction<Value>) => void];
export function useAtom<Value, Args extends unknown[], Result>(
  anAtom: WritableAtom<Value, Args, Result>
): [Value, (...args: Args) => Result] {
  return [useAtomValue(anAtom), useSetAtom(anAtom)];
}

/**
 * Seed atoms before first paint. Test-only today; kept because hydrating a
 * store from server-rendered values is the same operation.
 */
const hydrated = new WeakMap<Store, WeakSet<object>>();

export function useHydrateAtoms(
  values: Iterable<readonly [WritableAtom<unknown, [never], unknown>, unknown]>
): void {
  const store = useStore();
  useMemo(() => {
    let seen = hydrated.get(store);
    if (!seen) {
      seen = new WeakSet();
      hydrated.set(store, seen);
    }
    for (const [anAtom, value] of values) {
      if (seen.has(anAtom as object)) {
        continue;
      }
      seen.add(anAtom as object);
      store.set(anAtom, value as never);
    }
    // Hydration runs once per store, by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);
}
