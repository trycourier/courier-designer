import { useAtom, useSetAtom } from "@/lib/store";
import { templateRefetchTokenAtom } from "./hooks/queryState";
import { useCallback } from "react";
import {
  templateEditorContentAtom,
  contentTransformerAtom,
  type ContentTransformer,
} from "../TemplateEditor/store";
import { createCustomError, convertLegacyError, type TemplateError } from "@/lib/utils/errors";
import { CourierApiError } from "@/services/graphql-client";
import {
  useTemplateMutations,
  type DuplicateTemplateOptions,
  type SaveTemplateOptions,
} from "./hooks/useTemplateMutations";
import {
  isTemplateLoadingAtom,
  isTemplatePublishingAtom,
  isTemplateSavingAtom,
  templateDataAtom,
  templateErrorAtom,
} from "./store";

// Re-export types for external use
export type { ContentTransformer, DuplicateTemplateOptions, SaveTemplateOptions };

/** Kept for API compatibility: what `duplicateTemplate` resolves to. */
export interface DuplicateTemplateResult {
  success: boolean;
  templateId: string;
  version?: string;
}

export function useTemplateActions() {
  const refetchTemplate = useSetAtom(templateRefetchTokenAtom);
  const { save, publish, duplicate } = useTemplateMutations();

  const [isTemplateLoading, setIsTemplateLoading] = useAtom(isTemplateLoadingAtom);
  const [isTemplateSaving, setIsTemplateSaving] = useAtom(isTemplateSavingAtom);
  const [isTemplatePublishing, setIsTemplatePublishing] = useAtom(isTemplatePublishingAtom);
  const [templateError, setTemplateErrorAtom] = useAtom(templateErrorAtom);
  const [templateData, setTemplateData] = useAtom(templateDataAtom);
  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
  const [contentTransformer, setContentTransformer] = useAtom(contentTransformerAtom);
  const setTemplateErrorValue = useSetAtom(templateErrorAtom);

  // Backward-compatible setTemplateError that accepts both strings and TemplateError objects
  const setTemplateError = useCallback(
    (error: string | TemplateError | null) => {
      if (error === null) {
        setTemplateErrorAtom(null);
      } else if (typeof error === "string") {
        setTemplateErrorAtom(createCustomError(error));
      } else {
        setTemplateErrorAtom(error);
      }
    },
    [setTemplateErrorAtom]
  );

  /**
   * A write failed. Publish it the way the api atoms used to, so the toaster
   * and any host reading `templateError` see what they always have.
   */
  const publishError = useCallback(
    (error: unknown, fallbackDescription: string) => {
      setTemplateErrorValue(
        error instanceof CourierApiError
          ? error.toTemplateError()
          : {
              message: "Network connection failed",
              toastProps: { duration: 5000, description: fallbackDescription },
            }
      );
    },
    [setTemplateErrorValue]
  );

  /**
   * Refetch the template.
   *
   * The fetch itself is owned by `TemplateQueryBridge`; this asks it to run
   * again. Callers used to invoke `getTemplate()` directly and the effect that
   * did so had to guard against re-entering itself.
   */
  const getTemplate = useCallback(
    (_options?: { includeBrand?: boolean }) => {
      refetchTemplate((token) => token + 1);
    },
    [refetchTemplate]
  );

  const saveTemplate = useCallback(
    async (options?: SaveTemplateOptions) => {
      try {
        return await save.mutateAsync(options);
      } catch (error) {
        publishError(error, "Failed to save template");
        throw error;
      }
    },
    [save, publishError]
  );

  const publishTemplate = useCallback(async () => {
    try {
      return await publish.mutateAsync();
    } catch (error) {
      publishError(error, "Failed to publish template");
      throw error;
    }
  }, [publish, publishError]);

  const duplicateTemplate = useCallback(
    async (options?: DuplicateTemplateOptions): Promise<DuplicateTemplateResult | undefined> => {
      try {
        return await duplicate.mutateAsync(options);
      } catch (error) {
        publishError(error, "Failed to duplicate template");
        throw error;
      }
    },
    [duplicate, publishError]
  );

  return {
    getTemplate,
    saveTemplate,
    publishTemplate,
    duplicateTemplate,
    isTemplateLoading,
    setIsTemplateLoading,
    isTemplateSaving,
    setIsTemplateSaving,
    isTemplatePublishing,
    setIsTemplatePublishing,
    templateError,
    setTemplateError, // Backward-compatible function that accepts strings or TemplateError objects
    templateData,
    setTemplateData,
    templateEditorContent,
    setTemplateEditorContent,
    // New error helper functions
    createCustomError,
    convertLegacyError,
    // Content transformer API (experimental)
    /**
     * @internal Experimental API - subject to change
     * Synchronous function to transform content before it's stored in the atom.
     * Useful for adding metadata (e.g., locales) that shouldn't affect editor display.
     *
     * @example
     * ```ts
     * setContentTransformer((content) => ({
     *   ...content,
     *   elements: content.elements?.map(el => ({
     *     ...el,
     *     locales: { 'fr': { content: translateToFrench(el.content) } }
     *   }))
     * }));
     * ```
     */
    contentTransformer,
    setContentTransformer,
  };
}
