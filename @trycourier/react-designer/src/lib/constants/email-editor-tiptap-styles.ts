/**
 * Single source of truth for .courier-email-editor .tiptap font styles.
 * These values are applied via CSS custom properties from EmailEditorContainer
 * so styles.css can use var(--email-editor-*) and stay in sync.
 */

export const EMAIL_EDITOR_FONT_FAMILY = "Helvetica, Arial, sans-serif";

/** Paragraph and heading styles (non-blockquote) for email editor. */
export const EMAIL_EDITOR_TEXT_STYLES = {
  p: {
    color: "#000000",
    fontSize: "14px",
    lineHeight: "18px",
  },
  h1: {
    color: "#000000",
    fontSize: "32px",
    fontWeight: "600",
    lineHeight: "40px",
  },
  h2: {
    color: "#000000",
    fontSize: "24px",
    fontWeight: "600",
    lineHeight: "32px",
  },
  h3: {
    color: "#000000",
    fontSize: "18.72px",
    fontWeight: "600",
    lineHeight: "24px",
  },
  subtext: {
    color: "#8F8F8F",
    fontSize: "11px",
    lineHeight: "15px",
  },
} as const;

/**
 * Text style applied to quote body content.
 * Matches backend courier-email-text-style quote defaults.
 */
export const QUOTE_TEXT_STYLE = {
  color: "#696969",
  fontSize: "14px",
  lineHeight: "18px",
  fontStyle: "italic" as const,
} as const;

/**
 * Quote text style variants when text_style is h1/h2/h3/subtext.
 * Derives sizing from EMAIL_EDITOR_TEXT_STYLES to stay in sync.
 */
export const QUOTE_TEXT_STYLE_VARIANTS: Record<
  "h1" | "h2" | "h3" | "subtext" | "quote",
  { fontSize: string; fontWeight: string; lineHeight: string }
> = {
  h1: {
    fontSize: EMAIL_EDITOR_TEXT_STYLES.h1.fontSize,
    fontWeight: EMAIL_EDITOR_TEXT_STYLES.h1.fontWeight,
    lineHeight: EMAIL_EDITOR_TEXT_STYLES.h1.lineHeight,
  },
  h2: {
    fontSize: EMAIL_EDITOR_TEXT_STYLES.h2.fontSize,
    fontWeight: EMAIL_EDITOR_TEXT_STYLES.h2.fontWeight,
    lineHeight: EMAIL_EDITOR_TEXT_STYLES.h2.lineHeight,
  },
  h3: {
    fontSize: EMAIL_EDITOR_TEXT_STYLES.h3.fontSize,
    fontWeight: EMAIL_EDITOR_TEXT_STYLES.h3.fontWeight,
    lineHeight: EMAIL_EDITOR_TEXT_STYLES.h3.lineHeight,
  },
  subtext: {
    fontSize: EMAIL_EDITOR_TEXT_STYLES.subtext.fontSize,
    fontWeight: "normal",
    lineHeight: EMAIL_EDITOR_TEXT_STYLES.subtext.lineHeight,
  },
  quote: {
    fontSize: QUOTE_TEXT_STYLE.fontSize,
    fontWeight: "normal",
    lineHeight: QUOTE_TEXT_STYLE.lineHeight,
  },
};

/** Text tiers that carry a deliberate size preset the document base never overrides. */
export type PresetSizedTier = "h1" | "h2" | "h3" | "subtext";

/** Every tier the editor can render text in. */
export type TextTier = "text" | PresetSizedTier | "quote";

/**
 * Narrow an arbitrary `text_style` to a tier we have presets for.
 *
 * Elemental content reaches these helpers straight from the API, where
 * `text_style` is only validated on the /send path — a template can carry
 * anything. An unrecognized tier falls back to the body tier, matching how the
 * rest of the converter degrades (`textStyleToHeadingLevel[…] ?? null`) instead
 * of indexing a preset table with a key that isn't there.
 */
