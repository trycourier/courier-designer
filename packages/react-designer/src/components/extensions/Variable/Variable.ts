import { Extension, InputRule, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { Suggestion } from "@tiptap/suggestion";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { suggestion } from "./suggestion";
import type { VariableNodeOptions, VariableOptions } from "./Variable.types";
import { VariableView } from "./VariableView";
import { initializeVariableStorage } from "./variable-storage.utils";

export const VariableNode = Node.create<VariableNodeOptions>({
  name: "variable",
  group: "inline",
  inline: true,
  selectable: false,
  atom: true,

  addStorage() {
    return initializeVariableStorage();
  },

  addAttributes() {
    return {
      id: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-id") || "",
        renderHTML: (attributes) => {
          return {
            "data-id": attributes.id,
          };
        },
      },
      isInvalid: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-invalid") === "true",
        renderHTML: (attributes) => {
          return {
            "data-invalid": attributes.isInvalid ? "true" : undefined,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-variable]",
        getAttrs: (element) => {
          const id = (element as HTMLElement).getAttribute("data-id");
          return id ? { id } : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "span",
      {
        "data-variable": true,
        ...HTMLAttributes,
      },
      `{{${node.attrs.id}}}`,
    ];
  },

  renderText({ node }) {
    const result = `{{${node.attrs.id}}}`;
    return result;
  },

  addNodeView() {
    return ReactNodeViewRenderer(VariableView);
  },

  addProseMirrorPlugins() {
    return [
      // Decoration plugin to show a visual cursor when positioned before a variable after hardBreak
      new Plugin({
        key: new PluginKey("variableCursorIndicator"),
        props: {
          decorations: (state) => {
            const { selection } = state;
            const { $from, empty } = selection;

            // Only for collapsed selections
            if (!empty) return DecorationSet.empty;

            // Check if cursor is right after a hardBreak with a variable after
            const nodeBefore = $from.nodeBefore;
            const nodeAfter = $from.nodeAfter;

            if (nodeBefore?.type.name === "hardBreak" && nodeAfter?.type.name === "variable") {
              // Create a widget decoration that shows a blinking cursor
              const cursorWidget = Decoration.widget(
                $from.pos,
                () => {
                  const cursor = document.createElement("span");
                  cursor.className = "variable-cursor-indicator";
                  cursor.setAttribute("data-cursor-indicator", "true");
                  // Blinking cursor style
                  cursor.style.cssText = `
                    display: inline-block;
                    width: 1px;
                    height: 1.2em;
                    background-color: currentColor;
                    animation: cursor-blink 1s step-end infinite;
                    vertical-align: text-bottom;
                    margin-right: -1px;
                  `;
                  return cursor;
                },
                { side: 0 }
              );

              return DecorationSet.create(state.doc, [cursorWidget]);
            }

            return DecorationSet.empty;
          },
        },
      }),
      // Fix for cursor navigation around variables after hardBreaks
      new Plugin({
        key: new PluginKey("variableCursorFix"),
        props: {
          handleKeyDown: (view, event) => {
            // Only handle arrow keys
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
              return false;
            }

            const { state } = view;
            const { selection } = state;
            const { $from } = selection;

            // Only handle collapsed selections
            if (!selection.empty) return false;

            const nodeBefore = $from.nodeBefore;
            const nodeAfter = $from.nodeAfter;

            // Case 1: ArrowLeft when cursor is right after a hardBreak, with a variable after
            // This is the problematic case where ProseMirror wants to skip over the hardBreak
            if (event.key === "ArrowLeft") {
              if (nodeBefore?.type.name === "hardBreak" && nodeAfter?.type.name === "variable") {
                // We're at the position between hardBreak and variable (the "|{{var}}" position)
                // This IS a valid cursor position - we're visually "before the variable on line 2"
                // But ProseMirror would skip over the hardBreak to before it
                // We need to manually move the cursor to before the hardBreak instead of letting
                // ProseMirror skip both the hardBreak and potentially more
                const hardBreakStart = $from.pos - nodeBefore.nodeSize;
                const tr = state.tr.setSelection(TextSelection.create(state.doc, hardBreakStart));
                view.dispatch(tr);
                return true; // Prevent default - we handled it
              }

              // Case: We're right after a variable that comes right after a hardBreak
              // When pressing left, we should land between hardBreak and variable
              if (nodeBefore?.type.name === "variable") {
                // Check if there's a hardBreak before this variable
                const pos = $from.pos;
                const variableStart = pos - nodeBefore.nodeSize;
                if (variableStart > $from.start()) {
                  const $beforeVariable = state.doc.resolve(variableStart);
                  if ($beforeVariable.nodeBefore?.type.name === "hardBreak") {
                    // Move cursor to right before the variable (after the hardBreak)
                    const tr = state.tr.setSelection(
                      TextSelection.create(state.doc, variableStart)
                    );
                    view.dispatch(tr);
                    return true; // Prevent default
                  }
                }
              }
            }

            // Case 2: ArrowRight when cursor is right before a hardBreak, with a variable before
            if (event.key === "ArrowRight") {
              if (nodeBefore?.type.name === "variable" && nodeAfter?.type.name === "hardBreak") {
                // Check what's after the hardBreak
                const hardBreakEnd = $from.pos + nodeAfter.nodeSize;
                if (hardBreakEnd <= $from.end()) {
                  const $afterHardBreak = state.doc.resolve(hardBreakEnd);
                  if ($afterHardBreak.nodeAfter?.type.name === "variable") {
                    // Move cursor to right after the hardBreak (before the next variable)
                    const tr = state.tr.setSelection(TextSelection.create(state.doc, hardBreakEnd));
                    view.dispatch(tr);
                    return true; // Prevent default
                  }
                }
              }
            }

            return false; // Let ProseMirror handle it
          },
        },
      }),
    ];
  },
});

/**
 * Extension that inserts an empty variable chip when user types {{
 * This is used when autocomplete is disabled (disableVariablesAutocomplete=true)
 *
 * Storage:
 * - `disabled`: When true, typing {{ will not create variable chips.
 *   Set this from React via `editor.storage.variableInputRule.disabled = true`
 *   when the `variables` prop is not provided to TemplateEditor.
 */
export const VariableInputRule = Extension.create({
  name: "variableInputRule",

  addStorage() {
    return {
      disabled: false,
    };
  },

  addInputRules() {
    const storage = this.storage;
    return [
      new InputRule({
        // Match {{ at any position
        find: /\{\{$/,
        handler: ({ range, chain }) => {
          if (storage.disabled) return;
          chain()
            .deleteRange(range)
            .insertContent([{ type: "variable", attrs: { id: "", isInvalid: false } }])
            .run();
        },
      }),
    ];
  },
});

/**
 * Extension that provides variable autocomplete suggestions.
 * When user types {{, shows a dropdown with available variables.
 * Pass `variables` option to configure available variables.
 * Pass `disableSuggestions: true` to disable autocomplete (falls back to VariableInputRule behavior).
 */
export const Variable = Extension.create<VariableOptions>({
  name: "variableSuggestion",

  addOptions() {
    return {
      HTMLAttributes: {},
      suggestion: {
        char: "{{",
        ...suggestion,
      },
      variables: {},
      disableSuggestions: false,
    };
  },

  addProseMirrorPlugins() {
    if (this.options.disableSuggestions) {
      return [];
    }

    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

/**
 * @deprecated This extension has been removed. Variable conversion now happens via VariableInputRule or Variable.
 * This is a no-op extension provided for backwards compatibility and will be removed in a future major version.
 */
export const VariableTypeHandler = Extension.create({
  name: "variableTypeHandler",
});
