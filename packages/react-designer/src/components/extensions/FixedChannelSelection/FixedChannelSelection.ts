import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/core";

export interface FixedChannelSelectionOptions {
  channels: Array<"push" | "sms" | "inbox">;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fixedChannelSelection: {
      constrainSelectionToElement: () => ReturnType;
    };
  }
}

/**
 * Check if we're currently in a fixed channel context
 */
const isInFixedChannel = (editor: Editor, channels: Array<"push" | "sms" | "inbox">): boolean => {
  if (channels.length === 0) return false;

  // Check for specific channel editor classes
  const channelChecks = {
    push: () => editor.view.dom.closest(".courier-push-editor"),
    sms: () => editor.view.dom.closest(".courier-sms-editor"),
    inbox: () => editor.view.dom.closest(".courier-inbox-editor"),
  };

  // Check if any of the configured channels are detected
  return channels.some((channel) => channelChecks[channel]?.());
};

/**
 * Get the boundaries of the current text element (paragraph, heading)
 */
const getCurrentElementBounds = (editor: Editor) => {
  const { selection } = editor.state;
  const { $anchor } = selection;

  // Find the current text element
  let depth = $anchor.depth;
  while (depth > 0) {
    const node = $anchor.node(depth);
    if (node.type.name === "paragraph" || node.type.name === "heading") {
      const start = $anchor.start(depth);
      const end = $anchor.end(depth);
      return { start, end, node };
    }
    depth--;
  }

  return null;
};

/**
 * Check if a selection spans multiple elements
 */
const isMultiElementSelection = (editor: Editor): boolean => {
  const { selection } = editor.state;
  const { $from, $to } = selection;

  // If selection is empty, it's not multi-element
  if (selection.empty) return false;

  // Find the elements containing the start and end of selection
  let fromDepth = $from.depth;
  let toDepth = $to.depth;
  let fromElement = null;
  let toElement = null;

  // Find the text element containing the start
  while (fromDepth > 0) {
    const node = $from.node(fromDepth);
    if (node.type.name === "paragraph" || node.type.name === "heading") {
      fromElement = { node, depth: fromDepth };
      break;
    }
    fromDepth--;
  }

  // Find the text element containing the end
  while (toDepth > 0) {
    const node = $to.node(toDepth);
    if (node.type.name === "paragraph" || node.type.name === "heading") {
      toElement = { node, depth: toDepth };
      break;
    }
    toDepth--;
  }

  // If we're in different elements, it's a multi-element selection
  return Boolean(fromElement && toElement && fromElement.node !== toElement.node);
};

export const FixedChannelSelectionPlugin = new PluginKey("fixedChannelSelection");

