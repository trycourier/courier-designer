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
} from "./store";
import { useCallback } from "react";

export function useTemplateActions() {
  const getTemplate = useSetAtom(getTemplateAtom);
  const saveTemplate = useSetAtom(saveTemplateAtom);
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
