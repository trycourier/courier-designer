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
