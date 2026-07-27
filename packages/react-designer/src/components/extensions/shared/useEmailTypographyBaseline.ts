import { useAtomValue } from "jotai";
import { useMemo } from "react";
import {
  getTierFontSizePx,
  getTierLineHeightPx,
  isPresetSizedTier,
  resolveLineHeightPx,
  type TextTier,
} from "@/lib/constants/email-editor-tiptap-styles";
import { emailFontSizeAtom, emailLineHeightAtom } from "@/components/TemplateEditor/store";

/**
 * The px font size and line height a block ends up with when it sets neither —
 * used as the placeholder in the block's own controls so an empty field reads as
 * "inherited" instead of zero.
 *
 * Resolves in the same order as the renderer's `courier-email-text-style` helper:
 * the document base font size reaches the body tiers only (heading and subtext
 * keep their presets), while the document base line height reaches every tier and
 * otherwise follows from the font size.
 */
export const useEmailTypographyBaseline = (tier: TextTier, { quote = false } = {}) => {
  const documentFontSize = useAtomValue(emailFontSizeAtom);
  const documentLineHeight = useAtomValue(emailLineHeightAtom);

  return useMemo(() => {
    const presetFontSize = getTierFontSizePx(tier, quote);
    const presetLineHeight = getTierLineHeightPx(tier, quote);

    const inheritsDocumentFontSize = !isPresetSizedTier(tier) && Boolean(documentFontSize);
    const fontSize = inheritsDocumentFontSize ? documentFontSize! : presetFontSize;

    const lineHeight =
      documentLineHeight ??
      (inheritsDocumentFontSize
        ? (resolveLineHeightPx(fontSize) ?? presetLineHeight)
        : presetLineHeight);

    return { fontSize, lineHeight };
  }, [tier, quote, documentFontSize, documentLineHeight]);
};