export const FixedChannelSelection = Extension.create<FixedChannelSelectionOptions>({
  name: "fixedChannelSelection",

  addOptions() {
    return {
      channels: ["push", "sms", "inbox"],
    };
  },

  addCommands() {
    return {
      constrainSelectionToElement:
        () =>
        ({ editor, tr, dispatch }) => {
          if (!isInFixedChannel(editor, this.options.channels)) {
            return false;
          }

          const bounds = getCurrentElementBounds(editor);
          if (!bounds) return false;

          const { start, end } = bounds;
          const { selection } = editor.state;

          // If selection is already within bounds, no need to constrain
          if (selection.from >= start && selection.to <= end) {
            return false;
          }

          // Constrain selection to element bounds
          const newFrom = Math.max(selection.from, start);
          const newTo = Math.min(selection.to, end);

          if (dispatch) {
            tr.setSelection(TextSelection.create(tr.doc, newFrom, newTo));
          }

          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Override Cmd+A to select only current element in fixed channels
      "Mod-a": ({ editor }) => {
        if (!isInFixedChannel(editor, this.options.channels)) {
          return false; // Let default behavior handle it
        }

        const bounds = getCurrentElementBounds(editor);
        if (!bounds) return false;

        const { start, end } = bounds;
        editor.commands.setTextSelection({ from: start, to: end });
        return true;
      },

      // Prevent multi-element deletion with Backspace
      Backspace: ({ editor }) => {
        if (!isInFixedChannel(editor, this.options.channels)) {
          return false;
        }

        if (isMultiElementSelection(editor)) {
          // Constrain selection to current element before allowing deletion
          const bounds = getCurrentElementBounds(editor);
          if (bounds) {
            const { start, end } = bounds;
            const { selection } = editor.state;
            const newFrom = Math.max(selection.from, start);
            const newTo = Math.min(selection.to, end);
            editor.commands.setTextSelection({ from: newFrom, to: newTo });
          }
          return true; // Prevent the original backspace
        }

        return false; // Allow normal backspace within element
      },

      // Prevent multi-element deletion with Delete
      Delete: ({ editor }) => {
        if (!isInFixedChannel(editor, this.options.channels)) {
          return false;
        }

        if (isMultiElementSelection(editor)) {
          // Constrain selection to current element before allowing deletion
          const bounds = getCurrentElementBounds(editor);
          if (bounds) {
            const { start, end } = bounds;
            const { selection } = editor.state;
            const newFrom = Math.max(selection.from, start);
            const newTo = Math.min(selection.to, end);
            editor.commands.setTextSelection({ from: newFrom, to: newTo });
          }
          return true; // Prevent the original delete
        }

        return false; // Allow normal delete within element
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: FixedChannelSelectionPlugin,
        props: {
          // Intercept selection changes to constrain them to single elements
          handleTextInput: (view, from, to) => {
            const editor = this.editor;
            if (!isInFixedChannel(editor, this.options.channels)) {
              return false;
            }

            // If typing would replace a multi-element selection, constrain it first
            if (isMultiElementSelection(editor)) {
              const bounds = getCurrentElementBounds(editor);
              if (bounds) {
                const { start, end } = bounds;
                const newFrom = Math.max(from, start);
                const newTo = Math.min(to, end);

                // Create a new transaction to replace the constrained selection
                const tr = view.state.tr;
                tr.setSelection(TextSelection.create(tr.doc, newFrom, newTo));
                view.dispatch(tr);
              }
              return true; // Prevent the original text input
            }

            return false; // Allow normal text input
          },

          // Handle drag selection to prevent multi-element selection
          handleDOMEvents: {
            mousedown: (view, _event) => {
              const editor = this.editor;
              if (!isInFixedChannel(editor, this.options.channels)) {
                return false;
              }

              // Store the starting element for drag selection constraint
              const pos = view.posAtCoords({
                left: _event.clientX,
                top: _event.clientY,
              });

              if (pos !== null) {
                const $pos = view.state.doc.resolve(pos.pos);
                let depth = $pos.depth;

                while (depth > 0) {
                  const node = $pos.node(depth);
                  if (node.type.name === "paragraph" || node.type.name === "heading") {
                    // Store element bounds in plugin storage for use during selection
                    view.dispatch(
                      view.state.tr.setMeta(FixedChannelSelectionPlugin, {
                        elementStart: $pos.start(depth),
                        elementEnd: $pos.end(depth),
                      })
                    );
                    break;
                  }
                  depth--;
                }
              }

              return false;
            },

            mousemove: (view, _event) => {
              const editor = this.editor;
              if (!isInFixedChannel(editor, this.options.channels)) {
                return false;
              }

              // During drag selection, constrain to the starting element
              const meta = view.state.selection.from !== view.state.selection.to;
              if (meta && isMultiElementSelection(editor)) {
                const pluginState = FixedChannelSelectionPlugin.getState(view.state);
                if (pluginState?.elementStart && pluginState?.elementEnd) {
                  const { selection } = view.state;
                  const newFrom = Math.max(selection.from, pluginState.elementStart);
                  const newTo = Math.min(selection.to, pluginState.elementEnd);

                  const tr = view.state.tr;
                  tr.setSelection(TextSelection.create(tr.doc, newFrom, newTo));
                  view.dispatch(tr);
                  return true;
                }
              }

              return false;
            },
          },
        },

        // Store element bounds during selection operations
        state: {
          init() {
            return null;
          },
          apply(tr, oldState) {
            const meta = tr.getMeta(FixedChannelSelectionPlugin);
            return meta || oldState;
          },
        },
      }),
    ];
  },
});
