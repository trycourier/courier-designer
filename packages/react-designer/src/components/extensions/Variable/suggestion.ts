import type { Editor, Range } from "@tiptap/core";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";

export const suggestion: Partial<SuggestionOptions> = {
  char: "{{",
  allowSpaces: false,
  allowedPrefixes: null,
  startOfLine: false,

  // We don't need items for the new flow - chip is inserted immediately
  items: () => [],

  // This command is called when the suggestion is triggered
  command: ({ editor, range }: { editor: Editor; range: Range; props: string }) => {
    // Insert an empty variable chip
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent([{ type: "variable", attrs: { id: "", isInvalid: false } }])
      .run();
  },

  render: () => {
    return {
      onStart: (props: SuggestionProps) => {
        // Immediately insert an empty variable chip and close the suggestion
        props.editor
          .chain()
          .focus()
          .deleteRange(props.range)
          .insertContent([{ type: "variable", attrs: { id: "", isInvalid: false } }])
          .run();
      },

      onUpdate() {
        // No-op - we insert the chip immediately in onStart
      },

      onKeyDown() {
        // No-op - the chip handles its own input
        return false;
      },

      onExit() {
        // No cleanup needed
      },
    };
  },
};
