/**
 * Context about where a variable chip is positioned in the document tree.
 * Passed to the validate function so consumers can make context-aware decisions.
 */
export interface VariableValidationContext {
  /** Whether the variable is inside a list node that has a loop configured */
  isInsideLoop: boolean;
}

/**
 * Configuration for custom variable validation in the editor.
 * Allows consumers to restrict which variable names are allowed and
 * define the behavior when validation fails.
 */
export interface VariableValidationConfig {
  /**
   * Custom validator function that runs AFTER built-in format validation passes
   * (unless `overrideFormatValidation` is true).
   *
   * @param variableName - The variable name to validate (without curly braces)
   * @param context - Positional context about where the variable chip lives
   * @returns true if the variable is allowed, false otherwise
   *
   * @example
   * ```tsx
   * // Allow $.item.* only inside loops
   * validate: (name, ctx) => {
   *   if (name.startsWith('$.')) return ctx?.isInsideLoop ?? false;
   *   return allowedPrefixes.some(p => name.startsWith(p));
   * }
   * ```
   */
  validate?: (variableName: string, context?: VariableValidationContext) => boolean;

  /**
   * Behavior when validation fails.
   * - 'mark': Keep the chip with invalid styling (default, shows red styling)
   * - 'remove': Delete the chip entirely
   *
   * @default 'mark'
   */
  onInvalid?: "mark" | "remove";

  /**
   * Message to show as a toast notification when validation fails.
   * Can be a static string or a function that receives the variable name
   * for dynamic messages.
   *
   * @example
   * ```tsx
   * // Static message
   * invalidMessage: "This variable is not available"
   *
   * // Dynamic message
   * invalidMessage: (name) => `Variable "${name}" is not in the allowed list`
   * ```
   */
  invalidMessage?: string | ((variableName: string) => string);

  /**
   * If true, bypasses the built-in format validation entirely.
   * Only the custom `validate` function will be used for validation.
   *
   * Use with caution - invalid formats may cause issues with downstream processing.
   *
   * @default false
   */
  overrideFormatValidation?: boolean;
}
