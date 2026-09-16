import { useAtom, useSetAtom } from "@/lib/store";
import { templateRefetchTokenAtom } from "./hooks/queryState";
import { useCallback } from "react";
import { createCustomError, convertLegacyError, type TemplateError } from "@/lib/utils/errors";
import { CourierApiError } from "@/services/graphql-client";
import { useBrandMutations } from "./hooks/useBrandMutations";
import { useTemplateMutations } from "./hooks/useTemplateMutations";
import {
  isTemplateLoadingAtom,
  isTemplatePublishingAtom,
  isTemplateSavingAtom,
  templateDataAtom,
  templateErrorAtom,
} from "./store";

export function useBrandActions() {
  const refetchTemplate = useSetAtom(templateRefetchTokenAtom);
  const brand = useBrandMutations();
  const { save: templateSave } = useTemplateMutations();

  const [isTemplateLoading, setIsTemplateLoading] = useAtom(isTemplateLoadingAtom);
  const [isTemplateSaving, setIsTemplateSaving] = useAtom(isTemplateSavingAtom);
  const [isTemplatePublishing, setIsTemplatePublishing] = useAtom(isTemplatePublishingAtom);
  const [templateError, setTemplateErrorAtom] = useAtom(templateErrorAtom);
  const [templateData, setTemplateData] = useAtom(templateDataAtom);
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

  const getTemplate = useCallback(() => {
    refetchTemplate((token) => token + 1);
  }, [refetchTemplate]);

  const saveBrand = useCallback(
    async (settings?: Record<string, unknown>) => {
      try {
        return await brand.save.mutateAsync(settings);
      } catch (error) {
        publishError(error, "Failed to save brand settings");
        throw error;
      }
    },
    [brand.save, publishError]
  );

  const publishBrand = useCallback(async () => {
    try {
      return await brand.publish.mutateAsync();
    } catch (error) {
      publishError(error, "Failed to publish brand");
      throw error;
    }
  }, [brand.publish, publishError]);

  const saveTemplate = useCallback(
    async (options?: Parameters<typeof templateSave.mutateAsync>[0]) => {
      try {
        return await templateSave.mutateAsync(options);
      } catch (error) {
        publishError(error, "Failed to save template");
        throw error;
      }
    },
    [templateSave, publishError]
  );

  return {
    getTemplate,
    saveTemplate,
    saveBrand,
    publishBrand,
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
    // New error helper functions
    createCustomError,
    convertLegacyError,
  };
}