const toKnownTier = (tier: string | undefined, isQuote: boolean): TextTier => {
  if (tier === "h1" || tier === "h2" || tier === "h3" || tier === "subtext") return tier;
  if (tier === "quote") return "quote";
  return isQuote ? "quote" : "text";
};

/**
 * The tier's preset font size in px. Used to resolve a unitless `line_height`
 * (a multiplier is only meaningful against a font size) and as the last step of
 * the font-size fallback chain.
 */
export const getTierFontSizePx = (tier: string | undefined, isQuote = false): number => {
  const known = toKnownTier(tier, isQuote);
  if (isQuote) {
    return parseFloat(QUOTE_TEXT_STYLE_VARIANTS[known === "text" ? "quote" : known].fontSize);
  }
  if (known === "quote") return parseFloat(QUOTE_TEXT_STYLE.fontSize);
  return parseFloat(
    known === "text"
      ? EMAIL_EDITOR_TEXT_STYLES.p.fontSize
      : EMAIL_EDITOR_TEXT_STYLES[known].fontSize
  );
};

/** The tier's preset line height in px. */
export const getTierLineHeightPx = (tier: string | undefined, isQuote = false): number => {
  const known = toKnownTier(tier, isQuote);
  if (isQuote) {
    return parseFloat(QUOTE_TEXT_STYLE_VARIANTS[known === "text" ? "quote" : known].lineHeight);
  }
  if (known === "quote") return parseFloat(QUOTE_TEXT_STYLE.lineHeight);
  return parseFloat(
    known === "text"
      ? EMAIL_EDITOR_TEXT_STYLES.p.lineHeight
      : EMAIL_EDITOR_TEXT_STYLES[known].lineHeight
  );
};

/** True for the tiers the document-level base font size deliberately skips. */
export const isPresetSizedTier = (tier: TextTier): tier is PresetSizedTier =>
  tier === "h1" || tier === "h2" || tier === "h3" || tier === "subtext";

/**
 * Ratio the renderer uses to derive a line height when a font size is overridden
 * without an explicit one, so enlarged text doesn't clip.
 * Mirrors AUTO_LINE_HEIGHT_RATIO in the backend's `courier-email-text-style` helper.
 */
export const AUTO_LINE_HEIGHT_RATIO = 1.3;

/** The renderer's rule: an explicit line height wins, else scale off the font size. */
export const resolveLineHeightPx = (
  fontSize?: number | null,
  lineHeight?: number | null
): number | undefined => {
  if (lineHeight) return lineHeight;
  if (fontSize) return Math.round(fontSize * AUTO_LINE_HEIGHT_RATIO);
  return undefined;
};

/**
 * The tier a paragraph/heading block renders in.
 *
 * Anything below h3 collapses to h3, the same way the text block's node view
 * maps its tag: Elemental has no deeper heading tier.
 */
export const tierForTextBlock = (typeName: string, level?: number | null): TextTier => {
  if (typeName !== "heading") return "text";
  if (level === 1) return "h1";
  if (level === 2) return "h2";
  return "h3";
};

/**
 * What a block (or an inline run) would render at if it set nothing itself —
 * i.e. the next step down the cascade: document base, then the tier preset.
 *
 * This is the value the block-level and text-level inputs show as an editable
 * placeholder. It has to be *derived* rather than stored, because it tracks the
 * document base: raising the base font size moves every unset block with it.
 *
 * Mirrors {@link getEmailEditorDocumentStyleVars} exactly, so what the inputs
 * claim is what the canvas (and the renderer) actually applies:
 * - the base font size reaches the body tiers only; headings and subtext keep
 *   their presets;
 * - the base line height reaches every tier, and on the body tiers a base font
 *   size with no base line height auto-scales the same way the renderer does.
 */
