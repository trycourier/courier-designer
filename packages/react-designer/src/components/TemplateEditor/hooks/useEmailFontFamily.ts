import { useAtom, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ElementalChannelNode } from "@/types/elemental.types";
import { EMAIL_EDITOR_FONT_FAMILY } from "@/lib/constants/email-editor-tiptap-styles";
import { parseFontFamily, buildFontFamily } from "@/lib/utils/fontFamily";
import {
  templateEditorContentAtom,
  emailFontFamilyAtom,
  pendingAutoSaveAtom,
  setFormUpdating,
} from "../store";

interface UseEmailFontFamilyOptions {
  isTemplateTransitioning?: boolean;
}

export function useEmailFontFamily(options: UseEmailFontFamilyOptions = {}) {
  const { isTemplateTransitioning } = options;

  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
  const [emailFontFamily, setEmailFontFamily] = useAtom(emailFontFamilyAtom);
  const setPendingAutoSave = useSetAtom(pendingAutoSaveAtom);

  const contentRef = useRef(templateEditorContent);
  contentRef.current = templateEditorContent;

  const initialSyncDoneRef = useRef(false);
  const pendingTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const emailFallbackFont = useMemo(
    () => parseFontFamily(emailFontFamily).fallback,
    [emailFontFamily]
  );

  useEffect(() => {
    return () => {
      for (const id of pendingTimers.current) {
        clearTimeout(id);
        setFormUpdating(false);
      }
      pendingTimers.current = [];
    };
  }, []);

  useEffect(() => {
    if (isTemplateTransitioning) {
      initialSyncDoneRef.current = false;
    }
  }, [isTemplateTransitioning]);

  useEffect(() => {
    if (!templateEditorContent?.elements) return;

    const emailChannel = templateEditorContent.elements.find(
      (el): el is ElementalChannelNode & { channel: "email" } =>
        el.type === "channel" && el.channel === "email"
    );
    if (!emailChannel) return;

    const contentFont = emailChannel.font_family ?? EMAIL_EDITOR_FONT_FAMILY;

    if (initialSyncDoneRef.current) {
      if (contentFont === emailFontFamily) return;
    }

    setEmailFontFamily(contentFont);
    initialSyncDoneRef.current = true;
  }, [templateEditorContent, emailFontFamily, setEmailFontFamily]);

  const persistFontFamily = useCallback(
    (value: string) => {
      setEmailFontFamily(value);

      const current = contentRef.current;
      if (!current) return;

      const newContent = structuredClone(current);
      const emailChannel = newContent.elements?.find(
        (el): el is ElementalChannelNode & { channel: "email" } =>
          el.type === "channel" && "channel" in el && el.channel === "email"
      );
      if (!emailChannel) return;

      emailChannel.font_family = value;

      contentRef.current = newContent;

      setFormUpdating(true);
      setTemplateEditorContent(newContent);
      setPendingAutoSave(newContent);
      const timerId = setTimeout(() => {
        setFormUpdating(false);
        pendingTimers.current = pendingTimers.current.filter((id) => id !== timerId);
      }, 600);
      pendingTimers.current.push(timerId);
    },
    [setTemplateEditorContent, setPendingAutoSave, setEmailFontFamily]
  );

  const handleFontFamilyChange = useCallback(
    (selectedFontFamily: string) => {
      const { primary: newPrimary } = parseFontFamily(selectedFontFamily);
      const { fallback: currentFallback } = parseFontFamily(emailFontFamily);
      persistFontFamily(buildFontFamily(newPrimary, currentFallback));
    },
    [emailFontFamily, persistFontFamily]
  );

  const handleFallbackChange = useCallback(
    (fallbackName: string) => {
      const { primary } = parseFontFamily(emailFontFamily);
      const newFontFamily = buildFontFamily(primary, fallbackName);
      persistFontFamily(newFontFamily);
    },
    [emailFontFamily, persistFontFamily]
  );

  return {
    emailFontFamily,
    emailFallbackFont,
    handleFontFamilyChange,
    handleFallbackChange,
  };
}
