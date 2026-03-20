import { useAtom, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import type { ElementalChannelNode } from "@/types/elemental.types";
import {
  templateEditorContentAtom,
  emailBackgroundColorAtom,
  emailContentBodyColorAtom,
  pendingAutoSaveAtom,
  setFormUpdating,
  EMAIL_DEFAULT_BACKGROUND_COLOR,
  EMAIL_DEFAULT_CONTENT_BODY_COLOR,
} from "../store";

interface UseEmailBackgroundColorsOptions {
  isTemplateTransitioning?: boolean;
}

export function useEmailBackgroundColors(options: UseEmailBackgroundColorsOptions = {}) {
  const { isTemplateTransitioning } = options;

  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
  const [emailBackgroundColor, setEmailBackgroundColor] = useAtom(emailBackgroundColorAtom);
  const [emailContentBodyColor, setEmailContentBodyColor] = useAtom(emailContentBodyColorAtom);
  const setPendingAutoSave = useSetAtom(pendingAutoSaveAtom);

  // Keep a ref to the latest content so handleEmailColorChange never captures stale data
  const contentRef = useRef(templateEditorContent);
  contentRef.current = templateEditorContent;

  const initialSyncDoneRef = useRef(false);

  // Reset sync flag when template transitions so colors re-sync for the new template
  useEffect(() => {
    if (isTemplateTransitioning) {
      initialSyncDoneRef.current = false;
    }
  }, [isTemplateTransitioning]);

  // Sync color atoms from the email channel node — only on initial load / template switch
  useEffect(() => {
    if (initialSyncDoneRef.current) return;
    if (!templateEditorContent?.elements) return;

    const emailChannel = templateEditorContent.elements.find(
      (el): el is ElementalChannelNode & { channel: "email" } =>
        el.type === "channel" && el.channel === "email"
    );
    if (!emailChannel) return;

    setEmailBackgroundColor(emailChannel.background_color ?? EMAIL_DEFAULT_BACKGROUND_COLOR);
    setEmailContentBodyColor(emailChannel.content_body_color ?? EMAIL_DEFAULT_CONTENT_BODY_COLOR);
    initialSyncDoneRef.current = true;
  }, [templateEditorContent, setEmailBackgroundColor, setEmailContentBodyColor]);

  const handleEmailColorChange = useCallback(
    (key: "background_color" | "content_body_color", value: string) => {
      if (key === "background_color") {
        setEmailBackgroundColor(value);
      } else {
        setEmailContentBodyColor(value);
      }

      const current = contentRef.current;
      if (!current) return;

      const newContent = JSON.parse(JSON.stringify(current));
      const emailChannel = newContent.elements?.find(
        (el: ElementalChannelNode) => el.type === "channel" && el.channel === "email"
      );
      if (!emailChannel) return;

      emailChannel[key] = value;

      // Update the ref immediately so a second call within the same tick sees this change
      contentRef.current = newContent;

      // Prevent the editor restoration effect and selection effects from running
      // during color-only changes (which would re-focus a text block).
      // 600ms covers the 500ms subject-sync debounce in EmailEditor.
      setFormUpdating(true);
      setTemplateEditorContent(newContent);
      setPendingAutoSave(newContent);
      setTimeout(() => {
        setFormUpdating(false);
      }, 600);
    },
    [
      setTemplateEditorContent,
      setPendingAutoSave,
      setEmailBackgroundColor,
      setEmailContentBodyColor,
    ]
  );

  return {
    emailBackgroundColor,
    emailContentBodyColor,
    handleEmailColorChange,
  };
}
