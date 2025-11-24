import type { Editor, Range } from "@tiptap/core";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";

interface Props {
  editor: Editor;
  range: Range;
  clientRect: () => DOMRect | null;
  items: string[];
  command: (props: { editor: Editor; range: Range; props: string }) => void;
}

export interface VariableOptions {
  HTMLAttributes?: Record<string, unknown>;
  suggestion?: Partial<SuggestionOptions>;
  variables?: Record<string, unknown>;
  disableSuggestions?: boolean;
}

export interface VariableCommandProps {
  editor: Editor;
  range: Range;
  props: string;
}

export interface VariableSuggestionProps extends Props {
  selected: number;
}

export interface VariableNodeOptions {
  HTMLAttributes?: Record<string, unknown>;
}

export interface VariableNodeAttributes {
  id: string | null;
}

export interface VariableSuggestionsProps extends SuggestionProps {
  items: string[];
  command: (item: string) => void;
  editor: Editor;
  query: string;
  selected: number;
}
