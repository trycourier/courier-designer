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
  const pendingTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // On unmount, clear pending timers and balance the formUpdating counter
  // for each cancelled timer (each pending timer has an unmatched setFormUpdating(true)).
  useEffect(() => {
    return () => {
      for (const id of pendingTimers.current) {
        clearTimeout(id);
        setFormUpdating(false);
      }
      pendingTimers.current = [];
    };
  }, []);

  // Reset sync flag when template transitions so colors re-sync for the new template
  useEffect(() => {
    if (isTemplateTransitioning) {
      initialSyncDoneRef.current = false;
    }
  }, [isTemplateTransitioning]);

  const handleEmailColorChange = useCallback(
    (key: "background_color" | "content_body_color", value: string) => {
      if (key === "background_color") {
        setEmailBackgroundColor(value);
      } else {
        setEmailContentBodyColor(value);
      }

      const current = contentRef.current;
      if (!current) return;

      const newContent = structuredClone(current);
      const emailChannel = newContent.elements?.find(
        (el): el is ElementalChannelNode & { channel: "email" } =>
          el.type === "channel" && "channel" in el && el.channel === "email"
      );
      if (!emailChannel) return;

      emailChannel[key] = value;

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
    [
      setTemplateEditorContent,
      setPendingAutoSave,
      setEmailBackgroundColor,
      setEmailContentBodyColor,
    ]
  );

  // Sync color atoms from the email channel node on initial load, template switch,
  // or when the content's color values diverge from the current atoms (external replacement).
  // When color properties are missing from the channel node, back-fills them with defaults
  // via handleEmailColorChange so they're persisted to the elemental content.
  useEffect(() => {
    if (!templateEditorContent?.elements) return;

    const emailChannel = templateEditorContent.elements.find(
      (el): el is ElementalChannelNode & { channel: "email" } =>
        el.type === "channel" && el.channel === "email"
    );
    if (!emailChannel) return;

    const contentBg = emailChannel.background_color ?? EMAIL_DEFAULT_BACKGROUND_COLOR;
    const contentBody = emailChannel.content_body_color ?? EMAIL_DEFAULT_CONTENT_BODY_COLOR;

    if (initialSyncDoneRef.current) {
      const bgRef = emailBackgroundColor;
      const bodyRef = emailContentBodyColor;
      if (contentBg === bgRef && contentBody === bodyRef) return;
    }

    setEmailBackgroundColor(contentBg);
    setEmailContentBodyColor(contentBody);
    initialSyncDoneRef.current = true;

    if (emailChannel.background_color === undefined) {
      handleEmailColorChange("background_color", contentBg);
    }
    if (emailChannel.content_body_color === undefined) {
      handleEmailColorChange("content_body_color", contentBody);
    }
  }, [
    templateEditorContent,
    emailBackgroundColor,
    emailContentBodyColor,
    setEmailBackgroundColor,
    setEmailContentBodyColor,
    handleEmailColorChange,
  ]);

  return {
    emailBackgroundColor,
    emailContentBodyColor,
    handleEmailColorChange,
  };
}