export function resolveInheritedTypography({
  tier,
  isQuote = false,
  documentFontSize,
  documentLineHeight,
}: {
  tier: TextTier;
  isQuote?: boolean;
  documentFontSize?: number | null;
  documentLineHeight?: number | null;
}): { fontSize: number; lineHeight: number } {
  const presetFontSize = getTierFontSizePx(tier, isQuote);
  const presetLineHeight = getTierLineHeightPx(tier, isQuote);

  if (isPresetSizedTier(tier)) {
    return {
      fontSize: presetFontSize,
      lineHeight: documentLineHeight ?? presetLineHeight,
    };
  }

  return {
    fontSize: documentFontSize ?? presetFontSize,
    lineHeight: resolveLineHeightPx(documentFontSize, documentLineHeight) ?? presetLineHeight,
  };
}

export type StyleVarTier = "p" | "h1" | "h2" | "h3";

/**
 * Carries the document-level base font size to action buttons. Kept as a
 * variable (rather than threading the value through props) so the shared Button
 * node view works unchanged outside the email editor, where it resolves to the
 * renderer's 14px default.
 */
export const EMAIL_EDITOR_ACTION_FONT_SIZE_VAR = "--email-editor-action-font-size";

/** Default action label size in the renderer when nothing overrides it. */
export const EMAIL_EDITOR_ACTION_FONT_SIZE_FALLBACK = "14px";

/**
 * CSS custom properties that apply a font-size / line-height override to a
 * single text tier.
 *
 * Overrides are expressed as variables rather than plain `font-size` because the
 * `.courier-email-editor .tiptap` rules set those properties explicitly on
 * `p`/`h1`/`h2`/`h3` and would otherwise beat an inherited value. Setting the
 * variable on an ancestor makes the existing rule resolve to the override, which
 * keeps the cascade in the same order the renderer uses:
 * inline mark → block → document → tier preset.
 */
export function getTierStyleVars(
  tier: StyleVarTier,
  {
    fontSize,
    lineHeight,
    documentLineHeight,
  }: {
    fontSize?: number | null;
    lineHeight?: number | null;
    /**
     * The document-level base line height, when one is set.
     *
     * A block that sets a font size but no line height must NOT fall through to
     * the size-derived value while a document base exists: the renderer resolves
     * the document base into `lineHeight` *before* it auto-scales, so
     * `block font_size: 20px` + `document line_height: 40px` renders 40px, not
     * 26px. Without this the block's derived value — set as the same CSS variable
     * on a closer ancestor — would beat the document's.
     */
    documentLineHeight?: number | null;
  },
  { quote = false }: { quote?: boolean } = {}
): Record<string, string> {
  const vars: Record<string, string> = {};
  const prefix = quote ? "--email-editor-blockquote" : "--email-editor";

  if (fontSize) {
    vars[`${prefix}-${tier}-font-size`] = `${fontSize}px`;
  }

  const resolvedLineHeight = resolveLineHeightPx(fontSize, lineHeight ?? documentLineHeight);
  if (resolvedLineHeight) {
    vars[`${prefix}-${tier}-line-height`] = `${resolvedLineHeight}px`;
  }

  return vars;
}

/**
 * CSS custom properties that apply the document-level base font size and line
 * height on top of {@link getEmailEditorTiptapCssVars}. Set on the editor
 * container, which leaves block-level overrides (the same variables on the
 * individual block wrappers) and inline `font-size` marks free to win.
 *
 * Mirrors the renderer's `courier-email-text-style` helper: the base font size
 * reaches the body tiers only (text, quote, list) while heading and subtext tiers
 * keep their presets; the base line height applies to every tier.
 */
export function getEmailEditorDocumentStyleVars({
  fontSize,
  lineHeight,
}: {
  fontSize?: number | null;
  lineHeight?: number | null;
}): Record<string, string> {
  const vars: Record<string, string> = {
    // Body tiers get the base size, and the line height that follows from it.
    ...getTierStyleVars("p", { fontSize, lineHeight }),
    ...getTierStyleVars("p", { fontSize, lineHeight }, { quote: true }),
    // Action labels fall back to the base size too (the renderer's
    // `@textFontSize` fallback in action-block.hbs), then to 14px.
    ...(fontSize ? { [EMAIL_EDITOR_ACTION_FONT_SIZE_VAR]: `${fontSize}px` } : {}),
  };

  // Heading tiers keep their preset size, so only an explicit base line height
  // reaches them — never the size-derived one.
  if (lineHeight) {
    for (const tier of ["h1", "h2", "h3"] as const) {
      Object.assign(
        vars,
        getTierStyleVars(tier, { lineHeight }),
        getTierStyleVars(tier, { lineHeight }, { quote: true })
      );
    }
  }

  return vars;
}

