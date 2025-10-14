import { useAtom, useSetAtom } from "jotai";
import { templateEditorContentAtom } from "../TemplateEditor/store";
import { createCustomError, convertLegacyError, type TemplateError } from "@/lib/utils/errors";
import { getTemplateAtom, publishTemplateAtom, saveTemplateAtom } from "./api";
import {
  isTemplateLoadingAtom,
  isTemplatePublishingAtom,
  isTemplateSavingAtom,
  templateDataAtom,
  templateErrorAtom,
  type MessageRouting,
} from "./store";
import { useTemplateStore } from "./TemplateProvider";
import { useMemo, useCallback } from "react";

export function useTemplateActions() {
  // Get the store and override functions from context
  const { overrideFunctions } = useTemplateStore();

  const defaultGetTemplate = useSetAtom(getTemplateAtom);
  const defaultSaveTemplate = useSetAtom(saveTemplateAtom);
  const publishTemplate = useSetAtom(publishTemplateAtom);
  const [isTemplateLoading, setIsTemplateLoading] = useAtom(isTemplateLoadingAtom);
  const [isTemplateSaving, setIsTemplateSaving] = useAtom(isTemplateSavingAtom);
  const [isTemplatePublishing, setIsTemplatePublishing] = useAtom(isTemplatePublishingAtom);
  const [templateError, setTemplateErrorAtom] = useAtom(templateErrorAtom);
  const [templateData, setTemplateData] = useAtom(templateDataAtom);
  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);

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

  // Create template actions object to pass to custom functions
  const actions = useMemo(
    () => ({
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
      // New error helper functions
      createCustomError,
      convertLegacyError,
    }),
    [
      isTemplateLoading,
      isTemplatePublishing,
      isTemplateSaving,
      publishTemplate,
      setIsTemplateLoading,
      setIsTemplatePublishing,
      setIsTemplateSaving,
      setTemplateData,
      setTemplateEditorContent,
      setTemplateError,
      templateData,
      templateEditorContent,
      templateError,
    ]
  );

  // Create a wrapper that uses custom override or falls back to default
  const getTemplate = useCallback(
    async (options?: { includeBrand?: boolean }) => {
      const customOverride = overrideFunctions.getTemplate;

      if (typeof customOverride === "function") {
        await customOverride(actions);
      } else {
        await defaultGetTemplate(options);
      }
    },
    [actions, defaultGetTemplate, overrideFunctions]
  );

  // Create a wrapper that uses custom saveTemplate override or falls back to default
  const saveTemplate = useCallback(
    async (options?: MessageRouting) => {
      const customOverride = overrideFunctions.saveTemplate;

      if (typeof customOverride === "function") {
        await customOverride(actions, options);
      } else {
        await defaultSaveTemplate(options);
      }
    },
    [actions, defaultSaveTemplate, overrideFunctions]
  );

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
    setTemplateError, // Backward-compatible function that accepts strings or TemplateError objects
    templateData,
    setTemplateData,
    templateEditorContent,
    setTemplateEditorContent,
    // New error helper functions
    createCustomError,
    convertLegacyError,
  };
}
