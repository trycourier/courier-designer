import type { Editor, Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import type {
  SuggestionKeyDownProps,
  SuggestionOptions,
  SuggestionProps,
} from "@tiptap/suggestion";
import { PluginKey } from "prosemirror-state";
import type { Instance as TippyInstance } from "tippy.js";
import tippy from "tippy.js";
import { MenuList } from "./MenuList";
import type { Command, MenuListProps } from "./SlashMenu.types";
import {
  ButtonElementIcon,
  ImageElementIcon,
  DividerElementIcon,
  VariableElementIcon,
} from "../../components/ContentIcon";

const suggestionKey = new PluginKey("slashCommand");

const COMMANDS: Command[] = [
  {
    label: "Image",
    aliases: ["img"],
    action: (editor: Editor) => {
      editor.chain().focus().setImageBlock({}).run();
    },
    icon: <ImageElementIcon />,
    description: "Upload or embed",
  },
  {
    label: "Button",
    aliases: ["button"],
    action: (editor: Editor) => {
      editor.chain().focus().setButton({}).run();
    },
    icon: <ButtonElementIcon />,
    description: "Stylized action link",
  },
  {
    label: "Divider",
    aliases: ["hr"],
    action: (editor: Editor) => {
      editor.chain().focus().setDivider({}).run();
    },
    icon: <DividerElementIcon />,
    description: "Visually divide elements",
  },
  {
    label: "Variable",
    aliases: ["variable"],
    action: (editor: Editor) => {
      editor.chain().focus().insertContent("{{").run();
    },
    icon: <VariableElementIcon />,
    description: "Stored labeled data",
  },
];

export const suggestion: Partial<SuggestionOptions> = {
  items: ({ query }: { query: string; editor: Editor }) => {
    return COMMANDS.filter((item) => {
      const labelMatch = item.label.toLowerCase().includes(query.toLowerCase());
      const aliasMatch = item.aliases?.some((alias) =>
        alias.toLowerCase().includes(query.toLowerCase())
      );
      return labelMatch || aliasMatch;
    });
  },

  char: "/",
  pluginKey: suggestionKey,
  allowSpaces: false,
  allowedPrefixes: null,
  startOfLine: false,
  decorationTag: "span",
  decorationClass: "slash-command-suggestion",

  command: ({
    editor,
    range,
    props,
  }: {
    editor: Editor;
    range: Range;
    props: Command;
  }) => {
    editor.chain().focus().deleteRange(range).run();
    props.action(editor);
  },

  render: () => {
    let component: ReactRenderer | null = null;
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
        query: (component?.props as MenuListProps).query || "",
        editor: (component?.props as MenuListProps).editor,
      }) as Command[];

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
        component = new ReactRenderer(MenuList, {
          props: {
            ...props,
            selected: 0,
            items: suggestion.items?.({
              query: props.query || "",
              editor: props.editor,
            }) as Command[],
            command: (item: Command) => {
              suggestion.command?.({
                editor: props.editor,
                range: props.range,
                props: item,
              });
            },
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
          theme: "slash-command",
        });
      },

      onUpdate(props: SuggestionProps) {
        currentProps = props;

        component?.updateProps({
          ...props,
          items: suggestion.items?.({
            query: props.query || "",
            editor: props.editor,
          }) as Command[],
          command: (item: Command) => {
            suggestion.command?.({
              editor: props.editor,
              range: props.range,
              props: item,
            });
          },
          selected: (component.props as MenuListProps).selected,
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
          query: (component.props as MenuListProps).query || "",
          editor: (component.props as MenuListProps).editor,
        }) as Command[];

        const currentIndex = (component.props as MenuListProps).selected;

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