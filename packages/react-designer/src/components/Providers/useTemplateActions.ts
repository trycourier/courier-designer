import { useAtom, useSetAtom } from "jotai";
import {
  templateEditorContentAtom,
  contentTransformerAtom,
  type ContentTransformer,
} from "../TemplateEditor/store";
import { createCustomError, convertLegacyError, type TemplateError } from "@/lib/utils/errors";
import {
  getTemplateAtom,
  publishTemplateAtom,
  saveTemplateAtom,
  duplicateTemplateAtom,
  type DuplicateTemplateOptions,
  type DuplicateTemplateResult,
} from "./api";
import {
  isTemplateLoadingAtom,
  isTemplatePublishingAtom,
  isTemplateSavingAtom,
  templateDataAtom,
  templateErrorAtom,
} from "./store";
import { useCallback } from "react";

// Re-export types for external use
export type { ContentTransformer, DuplicateTemplateOptions, DuplicateTemplateResult };

export function useTemplateActions() {
  const getTemplate = useSetAtom(getTemplateAtom);
  const saveTemplate = useSetAtom(saveTemplateAtom);
  const publishTemplate = useSetAtom(publishTemplateAtom);
  const duplicateTemplate = useSetAtom(duplicateTemplateAtom);
  const [isTemplateLoading, setIsTemplateLoading] = useAtom(isTemplateLoadingAtom);
  const [isTemplateSaving, setIsTemplateSaving] = useAtom(isTemplateSavingAtom);
  const [isTemplatePublishing, setIsTemplatePublishing] = useAtom(isTemplatePublishingAtom);
  const [templateError, setTemplateErrorAtom] = useAtom(templateErrorAtom);
  const [templateData, setTemplateData] = useAtom(templateDataAtom);
  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
  const [contentTransformer, setContentTransformer] = useAtom(contentTransformerAtom);

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
