import { useAtomValue } from "jotai";
import { useMemo } from "react";
import {
  resolveInheritedTypography,
  type TextTier,
} from "@/lib/constants/email-editor-tiptap-styles";
import { emailFontSizeAtom, emailLineHeightAtom } from "../store";

/**
 * The font size and line spacing a block of `tier` renders at while it sets
 * nothing of its own — the document base, then the tier preset.
 *
 * The block-level inputs show this as an editable placeholder: a real number the
 * author can see and type over, that keeps tracking the document base until they
 * do. Reading the document atoms here (rather than taking them as props) keeps
 * every form in step with the Email styles panel without threading the values
 * through four component trees.
 *
 * @see resolveInheritedTypography for how the cascade is resolved.
 */
export function useInheritedTypography({
  tier,
  isQuote = false,
}: {
  tier: TextTier;
  isQuote?: boolean;
}): { fontSize: number; lineHeight: number } {
  const documentFontSize = useAtomValue(emailFontSizeAtom);
  const documentLineHeight = useAtomValue(emailLineHeightAtom);

  return useMemo(
    () => resolveInheritedTypography({ tier, isQuote, documentFontSize, documentLineHeight }),
    [tier, isQuote, documentFontSize, documentLineHeight]
  );
}
