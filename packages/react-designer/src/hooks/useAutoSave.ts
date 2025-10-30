import { useCallback, useEffect, useRef, useState } from "react";

interface UseAutoSaveOptions<T> {
  onSave: (content: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
  onError?: (error: unknown) => void;
  initialContent?: T;
}

export function useAutoSave<T>({
  onSave,
  debounceMs = 200,
  enabled = true,
  onError,
  initialContent,
}: UseAutoSaveOptions<T>) {
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false); // Synchronous ref to track saving state
  const pendingChangesRef = useRef<T | null>(null);
  const previousContentRef = useRef<string>();
  const lastSaveTimestampRef = useRef<number>(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize previousContentRef with initialContent if provided
  useEffect(() => {
    if (initialContent) {
      previousContentRef.current = JSON.stringify(initialContent);
    }
  }, [initialContent]);

  const processPendingContent = useCallback(async () => {
    // Check if already saving using the ref (synchronous check)
    if (isSavingRef.current) {
      return;
    }

    // Get and clear pending content
    const contentToSave = pendingChangesRef.current;
    pendingChangesRef.current = null;

    if (!contentToSave) {
      return;
    }

    try {
      const contentString = JSON.stringify(contentToSave);
      // Don't save if content hasn't changed
      if (contentString === previousContentRef.current) {
        return;
      }

      // Set both ref and state synchronously
      isSavingRef.current = true;
      setIsSaving(true);
      previousContentRef.current = contentString;
      lastSaveTimestampRef.current = Date.now();

      await onSave(contentToSave);
    } catch (error) {
      console.error("[AutoSave] Save failed:", error);
      onError?.(error);
    } finally {
      // Reset both ref and state
      isSavingRef.current = false;
      setIsSaving(false);

      // After save completes, if we have new pending changes, schedule another save
      if (pendingChangesRef.current) {
        // Schedule the next save with appropriate delay
        const now = Date.now();
        const timeSinceLastSave = now - lastSaveTimestampRef.current;
        const delay = Math.max(0, debounceMs - timeSinceLastSave);

        debounceTimeoutRef.current = setTimeout(() => {
          debounceTimeoutRef.current = undefined;
          processPendingContent();
        }, delay);
      }
    }
  }, [debounceMs, onError, onSave]);

  // Store latest values in refs to avoid recreating handleAutoSave
  const enabledRef = useRef(enabled);
  const debounceRef = useRef(debounceMs);
  const processPendingContentRef = useRef(processPendingContent);

  useEffect(() => {
    enabledRef.current = enabled;
    debounceRef.current = debounceMs;
    processPendingContentRef.current = processPendingContent;
  });

  // Stable handleAutoSave that never changes identity
  const handleAutoSave = useCallback(async (content: T) => {
    if (!enabledRef.current) {
      return;
    }

    const contentString = JSON.stringify(content);

    // Deduplicate: if content is exactly the same as what's already pending, skip
    const previousPendingString = pendingChangesRef.current
      ? JSON.stringify(pendingChangesRef.current)
      : null;

    if (previousPendingString === contentString) {
      return;
    }

    // Also deduplicate against what was last saved
    if (contentString === previousContentRef.current) {
      return;
    }

    // Store or update the pending content immediately
    pendingChangesRef.current = content;

    // If currently saving, just store the change and return
    // The processPendingContent will pick it up after the current save completes
    if (isSavingRef.current) {
      return;
    }

    // Clear any existing timeout to reset the debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = undefined;
    }

    // Calculate appropriate debounce delay
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimestampRef.current;
    const delay = Math.max(0, debounceRef.current - timeSinceLastSave);

    // Set up new debounce timeout
    debounceTimeoutRef.current = setTimeout(() => {
      debounceTimeoutRef.current = undefined;
      processPendingContentRef.current();
    }, delay);
  }, []); // Empty deps array - function never changes identity

  return {
    handleAutoSave,
    isSaving,
  };
}
