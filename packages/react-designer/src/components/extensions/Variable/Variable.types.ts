import type { Editor, Range } from "@tiptap/core";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";

/**
 * Transaction meta key used to ask a selected variable's NodeView to enter edit
 * mode (e.g. when the user presses Enter on a selected chip). The value is the
 * document position of the variable node.
 */
export const VARIABLE_ENTER_EDIT_META = "variableEnterEditPos";

export interface VariableNodeOptions {
  HTMLAttributes?: Record<string, unknown>;
}

export interface VariableNodeAttributes {
  id: string;
  isInvalid: boolean;
}

/**
 * Options for the Variable suggestion extension that provides autocomplete.
 */
export interface VariableOptions {
  HTMLAttributes?: Record<string, unknown>;
  suggestion?: Partial<SuggestionOptions>;
  /** Variables available for autocomplete suggestions */
  variables?: Record<string, unknown>;
  /** When true, disables the autocomplete dropdown */
  disableSuggestions?: boolean;
}

export interface VariableCommandProps {
  editor: Editor;
  range: Range;
  props: string;
}

export interface VariableSuggestionProps {
  editor: Editor;
  range: Range;
  clientRect: () => DOMRect | null;
  items: string[];
  command: (props: { editor: Editor; range: Range; props: string }) => void;
  selected: number;
}

export interface VariableSuggestionsProps extends SuggestionProps {
  items: string[];
  command: (item: string) => void;
  editor: Editor;
  query: string;
  selected: number;
}
