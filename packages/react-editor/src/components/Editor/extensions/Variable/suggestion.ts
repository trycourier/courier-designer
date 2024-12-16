import { Editor } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { VariableSuggestions } from "./VariableSuggestions";
import { SuggestionOptions } from "@tiptap/suggestion";

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

  command: ({ editor, range, props }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent([
        {
          type: "variable",
          attrs: {
            id: props,
          },
        },
        { type: "text", text: " " },
      ])
      .run();
  },

  render: () => {
    let component: ReactRenderer | null = null;
    let popup: TippyInstance[] | null = null;
    let selectedIndex = 0;

    return {
      onStart: (props) => {
        component = new ReactRenderer(VariableSuggestions, {
          props: {
            ...props,
            selected: selectedIndex,
          },
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popup = tippy("body", {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
        });
      },

      onUpdate(props) {
        component?.updateProps({
          ...props,
          selected: selectedIndex,
        });

        if (!props.clientRect) {
          return;
        }

        popup?.[0].setProps({
          getReferenceClientRect: props.clientRect,
        });
      },

      onKeyDown({ event, items }) {
        if (event.key === "ArrowUp") {
          selectedIndex = (selectedIndex + items.length - 1) % items.length;
          component?.updateProps({ selected: selectedIndex });
          return true;
        }

        if (event.key === "ArrowDown") {
          selectedIndex = (selectedIndex + 1) % items.length;
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
        popup?.[0].destroy();
        component?.destroy();
      },
    };
  },
};
