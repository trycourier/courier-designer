import { useAtom, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ElementalChannelNode } from "@/types/elemental.types";
import {
  formatPaddingVH,
  lineHeightToPx,
  paddingShorthandToVH,
  parsePxValue,
} from "@/lib/utils/cssValues";
import {
  EMAIL_EDITOR_TEXT_STYLES,
  getEmailEditorDocumentStyleVars,
} from "@/lib/constants/email-editor-tiptap-styles";
import {
  templateEditorContentAtom,
  emailPaddingAtom,
  emailFontSizeAtom,
  emailLineHeightAtom,
  pendingAutoSaveAtom,
  setFormUpdating,
  EMAIL_DEFAULT_PADDING_HORIZONTAL,
  EMAIL_DEFAULT_PADDING_VERTICAL,
} from "../store";

/** The document-level properties this hook owns on the email channel node. */
type DocumentStyleKey = "padding" | "font_size" | "line_height";

interface UseEmailDocumentStylesOptions {
  isTemplateTransitioning?: boolean;
}

/**
 * Reads and writes the document-level email styles — body `padding`, base
 * `font_size` and base `line_height` — on the `channel: "email"` node.
 *
 * Mirrors {@link useEmailBackgroundColors}, with one deliberate difference: the
 * properties are never back-filled with defaults. An unset property means "use
 * the renderer's default", and writing one out would freeze today's default into
 * every template. The Frame/Text controls seed their inputs from the same
 * defaults instead, and `reset*` removes the property again.
 */
