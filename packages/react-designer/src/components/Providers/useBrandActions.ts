import { useAtom, useAtomValue } from "jotai";
import { getTemplateAtom, publishBrandAtom, saveBrandAtom } from "./api";
import {
  editorStore,
  getTemplateOverrideAtom,
  isTemplateLoadingAtom,
  isTemplatePublishingAtom,
  isTemplateSavingAtom,
  templateDataAtom,
  templateErrorAtom,
} from "./store";

export function useBrandActions() {
  const [, getTemplate] = useAtom(getTemplateAtom);
  const [, saveBrand] = useAtom(saveBrandAtom);
  const [, publishBrand] = useAtom(publishBrandAtom);
  const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
  const isTemplateSaving = useAtomValue(isTemplateSavingAtom);
  const isTemplatePublishing = useAtomValue(isTemplatePublishingAtom);
  const templateError = useAtomValue(templateErrorAtom);
  const templateData = useAtomValue(templateDataAtom);

  // Simple wrapper that checks for custom override or falls back to default
  const getTemplateWithOverride = async (options?: { includeBrand?: boolean }) => {
    const customOverride = editorStore.get(getTemplateOverrideAtom);
    if (customOverride) {
      await customOverride;
    } else {
      await getTemplate(options);
    }
  };

  return {
    getTemplate: getTemplateWithOverride,
    saveBrand,
    publishBrand,
    isTemplateLoading,
    isTemplateSaving,
    isTemplatePublishing,
    templateError,
    templateData,
  };
}
