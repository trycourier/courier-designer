import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAtom } from "jotai";
import { templateEditorContentAtom } from "@/components/TemplateEditor/store";
import { useAutoSave } from "./useAutoSave";
import {
  extractTextFields,
  updateLocaleTranslation,
  type TranslatableField,
} from "@/lib/utils/extractTextFields";
import type { ElementalContent } from "@/types";

export type { TranslatableField };

export interface UseLocalizationOptions {
  /**
   * Called when the content should be persisted to the server.
   * The consumer provides this so they can use their own save mechanism
   * (e.g. Apollo Client mutation in CDS).
   */
  onSave: (content: ElementalContent) => Promise<void>;
  /** Debounce interval in ms (default 500). */
  debounceMs?: number;
  /** Callback when a save fails. */
  onError?: (error: unknown) => void;
}

export interface UseLocalizationResult {
  fields: TranslatableField[];
  /**
   * Update a locale translation for a specific field.
   * Empty value removes the locale entry; non-empty adds/replaces it.
   * Automatically triggers a debounced save via the provided onSave.
   */
  setTranslation: (fieldId: string, localeCode: string, value: string) => void;
}

/**
 * Returns all translatable text fields extracted from the current template content,
 * plus a `setTranslation` method to persist locale changes back to the atom
 * and auto-save via the consumer-provided `onSave` callback.
 */
export function useLocalization({
  onSave,
  debounceMs = 500,
  onError,
}: UseLocalizationOptions): UseLocalizationResult {
  const [content, setContent] = useAtom(templateEditorContentAtom);
  const fields = useMemo(() => extractTextFields(content), [content]);

  const isInitialLoadRef = useRef(true);

  const { handleAutoSave } = useAutoSave({
    onSave,
    debounceMs,
    enabled: true,
    onError,
  });

  useEffect(() => {
    if (!content) return;

    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    handleAutoSave(content);
  }, [content, handleAutoSave]);

  const setTranslation = useCallback(
    (fieldId: string, localeCode: string, value: string) => {
      if (!content) return;
      setContent(updateLocaleTranslation(content, fieldId, localeCode, value));
    },
    [content, setContent]
  );

  return { fields, setTranslation };
}
