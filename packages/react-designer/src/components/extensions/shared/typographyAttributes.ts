/**
 * Shared TipTap attribute definitions for the block-level typography overrides
 * (`font_size` / `line_height` in Elemental). Spread into a block extension's
 * `addAttributes()` return.
 *
 * Stored as px numbers; `null` means "inherit" — the document-level base, then
 * the tier preset. Rendered as data attributes only, because the visible styling
 * is applied by each block's node view (which sets the matching
 * `--email-editor-*` CSS variable so the `.tiptap` tier rules resolve to it).
 */
const parseNumericAttribute = (raw: string | null): number | null => {
  if (raw === null || raw === "") return null;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const typographyAttributes = {
  fontSize: {
    default: null as number | null,
    parseHTML: (element: HTMLElement): number | null =>
      parseNumericAttribute(element.getAttribute("data-font-size")),
    renderHTML: (attributes: Record<string, unknown>) => {
      if (!attributes.fontSize) return {};
      return { "data-font-size": String(attributes.fontSize) };
    },
  },
  lineHeight: {
    default: null as number | null,
    parseHTML: (element: HTMLElement): number | null =>
      parseNumericAttribute(element.getAttribute("data-line-height")),
    renderHTML: (attributes: Record<string, unknown>) => {
      if (!attributes.lineHeight) return {};
      return { "data-line-height": String(attributes.lineHeight) };
    },
  },
};
