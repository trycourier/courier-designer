import { useAtom } from "jotai";
import { createCustomError, convertLegacyError, type TemplateError } from "@/lib/utils/errors";
import { getTemplateAtom, publishBrandAtom, saveBrandAtom, saveTemplateAtom } from "./api";
import {
  getTemplateOverrideAtom,
  saveTemplateOverrideAtom,
  isTemplateLoadingAtom,
  isTemplatePublishingAtom,
  isTemplateSavingAtom,
  templateDataAtom,
  templateErrorAtom,
  type MessageRouting,
  type TemplateActions,
} from "./store";
import { useTemplateStore } from "./TemplateProvider";

export function useBrandActions() {
  const { store } = useTemplateStore();
  const [, getTemplate] = useAtom(getTemplateAtom);
  const [, saveBrand] = useAtom(saveBrandAtom);
  const [, defaultSaveTemplate] = useAtom(saveTemplateAtom);
  const [, publishBrand] = useAtom(publishBrandAtom);
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

  // Create template actions object to pass to custom functions - must match TemplateActions interface
  const actions: TemplateActions = {
    getTemplate: async () => {}, // Placeholder to avoid recursion
    saveTemplate: async () => {}, // Placeholder to avoid recursion
    publishTemplate: publishBrand,
    isTemplateLoading,
    setIsTemplateLoading,
    isTemplateSaving,
    setIsTemplateSaving,
    isTemplatePublishing,
    setIsTemplatePublishing,
    templateError,
    setTemplateError,
    templateData,
    setTemplateData,
    templateEditorContent: null, // Brand actions don't use editor content
    setTemplateEditorContent: () => {}, // No-op for brand actions
    createCustomError,
    convertLegacyError,
  };

  // Simple wrapper that checks for custom override or falls back to default
  const getTemplateWithOverride = async (options?: { includeBrand?: boolean }) => {
    const customOverride = store.get(getTemplateOverrideAtom);
    if (customOverride) {
      await customOverride;
    } else {
      await getTemplate(options);
    }
  };

  // Simple wrapper that checks for custom saveTemplate override or falls back to default
  const saveTemplateWithOverride = async (options?: MessageRouting) => {
    const customOverride = store.get(saveTemplateOverrideAtom);
    if (customOverride) {
      await customOverride(actions, options);
    } else {
      await defaultSaveTemplate(options);
    }
  };

  return {
    getTemplate: getTemplateWithOverride,
    saveTemplate: saveTemplateWithOverride,
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
