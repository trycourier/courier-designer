import { flushFunctionsAtom } from "@/components/TemplateEditor/store";
import { useSetAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";

/**
 * A hook that provides a debounced update function which is also registered
 * with the global flush mechanism to ensure updates are saved before unload/save.
 *
 * @param id Unique identifier for the flush function
 * @param callback The function to execute (must be stable or wrapped in useCallback)
 * @param delay Debounce delay in milliseconds
 * @returns A trigger function that initiates the debounced update
 */
export function useDebouncedFlush<T = void>(
  id: string,
  callback: (args: T) => void,
  delay: number = 500
) {
  const setFlushFunctions = useSetAtom(flushFunctionsAtom);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const pendingArgsRef = useRef<T | undefined>(undefined);
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const executeUpdate = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }

    if (pendingArgsRef.current !== undefined) {
      callbackRef.current(pendingArgsRef.current);
      pendingArgsRef.current = undefined;
    }
  }, []);

  // Register/unregister flush function
  useEffect(() => {
    setFlushFunctions({
      action: "register",
      id,
      fn: executeUpdate,
    });

    return () => {
      setFlushFunctions({ action: "unregister", id });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [id, setFlushFunctions, executeUpdate]);

  const trigger = useCallback(
    (args: T) => {
      pendingArgsRef.current = args;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        executeUpdate();
      }, delay);
    },
    [delay, executeUpdate]
  );

  return trigger;
}
