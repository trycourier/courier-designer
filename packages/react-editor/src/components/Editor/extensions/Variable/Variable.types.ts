import { Editor, Range } from "@tiptap/core";
import { SuggestionProps, SuggestionOptions } from "@tiptap/suggestion";

export interface VariableOptions {
  HTMLAttributes: Record<string, any>;
  suggestion: Partial<SuggestionOptions<string>>;
}

export interface VariableCommandProps {
  editor: Editor;
  range: Range;
  props: string;
}

export type VariableSuggestionProps = SuggestionProps<string>;

export interface VariableNodeOptions {
  HTMLAttributes?: Record<string, any>;
}

export interface VariableNodeAttributes {
  id: string | null;
}
