import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { suggestion } from "./commands";
import { Plugin, PluginKey } from "prosemirror-state";

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
    const plugins = [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];

    // Add a plugin to handle backspace on slash
    plugins.push(
      new Plugin({
        key: new PluginKey('slashMenuBackspace'),
        props: {
          handleKeyDown: (view, event) => {
            if (event.key === 'Backspace') {
              const { state } = view;
              const { selection } = state;
              const { $from } = selection;
              const textBefore = state.doc.textBetween($from.start(), $from.pos);

              if (textBefore === '/') {
                // If we're about to delete a slash, set empty state after deletion
                view.dispatch(
                  state.tr
                    .delete($from.start(), $from.pos)
                    .setNodeMarkup($from.before(), undefined, {
                      class: 'is-empty is-editor-empty cursor-text'
                    })
                );
                return true;
              }
            }
            return false;
          },
        },
      })
    );

    return plugins;
  },
}); 