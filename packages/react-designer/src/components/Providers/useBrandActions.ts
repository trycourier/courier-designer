import { useAtom, useAtomValue } from "jotai";
import { getTemplateAtom, publishBrandAtom, saveBrandAtom, saveTemplateAtom } from "./api";
import {
  editorStore,
  getTemplateOverrideAtom,
  saveTemplateOverrideAtom,
  isTemplateLoadingAtom,
  isTemplatePublishingAtom,
  isTemplateSavingAtom,
  templateDataAtom,
  templateErrorAtom,
} from "./store";

export function useBrandActions() {
  const [, getTemplate] = useAtom(getTemplateAtom);
  const [, saveBrand] = useAtom(saveBrandAtom);
  const [, defaultSaveTemplate] = useAtom(saveTemplateAtom);
  const [, publishBrand] = useAtom(publishBrandAtom);
  const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
  const isTemplateSaving = useAtomValue(isTemplateSavingAtom);
  const isTemplatePublishing = useAtomValue(isTemplatePublishingAtom);
  const templateError = useAtomValue(templateErrorAtom);
  const templateData = useAtomValue(templateDataAtom);

  // Create template actions object to pass to custom functions
  const actions = {
    isTemplateLoading,
    isTemplateSaving,
    isTemplatePublishing,
    templateError,
    templateData,
    saveBrand,
    publishBrand,
  };

  // Simple wrapper that checks for custom override or falls back to default
  const getTemplateWithOverride = async (options?: { includeBrand?: boolean }) => {
    const customOverride = editorStore.get(getTemplateOverrideAtom);
    if (customOverride) {
      await customOverride;
    } else {
      await getTemplate(options);
    }
  };

  // Simple wrapper that checks for custom saveTemplate override or falls back to default
  const saveTemplateWithOverride = async (options?: any) => {
    const customOverride = editorStore.get(saveTemplateOverrideAtom);
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
    isTemplateSaving,
    isTemplatePublishing,
    templateError,
    templateData,
  };
}
