/**
 * The small amount of React Query we actually used, on the store we own.
 *
 * What the data layer needs is narrow: fetch when the target changes, don't let
 * a late response overwrite a newer one, expose "is it in flight", and let a
 * caller ask for a refetch. That is a few dozen lines against `src/lib/store` —
 * not worth a dependency in a package other people bundle, which is the same
 * reason jotai went.
 *
 * These atoms are deliberately not exported from the package: they are the
 * mechanism, and `templateDataAtom` and friends remain the published surface.
 */
import { atom } from "@/lib/store";
import type { TenantData } from "../store";

export interface AsyncState<T> {
  data: T | null;
  error: unknown;
  /** A request is in flight. */
  isFetching: boolean;
  /** At least one request has settled for the current key. */
  isFetched: boolean;
  /** What `data` was fetched for; a change means the cached data is not ours. */
  key: string | null;
}

export const INITIAL_ASYNC_STATE: AsyncState<never> = {
  data: null,
  error: null,
  isFetching: false,
  isFetched: false,
  key: null,
};

export const templateQueryAtom = atom<AsyncState<TenantData>>(
  INITIAL_ASYNC_STATE as AsyncState<TenantData>
);

/** Bumped to ask the template query to run again. */
export const templateRefetchTokenAtom = atom(0);

/**
 * In-flight writes, counted by name.
 *
 * Counting in the store rather than per hook instance is the point: two
 * components that both call `useTemplateActions` must not disagree about
 * whether a save is running.
 */
export const pendingWritesAtom = atom<Record<string, number>>({});

export const countPending = (
  pending: Record<string, number> | null | undefined,
  ...names: string[]
) => names.reduce((total, name) => total + (pending?.[name] ?? 0), 0);
