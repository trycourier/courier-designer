import { Extension } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export const MSTeamsButtonLabelLockPluginKey = new PluginKey("msteamsButtonLabelLock");

/** Whether the caret or selection sits inside a button's label. */
const isInButtonLabel = (state: EditorState) => {
  const { $from, $to } = state.selection;
  return $from.parent.type.name === "button" || $to.parent.type.name === "button";
};

const LOCKED_KEYS = new Set(["Enter", "Backspace", "Delete"]);

/**
 * A Teams button's label is edited in its sidebar form only. Its text isn't editable in
 * place, but a click or the arrow keys can still leave the caret in it, and then typing,
 * Enter (which split the button), deleting or cutting would change it. Ignore those there.
 */
export const MSTeamsButtonLabelLock = Extension.create({
  name: "msteamsButtonLabelLock",
  // Ahead of the Button extension's own Enter shortcut, which inserts a paragraph.
  priority: 1000,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: MSTeamsButtonLabelLockPluginKey,
        props: {
          handleTextInput: (view) => isInButtonLabel(view.state),
          handleKeyDown: (view, event) => LOCKED_KEYS.has(event.key) && isInButtonLabel(view.state),
          handlePaste: (view) => isInButtonLabel(view.state),
          handleDOMEvents: {
            // Cut deletes the selection too (Mod-a selects the whole label).
            cut: (view, event) => {
              if (!isInButtonLabel(view.state)) return false;
              event.preventDefault();
              return true;
            },
          },
        },
      }),
    ];
  },
});
