import { Editor, Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { VariableSuggestions } from "./VariableSuggestions";
import {
  SuggestionOptions,
  SuggestionProps,
  SuggestionKeyDownProps,
} from "@tiptap/suggestion";
import { VariableSuggestionsProps } from "./Variable.types";

export const suggestion: Partial<SuggestionOptions> = {
  items: ({ query }: { query: string; editor: Editor }) => {
    const variables = ["firstName", "lastName", "email"];
    return variables.filter((item) =>
      item.toLowerCase().includes(query.toLowerCase())
    );
  },

  char: "{{",
  allowSpaces: false,
  allowedPrefixes: null,
  startOfLine: false,
  decorationTag: "span",
  decorationClass: "variable-suggestion",

  command: ({
    editor,
    range,
    props,
  }: {
    editor: Editor;
    range: Range;
    props: string;
  }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent([
        { type: "variable", attrs: { id: props } },
        { type: "text", text: " " },
      ])
      .run();
  },

  render: () => {
    let component: ReactRenderer<VariableSuggestionsProps> | null = null;
    let popup: TippyInstance | null = null;

    let selectedIndex = 0;

    return {
      onStart: (props: SuggestionProps) => {
        component = new ReactRenderer(VariableSuggestions, {
          props: {
            ...props,
            selected: selectedIndex,
          },
          editor: props.editor,
        });

        if (!props.clientRect) return;

        popup = tippy(document.body, {
          getReferenceClientRect: () => props.clientRect?.() || new DOMRect(),
          appendTo: () => document.body,
          content: component?.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
        }) as TippyInstance;
      },

      onUpdate(props: SuggestionProps) {
        component?.updateProps({
          ...props,
          selected: selectedIndex,
        });

        if (!props.clientRect) return;

        if (popup) {
          popup.setProps({
            getReferenceClientRect: () => props.clientRect?.() || new DOMRect(),
          });
        }
      },

      onKeyDown(props: SuggestionKeyDownProps) {
        const { event } = props;

        // @TODO: refactor this
        const items = (suggestion.items?.({
          query: (component?.props as VariableSuggestionsProps).query || "",
          editor: (component?.props as VariableSuggestionsProps).editor,
        }) || []) as string[];

        if (event.key === "ArrowUp") {
          selectedIndex = (selectedIndex + items.length - 1) % items.length;
          component?.updateProps({ selected: selectedIndex });
          return true;
        }

        if (event.key === "ArrowDown") {
          selectedIndex = (selectedIndex + 1) % items.length;
          console.log(selectedIndex, component);
          component?.updateProps({ selected: selectedIndex });
          return true;
        }

        if (event.key === "Enter") {
          const item = items[selectedIndex];
          if (item) {
            return true;
          }
        }

        return false;
      },

      onExit() {
        if (popup) {
          popup.destroy();
        }
        component?.destroy();
      },
    };
  },
};
