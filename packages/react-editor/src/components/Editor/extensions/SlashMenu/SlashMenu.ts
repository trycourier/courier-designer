import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { suggestion } from "./commands";

export const SlashMenu = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      HTMLAttributes: {},
      suggestion: {
        char: "/",
        ...suggestion,
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
}); 