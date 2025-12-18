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
   * @returns true if the variable is allowed, false otherwise
   *
   * @example
   * ```tsx
   * // Only allow variables from a predefined list
   * validate: (name) => ['user.name', 'user.email', 'order.total'].includes(name)
   * ```
   */
  validate?: (variableName: string) => boolean;

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
