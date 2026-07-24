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
}
