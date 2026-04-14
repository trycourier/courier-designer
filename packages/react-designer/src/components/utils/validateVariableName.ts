/**
 * Validates a variable name according to JSON property name rules.
 * Also allows `$` as a valid identifier character to support loop
 * references (e.g. `$.item.name`, `$.index`).
 *
 * Valid: user.firstName, company.address.street, _private, user123, $.item.name, $.index
 * Invalid: user. firstName (space), user. (trailing dot), user..name (double dot), 123invalid (starts with digit)
 *
 * @param variableName - The variable name to validate (without curly braces)
 * @returns true if the variable name is valid, false otherwise
 */
export function isValidVariableName(variableName: string): boolean {
  // Remove leading/trailing whitespace for validation
  const trimmed = variableName.trim();

  // Empty or whitespace-only is invalid
  if (!trimmed) {
    return false;
  }

  // Cannot start or end with a dot
  if (trimmed.startsWith(".") || trimmed.endsWith(".")) {
    return false;
  }

  // Cannot have consecutive dots
  if (trimmed.includes("..")) {
    return false;
  }

  // Cannot contain spaces
  if (trimmed.includes(" ")) {
    return false;
  }

  // Split by dots and validate each segment
  const segments = trimmed.split(".");

  // Each segment must be a valid identifier
  // Valid identifier: starts with letter, underscore, or $, followed by letters, digits, underscores, or $
  const identifierRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

  for (const segment of segments) {
    // Empty segments are invalid (handles double dots, but we already check for that above)
    if (!segment) {
      return false;
    }

    // Each segment must match identifier pattern
    if (!identifierRegex.test(segment)) {
      return false;
    }
  }

  return true;
}
