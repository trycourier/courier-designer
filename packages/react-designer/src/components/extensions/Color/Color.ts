import "@tiptap/extension-text-style";

import { Extension } from "@tiptap/core";
import { isBrandColorRef, brandColorRefToCSSVar } from "@/lib/utils/brandColors";

export interface ColorOptions {
  types: string[];
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    color: {
      setColor: (color: string) => ReturnType;
      unsetColor: () => ReturnType;
    };
  }
}

export const Color = Extension.create<ColorOptions>({
  name: "color",

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
          color: {
            default: null,
            parseHTML: (element) => {
              const brandRef = element.getAttribute("data-brand-color");
              if (brandRef && isBrandColorRef(brandRef)) {
                return brandRef;
              }
              return element.style.color?.replace(/['"]+/g, "");
            },
            renderHTML: (attributes) => {
              if (!attributes.color) {
                return {};
              }

              if (isBrandColorRef(attributes.color)) {
                return {
                  style: `color: var(${brandColorRefToCSSVar(attributes.color)})`,
                  "data-brand-color": attributes.color,
                };
              }

              return {
                style: `color: ${attributes.color}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setColor:
        (color) =>
        ({ chain }) => {
          return chain().setMark("textStyle", { color }).run();
        },
      unsetColor:
        () =>
        ({ chain }) => {
          return chain().setMark("textStyle", { color: null }).removeEmptyTextStyle().run();
        },
    };
  },
});
