import "@tiptap/extension-text-style";

import { Extension } from "@tiptap/core";
import { CSS_PX_REGEX } from "@/lib/utils/cssValues";

export interface FontSizeOptions {
  types: string[];
  /**
   * When false, nothing can *author* a per-run size: `setFontSize` is refused and
   * an inline `font-size` on pasted HTML is discarded rather than adopted. Hiding
   * {@link FontSizeButton} is not enough on its own — paste goes straight to
   * `parseHTML`, so a copied `<span style="font-size:28px">` still reached
   * Elemental as `font_size` with the gate off, which is exactly the write the
   * gate exists to prevent.
   *
   * The extension stays registered either way, so a mark already stored in the
   * content still loads and still round-trips. Elemental → Tiptap sets the
   * attribute directly rather than through `parseHTML`, so dropping the extension
   * (or gating the attribute itself) would silently strip values a host authored
   * while the gate was open.
   */
  enabled: boolean;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      /** Size the selected run of text, e.g. "28px". Invalid values are ignored. */
      setFontSize: (fontSize: string) => ReturnType;
      /** Drop the per-run size so the text falls back to its block/document size. */
      unsetFontSize: () => ReturnType;
    };
  }
}

/**
 * Per-run font size, stored as a `fontSize` attribute on the `textStyle` mark
 * (same shape as {@link Color}). Maps to `font_size` on an Elemental `string` /
 * `link` text-content element, which the renderer emits as an inline
 * `<span style="font-size:…">`.
 *
 * Only px values are accepted — that is the full contract the backend validates
 * the inline mark against, and anything else would be dropped at render time.
 */
export const FontSize = Extension.create<FontSizeOptions>({
  name: "fontSize",

  addOptions() {
    return {
      types: ["textStyle"],
      enabled: true,
    };
  },

  addGlobalAttributes() {
    const { enabled } = this.options;

    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => {
              if (!enabled) {
                return null;
              }
              const value = element.style.fontSize?.replace(/['"]+/g, "");
              return value && CSS_PX_REGEX.test(value) ? value : null;
            },
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize) =>
        ({ chain }) => {
          if (!this.options.enabled || !CSS_PX_REGEX.test(fontSize)) {
            return false;
          }
          return chain().setMark("textStyle", { fontSize: fontSize.trim() }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run();
        },
    };
  },
});
