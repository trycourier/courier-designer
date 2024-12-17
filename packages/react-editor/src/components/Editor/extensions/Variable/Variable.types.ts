import { Editor, Range } from "@tiptap/core";
import { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";

interface Props {
  editor: Editor;
  range: Range;
  clientRect: () => DOMRect | null;
  items: string[];
  command: (props: { editor: Editor; range: Range; props: string }) => void;
}

export interface VariableOptions {
  HTMLAttributes: Record<string, any>;
  suggestion: Partial<SuggestionOptions>;
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
  HTMLAttributes?: Record<string, any>;
}

export interface VariableNodeAttributes {
  id: string | null;
}

export interface VariableSuggestionsProps extends SuggestionProps {
  items: string[];
  command: (props: string) => void;
  editor: Editor;
  query: string;
  selected: number;
}

export interface VariableNodeOptions {
  HTMLAttributes?: Record<string, any>;
  suggestion: Partial<SuggestionOptions>;
}

export interface VariableNodeAttributes {
  id: string | null;
}
