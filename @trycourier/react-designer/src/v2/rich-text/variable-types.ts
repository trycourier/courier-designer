/**
 * Variable validation config for the v2 footer editor — a jotai-free copy of
 * the SDK's `VariableValidationConfig` so the isolated v2 subtree stays
 * self-contained (no import from @/types or the TemplateEditor store).
 */
export interface VariableValidationContext {
  isInsideLoop: boolean;
}

export interface VariableValidationConfig {
  /** Custom validator run after (or instead of) format validation. */
  validate?: (variableName: string, context?: VariableValidationContext) => boolean;
  /** 'mark' keeps an invalid chip with red styling (default); 'remove' deletes it. */
  onInvalid?: "mark" | "remove";
  /** Message surfaced when a chip is invalid (static or per-name). */
  invalidMessage?: string | ((variableName: string) => string);
  /** Skip built-in format validation; use only `validate`. */
  overrideFormatValidation?: boolean;
}

/** Options threaded into the Variable node from the editor props. */
export interface VariableNodeOptions {
  /** Nested object of known variables (e.g. { brand: { id: "" } }). */
  variables: Record<string, unknown>;
  variableValidation?: VariableValidationConfig;
  /** Resolved values keyed by flattened variable id (e.g.
   *  { "brand.colors.primary": "#f20e0e" }). When the editor is not focused, a
   *  known variable with a value renders that value instead of its `{id}`
   *  token; while editing (focused) the chip/token is shown. */
  variableValues?: Record<string, string>;
  /** Force the chip pill to render even when the editor is blurred/read-only,
   *  instead of resolving to plain text. Used by a "show variables" preview
   *  toggle so every variable stays a visible chip rather than its value. */
  forceChips?: boolean;
}
