import type { Editor, Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import type {
  SuggestionKeyDownProps,
  SuggestionOptions,
  SuggestionProps,
} from "@tiptap/suggestion";
import type { Instance as TippyInstance } from "tippy.js";
import tippy from "tippy.js";
import type { VariableSuggestionsProps } from "./Variable.types";
import { VariableSuggestions } from "./VariableSuggestions";

export const suggestion: Partial<SuggestionOptions> = {
  items: ({ query, editor }: { query: string; editor: Editor }) => {
    const variables = editor.extensionManager.extensions.find(
      ext => ext.name === 'variableSuggestion'
    )?.options?.variables || {};

    // Function to flatten nested objects into dot notation
    const flattenObject = (obj: Record<string, any>, prefix = ''): string[] => {
      return Object.entries(obj).reduce((acc: string[], [key, value]) => {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          return [...acc, ...flattenObject(value, newKey)];
        }
        return [...acc, newKey];
      }, []);
    };

    const suggestions = flattenObject(variables);
    return suggestions.filter((item) =>
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

        popup = tippy(props.editor.options.element, {
          getReferenceClientRect: () => props.clientRect?.() || new DOMRect(),
          appendTo: () => props.editor.options.element,
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

        if (props.event.key === "Escape") {
          // Replicate the cleanup that happens in command()
          currentProps.editor
            .chain()
            .focus()
            .deleteRange(currentProps.range)
            .run();
          return true;
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
