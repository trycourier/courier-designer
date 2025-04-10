import { useCallback, useRef, useState } from "react";

interface UseAutoSaveOptions<T> {
  onSave: (content: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
  onError?: (error: unknown) => void;
}

export function useAutoSave<T>({
  onSave,
  debounceMs = 200,
  enabled = true,
  onError,
}: UseAutoSaveOptions<T>) {
  const [isSaving, setIsSaving] = useState(false);
  const pendingChangesRef = useRef<T | null>(null);
  const previousContentRef = useRef<string>();
  const lastSaveTimestampRef = useRef<number>(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitialLoadRef = useRef(true);

  const handleAutoSave = useCallback(
    async (content: T) => {
      if (!enabled) return;

      // Skip save during initial load
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        previousContentRef.current = JSON.stringify(content);
        return;
      }

      // Store or update the pending content immediately
      pendingChangesRef.current = content;

      // Clear any existing timeout to prevent multiple saves
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = undefined;
      }

      const processPendingContent = async () => {
        // Get and clear pending content
        const contentToSave = pendingChangesRef.current;
        pendingChangesRef.current = null;

        if (!contentToSave) return;

        try {
          const contentString = JSON.stringify(contentToSave);
          // Don't save if content hasn't changed
          if (contentString === previousContentRef.current) {
            return;
          }

          setIsSaving(true);
          previousContentRef.current = contentString;
          lastSaveTimestampRef.current = Date.now();
          await onSave(contentToSave);
        } catch (error) {
          onError?.(error);
          // Reset saving state even if there's an error
          setIsSaving(false);
          return;
        }

        setIsSaving(false);

        // After save completes, if we have new pending changes, start a new debounce cycle
        if (pendingChangesRef.current) {
          handleAutoSave(pendingChangesRef.current);
        }
      };

      // If a save is in progress, wait for it to complete
      if (isSaving) {
        return;
      }

      // Calculate appropriate debounce delay
      const now = Date.now();
      const timeSinceLastSave = now - lastSaveTimestampRef.current;
      const delay = Math.max(0, debounceMs - timeSinceLastSave);

      // Set up new debounce timeout
      debounceTimeoutRef.current = setTimeout(() => {
        debounceTimeoutRef.current = undefined;
        processPendingContent();
      }, delay);
    },
    [debounceMs, enabled, isSaving, onError, onSave]
  );

  return {
    handleAutoSave,
    isSaving,
  };
}
