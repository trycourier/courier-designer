import { useAtom, useAtomValue, useSetAtom } from "@/lib/store";
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
import { commitDocumentAtom } from "@/components/TemplateEditor/documentStore";

interface UseEmailFontFamilyOptions {
  isTemplateTransitioning?: boolean;
}

export function useEmailFontFamily(options: UseEmailFontFamilyOptions = {}) {
  const { isTemplateTransitioning } = options;

  const templateEditorContent = useAtomValue(templateEditorContentAtom);
  const commitDocument = useSetAtom(commitDocumentAtom);
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
      commitDocument(newContent);
      setPendingAutoSave(newContent);
      const timerId = setTimeout(() => {
        setFormUpdating(false);
        pendingTimers.current = pendingTimers.current.filter((id) => id !== timerId);
      }, 600);
      pendingTimers.current.push(timerId);
    },
    [commitDocument, setPendingAutoSave, setEmailFontFamily]
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
    (selectedFallbackFontFamily: string) => {
      const { primary } = parseFontFamily(emailFontFamily);
      persistFontFamily(buildFontFamily(primary, selectedFallbackFontFamily));
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
