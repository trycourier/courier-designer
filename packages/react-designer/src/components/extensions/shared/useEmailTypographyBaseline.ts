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
export const useEmailTypographyBaseline = (
  tier: TextTier,
  {
    quote = false,
    /**
     * The block's own font-size override, when it has one.
     *
     * The line-spacing placeholder has to mean "what you get if you leave this
     * empty", and a block that sets only a font size gets an auto-scaled line
     * height — so the placeholder must scale with it, not sit on the tier preset.
     */
    blockFontSize,
  }: { quote?: boolean; blockFontSize?: number | null } = {}
) => {
  const documentFontSize = useAtomValue(emailFontSizeAtom);
  const documentLineHeight = useAtomValue(emailLineHeightAtom);

  return useMemo(() => {
    const presetFontSize = getTierFontSizePx(tier, quote);
    const presetLineHeight = getTierLineHeightPx(tier, quote);

    const inheritsDocumentFontSize = !isPresetSizedTier(tier) && Boolean(documentFontSize);
    const inheritedFontSize = inheritsDocumentFontSize ? documentFontSize! : presetFontSize;
    const fontSize = blockFontSize || inheritedFontSize;

    // Same order the renderer resolves in: an explicit document base wins over
    // the size-derived value; a size override with no base scales off itself.
    const derivesLineHeight = Boolean(blockFontSize) || inheritsDocumentFontSize;
    const lineHeight =
      documentLineHeight ??
      (derivesLineHeight ? (resolveLineHeightPx(fontSize) ?? presetLineHeight) : presetLineHeight);

    return { fontSize, lineHeight };
  }, [tier, quote, blockFontSize, documentFontSize, documentLineHeight]);
};
