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
    let currentProps: SuggestionProps | null = null;

    const updateComponent = (props: SuggestionProps, index: number) => {
      component?.updateProps({
        ...props,
        selected: index,
      });
    };

    const selectItem = (index: number) => {
      if (!currentProps) return false;

      const items = suggestion.items?.({
        query: (component?.props as VariableSuggestionsProps).query || "",
        editor: (component?.props as VariableSuggestionsProps).editor,
      }) as string[];

      const item = items[index];
      if (item) {
        suggestion.command?.({
          editor: currentProps.editor,
          range: currentProps.range,
          props: item,
        });
        return true;
      }
      return false;
    };

    return {
      onStart: (props: SuggestionProps) => {
        currentProps = props;
        component = new ReactRenderer(VariableSuggestions, {
          props: {
            ...props,
            selected: 0,
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
          theme: "variable",
        });

        // Focus the popup element
        if (component?.element) {
          (component.element as HTMLElement).focus();
        }
      },

      onUpdate(props: SuggestionProps) {
        currentProps = props;

        component?.updateProps({
          ...props,
          selected: (component.props as VariableSuggestionsProps).selected,
        });

        if (!props.clientRect) return;

        popup?.setProps({
          getReferenceClientRect: () => props.clientRect?.() || new DOMRect(),
        });
      },

      onKeyDown(props: SuggestionKeyDownProps) {
        if (!component || !currentProps) {
          return false;
        }

        const items = suggestion.items?.({
          query: (component.props as VariableSuggestionsProps).query || "",
          editor: (component.props as VariableSuggestionsProps).editor,
        }) as string[];

        const currentIndex = (component.props as VariableSuggestionsProps)
          .selected;

        if (props.event.key === "ArrowUp") {
          const newIndex = (currentIndex - 1 + items.length) % items.length;
          updateComponent(currentProps, newIndex);
          return true;
        }

        if (props.event.key === "ArrowDown") {
          const newIndex = (currentIndex + 1) % items.length;
          updateComponent(currentProps, newIndex);
          return true;
        }

        if (props.event.key === "Enter") {
          props.event.preventDefault();
          return selectItem(currentIndex);
        }

        return false;
      },

      onExit() {
        popup?.destroy();
        component?.destroy();
        currentProps = null;
      },
    };
  },
};