export function useEmailDocumentStyles(options: UseEmailDocumentStylesOptions = {}) {
  const { isTemplateTransitioning } = options;

  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
  const [emailPadding, setEmailPadding] = useAtom(emailPaddingAtom);
  const [emailFontSize, setEmailFontSize] = useAtom(emailFontSizeAtom);
  const [emailLineHeight, setEmailLineHeight] = useAtom(emailLineHeightAtom);
  const setPendingAutoSave = useSetAtom(pendingAutoSaveAtom);

  // Keep a ref to the latest content so the setters never capture stale data
  const contentRef = useRef(templateEditorContent);
  contentRef.current = templateEditorContent;

  const initialSyncDoneRef = useRef(false);
  const pendingTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      for (const id of pendingTimers.current) {
        clearTimeout(id);
        setFormUpdating(false);
      }
      pendingTimers.current = [];
    };
  }, []);

  // Re-sync from content when switching templates
  useEffect(() => {
    if (isTemplateTransitioning) {
      initialSyncDoneRef.current = false;
    }
  }, [isTemplateTransitioning]);

  /**
   * Writes the given properties onto the email channel node — `undefined`
   * removes one. Takes a set rather than one key so a multi-property reset lands
   * as a single content update and a single autosave.
   */
  const persist = useCallback(
    (updates: Partial<Record<DocumentStyleKey, string | undefined>>) => {
      const current = contentRef.current;
      if (!current) return;

      const newContent = structuredClone(current);
      const emailChannel = newContent.elements?.find(
        (el): el is ElementalChannelNode & { channel: "email" } =>
          el.type === "channel" && "channel" in el && el.channel === "email"
      );
      if (!emailChannel) return;

      for (const [key, value] of Object.entries(updates) as [
        DocumentStyleKey,
        string | undefined,
      ][]) {
        if (value === undefined) {
          delete emailChannel[key];
        } else {
          emailChannel[key] = value;
        }
      }

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
    [setTemplateEditorContent, setPendingAutoSave]
  );

  /**
   * The vertical/horizontal pair the Frame control edits. Falls back to the
   * renderer's default inset when `padding` is unset, so the inputs always show
   * the spacing the email will actually have.
   */
  const paddingVH = useMemo(() => {
    return (
      paddingShorthandToVH(emailPadding) ?? {
        vertical: EMAIL_DEFAULT_PADDING_VERTICAL,
        horizontal: EMAIL_DEFAULT_PADDING_HORIZONTAL,
      }
    );
  }, [emailPadding]);

  /** True once `padding` is explicitly set, i.e. the reset affordance applies. */
  const hasPaddingOverride = emailPadding !== null;

  const handlePaddingChange = useCallback(
    (next: { vertical?: number; horizontal?: number }) => {
      const vertical = next.vertical ?? paddingVH.vertical;
      const horizontal = next.horizontal ?? paddingVH.horizontal;
      const value = formatPaddingVH(vertical, horizontal);
      setEmailPadding(value);
      persist({ padding: value });
    },
    [paddingVH, persist, setEmailPadding]
  );

  const resetPadding = useCallback(() => {
    setEmailPadding(null);
    persist({ padding: undefined });
  }, [persist, setEmailPadding]);

  const handleFontSizeChange = useCallback(
    (value: number | null) => {
      const next = value && value > 0 ? value : null;
      setEmailFontSize(next);
      persist({ font_size: next === null ? undefined : `${next}px` });
    },
    [persist, setEmailFontSize]
  );

  const handleLineHeightChange = useCallback(
    (value: number | null) => {
      const next = value && value > 0 ? value : null;
      setEmailLineHeight(next);
      persist({ line_height: next === null ? undefined : `${next}px` });
    },
    [persist, setEmailLineHeight]
  );

  /** True once either base text property is set, i.e. the reset affordance applies. */
  const hasTypographyOverride = emailFontSize !== null || emailLineHeight !== null;

  const resetTypography = useCallback(() => {
    setEmailFontSize(null);
    setEmailLineHeight(null);
    persist({ font_size: undefined, line_height: undefined });
  }, [persist, setEmailFontSize, setEmailLineHeight]);

  // Sync the atoms from the email channel node on load, template switch, or when
  // the content diverges from the atoms (external replacement).
  useEffect(() => {
    if (!templateEditorContent?.elements) return;

    const emailChannel = templateEditorContent.elements.find(
      (el): el is ElementalChannelNode & { channel: "email" } =>
        el.type === "channel" && el.channel === "email"
    );
    if (!emailChannel) return;

    const contentPadding = emailChannel.padding ?? null;
    const contentFontSize = parsePxValue(emailChannel.font_size) ?? null;
    // A unitless base multiplier is resolved against the plain-text preset,
    // the tier the document base font size applies to.
    const contentLineHeight =
      lineHeightToPx(
        emailChannel.line_height,
        contentFontSize ?? parseFloat(EMAIL_EDITOR_TEXT_STYLES.p.fontSize)
      ) ?? null;

    if (
      initialSyncDoneRef.current &&
      contentPadding === emailPadding &&
      contentFontSize === emailFontSize &&
      contentLineHeight === emailLineHeight
    ) {
      return;
    }

    setEmailPadding(contentPadding);
    setEmailFontSize(contentFontSize);
    setEmailLineHeight(contentLineHeight);
    initialSyncDoneRef.current = true;
  }, [
    templateEditorContent,
    emailPadding,
    emailFontSize,
    emailLineHeight,
    setEmailPadding,
    setEmailFontSize,
    setEmailLineHeight,
  ]);

  /** CSS variables that apply the document base to the editor's preview. */
  const documentStyleVars = useMemo(
    () =>
      getEmailEditorDocumentStyleVars({
        fontSize: emailFontSize,
        lineHeight: emailLineHeight,
      }),
    [emailFontSize, emailLineHeight]
  );

  return {
    emailPaddingVertical: paddingVH.vertical,
    emailPaddingHorizontal: paddingVH.horizontal,
    hasPaddingOverride,
    handlePaddingChange,
    resetPadding,
    emailFontSize,
    handleFontSizeChange,
    emailLineHeight,
    handleLineHeightChange,
    hasTypographyOverride,
    resetTypography,
    documentStyleVars,
  };
}