/**
 * Returns CSS custom properties to set on .courier-email-editor so that
 * .courier-email-editor .tiptap rules in styles.css (using var(--email-editor-*))
 * resolve from this single source of truth.
 */
export function getEmailEditorTiptapCssVars(): Record<string, string> {
  const p = EMAIL_EDITOR_TEXT_STYLES.p;
  const h1 = EMAIL_EDITOR_TEXT_STYLES.h1;
  const h2 = EMAIL_EDITOR_TEXT_STYLES.h2;
  const h3 = EMAIL_EDITOR_TEXT_STYLES.h3;
  const quote = QUOTE_TEXT_STYLE;
  const qH1 = QUOTE_TEXT_STYLE_VARIANTS.h1;
  const qH2 = QUOTE_TEXT_STYLE_VARIANTS.h2;
  const qH3 = QUOTE_TEXT_STYLE_VARIANTS.h3;
  const qQuote = QUOTE_TEXT_STYLE_VARIANTS.quote;

  const vars: Record<string, string> = {
    "--email-editor-font-family": EMAIL_EDITOR_FONT_FAMILY,

    "--email-editor-p-color": p.color,
    "--email-editor-p-font-size": p.fontSize,
    "--email-editor-p-line-height": p.lineHeight,

    "--email-editor-h1-color": h1.color,
    "--email-editor-h1-font-size": h1.fontSize,
    "--email-editor-h1-font-weight": h1.fontWeight,
    "--email-editor-h1-line-height": h1.lineHeight,

    "--email-editor-h2-color": h2.color,
    "--email-editor-h2-font-size": h2.fontSize,
    "--email-editor-h2-font-weight": h2.fontWeight,
    "--email-editor-h2-line-height": h2.lineHeight,

    "--email-editor-h3-color": h3.color,
    "--email-editor-h3-font-size": h3.fontSize,
    "--email-editor-h3-font-weight": h3.fontWeight,
    "--email-editor-h3-line-height": h3.lineHeight,

    "--email-editor-blockquote-p-color": quote.color,
    "--email-editor-blockquote-p-font-size": qQuote.fontSize,
    "--email-editor-blockquote-p-line-height": qQuote.lineHeight,
    "--email-editor-blockquote-p-font-style": quote.fontStyle,
    "--email-editor-blockquote-p-font-weight": qQuote.fontWeight,

    "--email-editor-blockquote-h1-color": quote.color,
    "--email-editor-blockquote-h1-font-size": qH1.fontSize,
    "--email-editor-blockquote-h1-font-weight": qH1.fontWeight,
    "--email-editor-blockquote-h1-line-height": qH1.lineHeight,
    "--email-editor-blockquote-h1-font-style": quote.fontStyle,

    "--email-editor-blockquote-h2-color": quote.color,
    "--email-editor-blockquote-h2-font-size": qH2.fontSize,
    "--email-editor-blockquote-h2-font-weight": qH2.fontWeight,
    "--email-editor-blockquote-h2-line-height": qH2.lineHeight,
    "--email-editor-blockquote-h2-font-style": quote.fontStyle,

    "--email-editor-blockquote-h3-color": quote.color,
    "--email-editor-blockquote-h3-font-size": qH3.fontSize,
    "--email-editor-blockquote-h3-font-weight": qH3.fontWeight,
    "--email-editor-blockquote-h3-line-height": qH3.lineHeight,
    "--email-editor-blockquote-h3-font-style": quote.fontStyle,
  };
  return vars;
}
