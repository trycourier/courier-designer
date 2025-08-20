import { useAtom, useSetAtom } from "jotai";
import { templateEditorContentAtom } from "../TemplateEditor/store";
import { getTemplateAtom, publishTemplateAtom, saveTemplateAtom } from "./api";
import {
  isTemplateLoadingAtom,
  isTemplatePublishingAtom,
  isTemplateSavingAtom,
  templateDataAtom,
  templateErrorAtom,
} from "./store";
import { overrideFunctions } from "./TemplateProvider";

export function useTemplateActions() {
  const defaultGetTemplate = useSetAtom(getTemplateAtom);
  const defaultSaveTemplate = useSetAtom(saveTemplateAtom);
  const publishTemplate = useSetAtom(publishTemplateAtom);
  const [isTemplateLoading, setIsTemplateLoading] = useAtom(isTemplateLoadingAtom);
  const [isTemplateSaving, setIsTemplateSaving] = useAtom(isTemplateSavingAtom);
  const [isTemplatePublishing, setIsTemplatePublishing] = useAtom(isTemplatePublishingAtom);
  const [templateError, setTemplateError] = useAtom(templateErrorAtom);
  const [templateData, setTemplateData] = useAtom(templateDataAtom);
  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);

  // Create template actions object to pass to custom functions
  const actions = {
    getTemplate: async () => {}, // Placeholder to avoid recursion
    saveTemplate: async () => {}, // Placeholder to avoid recursion
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
    setTemplateData,
    templateEditorContent,
    setTemplateEditorContent,
  };

  // Create a wrapper that uses custom override or falls back to default
  const getTemplate = async (options?: { includeBrand?: boolean }) => {
    const customOverride = overrideFunctions.getTemplate;

    if (typeof customOverride === "function") {
      await customOverride(actions);
    } else {
      await defaultGetTemplate(options);
    }
  };

  // Create a wrapper that uses custom saveTemplate override or falls back to default
  const saveTemplate = async (options?: any) => {
    const customOverride = overrideFunctions.saveTemplate;

    if (typeof customOverride === "function") {
      await customOverride(actions, options);
    } else {
      await defaultSaveTemplate(options);
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
    setTemplateData,
    templateEditorContent,
    setTemplateEditorContent,
  };
}
