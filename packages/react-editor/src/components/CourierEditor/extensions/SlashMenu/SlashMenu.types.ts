import type { Editor } from "@tiptap/core";
import type { SuggestionProps } from "@tiptap/suggestion";

export interface Command {
  label: string;
  aliases?: string[];
  action: (editor: Editor) => void;
  shouldBeHidden?: (editor: Editor) => boolean;
  isEnabled?: boolean;
  icon: JSX.Element;
  description: string;
}

export interface MenuListProps extends SuggestionProps {
  selected: number;
  items: Command[];
  command: (item: Command) => void;
}

export interface SlashMenuOptions {
  suggestion: any;
} 