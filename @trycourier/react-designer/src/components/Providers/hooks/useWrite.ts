/**
 * One write operation: call it, know whether it is running.
 *
 * Replaces `useMutation`. The in-flight count goes into the store so the
 * provider can answer "is a save happening anywhere in this editor" — the
 * question `useIsMutating` was answering — without every caller publishing its
 * own opinion.
 */
import { useCallback, useRef, useState } from "react";
import { useSetAtom } from "@/lib/store";
import { pendingWritesAtom } from "./queryState";

export interface Write<Args extends unknown[], Result> {
  mutateAsync: (...args: Args) => Promise<Result>;
  isLoading: boolean;
}

export const useWrite = <Args extends unknown[], Result>(
  name: string,
  run: (...args: Args) => Promise<Result>
): Write<Args, Result> => {
  const setPending = useSetAtom(pendingWritesAtom);
  const [isLoading, setIsLoading] = useState(false);
  // Held in a ref so `mutateAsync` stays stable across renders; callers put it
  // in dependency arrays.
  const runRef = useRef(run);
  runRef.current = run;

  const mutateAsync = useCallback(
    async (...args: Args): Promise<Result> => {
      setPending((pending) => ({ ...pending, [name]: (pending[name] ?? 0) + 1 }));
      setIsLoading(true);
      try {
        return await runRef.current(...args);
      } finally {
        setPending((pending) => ({
          ...pending,
          [name]: Math.max((pending[name] ?? 1) - 1, 0),
        }));
        setIsLoading(false);
      }
    },
    [name, setPending]
  );

  return { mutateAsync, isLoading };
};
