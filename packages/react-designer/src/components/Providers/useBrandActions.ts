import { useAtom, useAtomValue } from "jotai";
import { getTemplateAtom, publishBrandAtom, saveBrandAtom } from "./api";
import {
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

  return {
    getTemplate,
    saveBrand,
    publishBrand,
    isTemplateLoading,
    isTemplateSaving,
    isTemplatePublishing,
    templateError,
    templateData,
  };
}
