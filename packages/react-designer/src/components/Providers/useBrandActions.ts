import { useAtom, useSetAtom } from "jotai";
import { createCustomError, convertLegacyError, type TemplateError } from "@/lib/utils/errors";
import { getTemplateAtom, publishBrandAtom, saveBrandAtom, saveTemplateAtom } from "./api";
import {
  isTemplateLoadingAtom,
  isTemplatePublishingAtom,
  isTemplateSavingAtom,
  templateDataAtom,
  templateErrorAtom,
} from "./store";
import { useTemplateStore } from "./TemplateProvider";

export function useBrandActions() {
  // Get store for multi-instance support (even if not used directly here)
  useTemplateStore();
  const getTemplate = useSetAtom(getTemplateAtom);
  const saveBrand = useSetAtom(saveBrandAtom);
  const saveTemplate = useSetAtom(saveTemplateAtom);
  const publishBrand = useSetAtom(publishBrandAtom);
  const [isTemplateLoading, setIsTemplateLoading] = useAtom(isTemplateLoadingAtom);
  const [isTemplateSaving, setIsTemplateSaving] = useAtom(isTemplateSavingAtom);
  const [isTemplatePublishing, setIsTemplatePublishing] = useAtom(isTemplatePublishingAtom);
  const [templateError, setTemplateErrorAtom] = useAtom(templateErrorAtom);
  const [templateData, setTemplateData] = useAtom(templateDataAtom);

  // Backward-compatible setTemplateError that accepts both strings and TemplateError objects
  const setTemplateError = (error: string | TemplateError | null) => {
    if (error === null) {
      setTemplateErrorAtom(null);
    } else if (typeof error === "string") {
      setTemplateErrorAtom(createCustomError(error));
    } else {
      setTemplateErrorAtom(error);
    }
  };

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
