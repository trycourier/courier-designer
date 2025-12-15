import type { Editor, Range } from "@tiptap/core";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";

export interface VariableNodeOptions {
  HTMLAttributes?: Record<string, unknown>;
}

export interface VariableNodeAttributes {
  id: string;
  isInvalid: boolean;
}

/**
 * @deprecated This interface has been removed as the suggestion feature was removed.
 * Provided for backwards compatibility and will be removed in a future major version.
 */
export interface VariableOptions {
  HTMLAttributes?: Record<string, unknown>;
  suggestion?: Partial<SuggestionOptions>;
  variables?: Record<string, unknown>;
  disableSuggestions?: boolean;
}

/**
 * @deprecated This interface has been removed as the suggestion feature was removed.
 * Provided for backwards compatibility and will be removed in a future major version.
 */
export interface VariableCommandProps {
  editor: Editor;
  range: Range;
  props: string;
}

/**
 * @deprecated This interface has been removed as the suggestion feature was removed.
 * Provided for backwards compatibility and will be removed in a future major version.
 */
export interface VariableSuggestionProps {
  editor: Editor;
  range: Range;
  clientRect: () => DOMRect | null;
  items: string[];
  command: (props: { editor: Editor; range: Range; props: string }) => void;
  selected: number;
}

/**
 * @deprecated This interface has been removed as the suggestion feature was removed.
 * Provided for backwards compatibility and will be removed in a future major version.
 */
export interface VariableSuggestionsProps extends SuggestionProps {
  items: string[];
  command: (item: string) => void;
  editor: Editor;
  query: string;
  selected: number;
}
