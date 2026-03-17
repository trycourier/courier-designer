import { useAtom, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import type { ElementalChannelNode } from "@/types/elemental.types";
import {
  templateEditorContentAtom,
  emailBackgroundColorAtom,
  emailContentBackgroundColorAtom,
  pendingAutoSaveAtom,
  EMAIL_DEFAULT_BACKGROUND_COLOR,
  EMAIL_DEFAULT_CONTENT_BACKGROUND_COLOR,
} from "../store";

interface UseEmailBackgroundColorsOptions {
  isTemplateTransitioning?: boolean;
}

export function useEmailBackgroundColors(options: UseEmailBackgroundColorsOptions = {}) {
  const { isTemplateTransitioning } = options;

  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
  const [emailBackgroundColor, setEmailBackgroundColor] = useAtom(emailBackgroundColorAtom);
  const [emailContentBackgroundColor, setEmailContentBackgroundColor] = useAtom(
    emailContentBackgroundColorAtom
  );
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
    setEmailContentBackgroundColor(
      emailChannel.content_background_color ?? EMAIL_DEFAULT_CONTENT_BACKGROUND_COLOR
    );
    initialSyncDoneRef.current = true;
  }, [templateEditorContent, setEmailBackgroundColor, setEmailContentBackgroundColor]);

  const handleEmailColorChange = useCallback(
    (key: "background_color" | "content_background_color", value: string) => {
      if (key === "background_color") {
        setEmailBackgroundColor(value);
      } else {
        setEmailContentBackgroundColor(value);
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

      setTemplateEditorContent(newContent);
      setPendingAutoSave(newContent);
    },
    [
      setTemplateEditorContent,
      setPendingAutoSave,
      setEmailBackgroundColor,
      setEmailContentBackgroundColor,
    ]
  );

  return {
    emailBackgroundColor,
    emailContentBackgroundColor,
    handleEmailColorChange,
  };
}
