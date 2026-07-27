import "@tiptap/extension-text-style";

import { Extension } from "@tiptap/core";
import { CSS_PX_REGEX } from "@/lib/utils/cssValues";

export interface FontSizeOptions {
  types: string[];
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
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => {
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
          if (!CSS_PX_REGEX.test(fontSize)) {
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
