import { useAtom, useAtomValue } from "jotai";
import { getTemplateAtom, publishTemplateAtom, saveTemplateAtom } from "./api";
import {
  editorStore,
  getTemplateOverrideAtom,
  isTemplateLoadingAtom,
  isTemplatePublishingAtom,
  isTemplateSavingAtom,
  templateDataAtom,
  templateErrorAtom,
} from "./store";

export function useTemplateActions() {
  const [, defaultGetTemplate] = useAtom(getTemplateAtom);
  const [, saveTemplate] = useAtom(saveTemplateAtom);
  const [, publishTemplate] = useAtom(publishTemplateAtom);
  const [isTemplateLoading, setIsTemplateLoading] = useAtom(isTemplateLoadingAtom);
  const [isTemplateSaving, setIsTemplateSaving] = useAtom(isTemplateSavingAtom);
  const [isTemplatePublishing, setIsTemplatePublishing] = useAtom(isTemplatePublishingAtom);
  const [templateError, setTemplateError] = useAtom(templateErrorAtom);
  const templateData = useAtomValue(templateDataAtom);

  // Create a wrapper that uses custom override or falls back to default
  const getTemplate = async (options?: { includeBrand?: boolean }) => {
    const customOverride = editorStore.get(getTemplateOverrideAtom);

    if (customOverride) {
      await customOverride;
    } else {
      await defaultGetTemplate(options);
    }
  };

  return {
    getTemplate,
    saveTemplate,
    publishTemplate,
    isTemplateLoading,
    setIsTemplateLoading,
    isTemplateSaving,
    setIsTemplateSaving,
    isTemplatePublishing,
    setIsTemplatePublishing,
    templateError,
    setTemplateError,
    templateData,
  };
}
